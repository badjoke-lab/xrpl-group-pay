import { isValidClassicAddress, xrpToDrops } from "xrpl";

import { createInvoiceId } from "@/features/xaman/payment-request";

import type { D1DatabaseLike } from "../persistence/d1-types";
import { createCapabilityToken, hashCapabilityToken } from "./capabilities";
import {
  createdBillSchema,
  createBillInputSchema,
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

const INSERT_BILL = `
  INSERT INTO bills (
    id,
    public_id,
    public_token_hash,
    admin_token_hash,
    title,
    network,
    destination_address,
    destination_tag,
    total_drops,
    creator_share_drops,
    status,
    revision,
    frozen_at,
    expires_at,
    created_at,
    updated_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, 'testnet', ?6, ?7, ?8, ?9, 'open', 1, ?10, NULL, ?10, ?10)
`;

const INSERT_SLOT = `
  INSERT INTO payment_slots (
    id,
    public_id,
    bill_id,
    public_token_hash,
    participant_label,
    expected_payer_address,
    expected_amount_drops,
    invoice_id,
    status,
    paid_receipt_id,
    paid_tx_hash,
    paid_ledger_index,
    paid_at,
    created_at,
    updated_at
  ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'unpaid', NULL, NULL, NULL, NULL, ?9, ?9)
`;

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

export async function createPublishedBill(
  database: D1DatabaseLike,
  rawInput: CreateBillInput,
  now = new Date(),
  random: BillRandomSource = defaultRandomSource,
): Promise<CreatedBill> {
  const input = createBillInputSchema.parse(rawInput);
  const destinationAddress = input.destinationAddress.trim();
  if (!isValidClassicAddress(destinationAddress)) {
    throw new BillInputError("Enter a valid classic XRPL destination address.");
  }

  const destinationTag = parseDestinationTag(input.destinationTag);
  const totalDrops = toDrops(input.totalXrp, false);
  const creatorShareDrops = toDrops(input.creatorShareXrp, true);
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
      expectedAmountDrops: toDrops(participant.amountXrp, false),
    };
  });

  const allocatedDrops = normalizedParticipants.reduce(
    (sum, participant) => sum + BigInt(participant.expectedAmountDrops),
    BigInt(creatorShareDrops),
  );
  if (allocatedDrops !== BigInt(totalDrops)) {
    throw new BillInputError(
      "Creator share and participant amounts must equal the bill total.",
    );
  }

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
    normalizedParticipants.map(async (participant) => {
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
      .prepare(INSERT_BILL)
      .bind(
        billId,
        billPublicId,
        publicTokenHash,
        adminTokenHash,
        input.title.trim(),
        destinationAddress,
        destinationTag,
        totalDrops,
        creatorShareDrops,
        timestamp,
      ),
    ...slots.map((slot) =>
      database
        .prepare(INSERT_SLOT)
        .bind(
          slot.id,
          slot.publicId,
          billId,
          slot.publicTokenHash,
          slot.participantLabel,
          slot.expectedPayerAddress,
          slot.expectedAmountDrops,
          slot.invoiceId,
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
      title: input.title.trim(),
      network: "testnet",
      destinationAddress,
      destinationTag,
      totalDrops,
      creatorShareDrops,
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
