import { isValidClassicAddress, xrpToDrops } from "xrpl";

import { createInvoiceId } from "@/features/xaman/payment-request";

import type { D1DatabaseLike } from "../persistence/d1-types";
import {
  billAssetWriteValues,
  INSERT_ASSET_AWARE_BILL,
  INSERT_ASSET_AWARE_SLOT,
  slotAssetWriteValues,
} from "./bill-write-contract";
import { createCapabilityToken, hashCapabilityToken } from "./capabilities";
import {
  billReviewSchema,
  createdBillSchema,
  createBillInputSchema,
  type BillReview,
  type CreateBillInput,
  type CreatedBill,
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

function toDrops(value: string, allowZero: boolean) {
  let drops: string;
  try {
    drops = xrpToDrops(value);
  } catch {
    throw new BillInputError(
      "Use XRP amounts with no more than six decimal places.",
    );
  }

  const amount = BigInt(drops);
  if (amount < 0n || (!allowZero && amount === 0n)) {
    throw new BillInputError(
      allowZero
        ? "The XRP amount cannot be negative."
        : "Each participant amount must be greater than zero.",
    );
  }
  return drops;
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

export function prepareBillReview(rawInput: CreateBillInput): BillReview {
  const input = createBillInputSchema.parse(rawInput);
  const destinationAddress = input.destinationAddress.trim();
  if (!isValidClassicAddress(destinationAddress)) {
    throw new BillInputError("Enter a valid classic XRPL destination address.");
  }

  const destinationTag = parseDestinationTag(input.destinationTag);
  const totalDrops = toDrops(input.totalXrp, false);
  const creatorShareDrops = toDrops(input.creatorShareXrp, true);
  const participants = input.participants.map((participant) => {
    const expectedPayerAddress = participant.expectedPayerAddress.trim();
    if (!isValidClassicAddress(expectedPayerAddress)) {
      throw new BillInputError(
        "Every expected payer must be a valid classic XRPL address.",
      );
    }
    return {
      participantLabel: participant.label?.trim() || null,
      expectedPayerAddress,
      expectedAmountDrops: toDrops(participant.amountXrp, false),
    };
  });

  const allocatedDrops = participants.reduce(
    (sum, participant) => sum + BigInt(participant.expectedAmountDrops),
    BigInt(creatorShareDrops),
  );
  if (allocatedDrops !== BigInt(totalDrops)) {
    throw new BillInputError(
      "Creator share and participant amounts must equal the bill total.",
    );
  }

  return billReviewSchema.parse({
    network: "testnet",
    title: input.title.trim(),
    destinationAddress,
    destinationTag,
    totalDrops,
    creatorShareDrops,
    allocatedDrops: allocatedDrops.toString(),
    participants,
  });
}

export async function createPublishedBill(
  database: D1DatabaseLike,
  rawInput: CreateBillInput,
  now = new Date(),
  random: BillRandomSource = defaultRandomSource,
): Promise<CreatedBill> {
  const review = prepareBillReview(rawInput);

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
    review.participants.map(async (participant) => {
      const paymentToken = random.token();
      return {
        id: random.uuid(),
        publicId: random.uuid(),
        paymentToken,
        publicTokenHash: await hashCapabilityToken(paymentToken),
        invoiceId: random.invoiceId().toUpperCase(),
        ...participant,
      };
    }),
  );

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
        review.totalDrops,
        review.creatorShareDrops,
        ...billAssetWriteValues(
          review.totalDrops,
          review.creatorShareDrops,
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
          slot.expectedAmountDrops,
          slot.invoiceId,
          ...slotAssetWriteValues(slot.expectedAmountDrops),
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
      expectedAmountDrops: slot.expectedAmountDrops,
      invoiceId: slot.invoiceId,
      status: "unpaid",
      paymentToken: slot.paymentToken,
    })),
  });
}
