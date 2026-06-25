import { isValidClassicAddress } from "xrpl";

import { assetRegistry, AssetRegistryError } from "@/features/assets/registry";
import type { AssetDescriptor } from "@/features/assets/types";
import {
  decimalToUnits,
  MoneyAmountError,
  type MoneyAmount,
} from "@/features/money/money";
import { createInvoiceId } from "@/features/xaman/payment-request";

import type { D1DatabaseLike } from "../persistence/d1-types";
import {
  BILL_ALLOCATION_CONTRACT_VERSION,
  INSERT_BILL_ALLOCATION,
  INSERT_BILL_ALLOCATION_PARTICIPANT,
  prepareAllocationPersistence,
} from "./allocation-persistence";
import {
  billAssetWriteValues,
  INSERT_ASSET_AWARE_BILL,
  INSERT_ASSET_AWARE_SLOT,
  legacyCompatibilityUnits,
  slotAssetWriteValues,
} from "./bill-write-contract";
import { createCapabilityToken, hashCapabilityToken } from "./capabilities";
import {
  BillAllocationPreparationError,
  prepareBillAllocation,
  type PreparedBillAllocation,
} from "./prepare-bill-allocation";
import {
  billReviewSchema,
  createdBillSchema,
  createBillInputSchema,
  type BillReview,
  type CreateBillInput,
  type CreatedBill,
  type NormalizedCreateBillInput,
} from "./types";

export class BillInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillInputError";
  }
}

export class BillDatabaseError extends Error {
  constructor() {
    super("The bill could not be stored.");
    this.name = "BillDatabaseError";
  }
}

export type BillRandomSource = {
  uuid(): string;
  token(): string;
  invoiceId(): string;
};

const defaultRandomSource: BillRandomSource = {
  uuid: () => crypto.randomUUID(),
  token: () => createCapabilityToken(),
  invoiceId: () => createInvoiceId(),
};

type PreparedBill = {
  input: NormalizedCreateBillInput;
  review: BillReview;
  allocation: PreparedBillAllocation;
};

function requireTestnetSettlementAsset(assetId: string): AssetDescriptor {
  try {
    const asset = assetRegistry.require(assetId);
    if (asset.paymentRail !== "xrpl" || asset.network !== "testnet") {
      throw new BillInputError(
        "Select an approved XRPL Testnet Settlement Asset.",
      );
    }
    if (asset.id !== "xrpl:testnet:xrp" && asset.id !== "xrpl:testnet:rlusd") {
      throw new BillInputError(
        "Select XRP or official RLUSD for this Testnet Bill.",
      );
    }
    return asset;
  } catch (error) {
    if (error instanceof BillInputError) throw error;
    if (error instanceof AssetRegistryError) {
      throw new BillInputError("The selected Settlement Asset is not supported.");
    }
    throw error;
  }
}

function parseAmount(
  asset: AssetDescriptor,
  value: string,
  allowZero: boolean,
  field: string,
): MoneyAmount {
  let units: string;
  try {
    units = decimalToUnits(value, asset.precision);
  } catch (error) {
    if (error instanceof MoneyAmountError) {
      throw new BillInputError(
        `${field} must be a plain ${asset.symbol} amount with no more than ${asset.precision} decimal places.`,
      );
    }
    throw error;
  }

  const integer = BigInt(units);
  if (integer < 0n || (!allowZero && integer === 0n)) {
    throw new BillInputError(
      allowZero
        ? `${field} cannot be negative.`
        : `${field} must be greater than zero.`,
    );
  }

  return {
    code: asset.symbol,
    units,
    scale: asset.precision,
  };
}

function compatibilityDrops(asset: AssetDescriptor, units: string) {
  return asset.assetType === "native" ? units : null;
}

function parseDestinationTag(value: string | number | undefined) {
  if (value === undefined) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < 0 ||
    parsed > 4_294_967_295
  ) {
    throw new BillInputError("Destination Tag must be a UInt32 value.");
  }
  return parsed;
}

function prepareBill(rawInput: CreateBillInput): PreparedBill {
  const input = createBillInputSchema.parse(rawInput);
  const asset = requireTestnetSettlementAsset(input.settlementAssetId);
  const destinationAddress = input.destinationAddress.trim();
  if (!isValidClassicAddress(destinationAddress)) {
    throw new BillInputError("Enter a valid classic XRPL destination address.");
  }

  const destinationTag = parseDestinationTag(input.destinationTag);
  const totalAmount = parseAmount(asset, input.totalAmount, false, "Bill total");
  const requestedCreatorShareAmount = parseAmount(
    asset,
    input.creatorShareAmount,
    true,
    "Creator share",
  );

  const normalizedParticipants = input.participants.map((participant) => {
    const expectedPayerAddress = participant.expectedPayerAddress.trim();
    if (!isValidClassicAddress(expectedPayerAddress)) {
      throw new BillInputError(
        "Every expected payer must be a valid classic XRPL address.",
      );
    }
    return {
      participantLabel: participant.label?.trim() || null,
      expectedPayerAddress,
    };
  });

  let allocation: PreparedBillAllocation;
  try {
    allocation = prepareBillAllocation({
      normalizedInput: input,
      asset,
      totalUnits: totalAmount.units,
      creatorShareUnits: requestedCreatorShareAmount.units,
    });
  } catch (error) {
    if (error instanceof BillAllocationPreparationError) {
      throw new BillInputError(error.message);
    }
    throw error;
  }

  const obligationByParticipant = new Map(
    allocation.result.participantObligations.map((obligation) => [
      obligation.participantId,
      obligation.units,
    ]),
  );

  const participants = normalizedParticipants.map((participant, index) => {
    const participantId = allocation.participantIds[index];
    const units = obligationByParticipant.get(participantId);
    if (!units) {
      throw new BillInputError(
        "The allocation did not produce an obligation for every participant.",
      );
    }
    const expectedAmount: MoneyAmount = {
      code: asset.symbol,
      units,
      scale: asset.precision,
    };
    return {
      participantLabel: participant.participantLabel,
      expectedPayerAddress: participant.expectedPayerAddress,
      expectedAmount,
      expectedAmountDrops: compatibilityDrops(asset, units),
    };
  });

  const creatorShareAmount: MoneyAmount = {
    code: asset.symbol,
    units: allocation.result.creatorShareUnits,
    scale: asset.precision,
  };
  const allocatedAmount: MoneyAmount = {
    code: asset.symbol,
    units: allocation.result.totalUnits,
    scale: asset.precision,
  };

  const review = billReviewSchema.parse({
    network: "testnet",
    title: input.title.trim(),
    destinationAddress,
    destinationTag,
    asset,
    totalAmount,
    creatorShareAmount,
    allocatedAmount,
    totalDrops: compatibilityDrops(asset, totalAmount.units),
    creatorShareDrops: compatibilityDrops(asset, creatorShareAmount.units),
    allocatedDrops: compatibilityDrops(asset, allocatedAmount.units),
    participants,
  });

  return { input, review, allocation };
}

export function prepareBillReview(rawInput: CreateBillInput): BillReview {
  return prepareBill(rawInput).review;
}

export async function createPublishedBill(
  database: D1DatabaseLike,
  rawInput: CreateBillInput,
  now = new Date(),
  random: BillRandomSource = defaultRandomSource,
): Promise<CreatedBill> {
  const prepared = prepareBill(rawInput);
  const { review, allocation } = prepared;

  const billId = random.uuid();
  const billPublicId = random.uuid();
  const publicToken = random.token();
  const adminToken = random.token();
  const [publicTokenHash, adminTokenHash] = await Promise.all([
    hashCapabilityToken(publicToken),
    hashCapabilityToken(adminToken),
  ]);
  const timestamp = now.toISOString();

  const slots = await Promise.all(
    review.participants.map(async (participant, index) => {
      const paymentToken = random.token();
      return {
        id: random.uuid(),
        publicId: random.uuid(),
        participantId: allocation.participantIds[index],
        paymentToken,
        publicTokenHash: await hashCapabilityToken(paymentToken),
        invoiceId: random.invoiceId().toUpperCase(),
        ...participant,
      };
    }),
  );

  const allocationRecord = prepareAllocationPersistence({
    allocationInput: allocation.contractInput,
    result: allocation.result,
    participantIds: allocation.participantIds,
  });

  const statements = [
    database
      .prepare(INSERT_ASSET_AWARE_BILL)
      .bind(
        billId,
        billPublicId,
        publicTokenHash,
        adminTokenHash,
        review.title,
        review.destinationAddress,
        review.destinationTag,
        legacyCompatibilityUnits(review.totalAmount.units),
        legacyCompatibilityUnits(review.creatorShareAmount.units),
        ...billAssetWriteValues(
          review.asset,
          review.totalAmount.units,
          review.creatorShareAmount.units,
        ),
        timestamp,
      ),
    ...slots.map((slot) =>
      database
        .prepare(INSERT_ASSET_AWARE_SLOT)
        .bind(
          slot.id,
          slot.publicId,
          billId,
          slot.publicTokenHash,
          slot.participantLabel,
          slot.expectedPayerAddress,
          legacyCompatibilityUnits(slot.expectedAmount.units),
          slot.invoiceId,
          ...slotAssetWriteValues(review.asset, slot.expectedAmount.units),
          timestamp,
        ),
    ),
    database
      .prepare(INSERT_BILL_ALLOCATION)
      .bind(
        billId,
        BILL_ALLOCATION_CONTRACT_VERSION,
        allocationRecord.strategy,
        allocationRecord.weightScale,
        allocationRecord.weightTotalUnits,
        allocationRecord.remainderUnits,
        allocationRecord.remainderKind,
        allocationRecord.remainderParticipantId,
        timestamp,
      ),
    ...allocationRecord.participants.map((participant, index) =>
      database
        .prepare(INSERT_BILL_ALLOCATION_PARTICIPANT)
        .bind(
          billId,
          slots[index].id,
          participant.participantId,
          participant.inputUnits,
          participant.baseAmountUnits,
          participant.remainderIncrementUnits,
          participant.finalAmountUnits,
          timestamp,
        ),
    ),
  ];

  try {
    const results = await database.batch(statements);
    if (
      results.length !== statements.length ||
      results.some((result) => !result.success)
    ) {
      throw new BillDatabaseError();
    }
  } catch (error) {
    if (error instanceof BillInputError) throw error;
    throw new BillDatabaseError();
  }

  return createdBillSchema.parse({
    bill: {
      publicId: billPublicId,
      title: review.title,
      network: review.network,
      destinationAddress: review.destinationAddress,
      destinationTag: review.destinationTag,
      asset: review.asset,
      totalAmount: review.totalAmount,
      creatorShareAmount: review.creatorShareAmount,
      totalDrops: review.totalDrops,
      creatorShareDrops: review.creatorShareDrops,
      status: "open",
      revision: 1,
      frozenAt: timestamp,
      createdAt: timestamp,
    },
    capabilities: { publicToken, adminToken },
    slots: slots.map((slot) => ({
      publicId: slot.publicId,
      participantLabel: slot.participantLabel,
      expectedPayerAddress: slot.expectedPayerAddress,
      asset: review.asset,
      expectedAmount: slot.expectedAmount,
      expectedAmountDrops: slot.expectedAmountDrops,
      invoiceId: slot.invoiceId,
      status: "unpaid",
      paymentToken: slot.paymentToken,
    })),
  });
}
