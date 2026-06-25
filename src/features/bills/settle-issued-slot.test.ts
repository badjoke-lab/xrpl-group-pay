import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import { PAYMENT_SLOT_CONTRACT_VERSION } from "@/features/persistence/asset-records";
import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";
import type { VerifiedPayment } from "@/features/payment-verification/verified-payment";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  settleVerifiedIssuedPaymentSlot,
} from "./settle-issued-slot";
import {
  PaymentSlotSettlementConflictError,
  PaymentSlotSettlementDatabaseError,
} from "./settle-slot";

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly query: string,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.query, values);
  }

  async first<Row = Record<string, unknown>>() {
    return null as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true };
  }
}

class SettlementDatabase implements D1DatabaseLike {
  statements: Statement[] = [];

  constructor(
    readonly receiptChanges = 1,
    readonly fail = false,
    readonly readTransactionId = TXID,
  ) {}

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    if (this.fail) throw new Error("database failed");

    const digest = this.statements[0].values[20] as string;
    return [
      { success: true, meta: { changes: this.receiptChanges } },
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 1 } },
      {
        success: true,
        results: [
          {
            receipt_id: `testnet:${this.readTransactionId}`,
            network: "testnet",
            transaction_id: this.readTransactionId,
            invoice_id: INVOICE_ID,
            asset_id: ASSET.id,
            recorded_at: "2026-06-25T02:00:01.000Z",
            verified_payment_digest: digest,
            legacy_proof_digest: null,
            slot_public_id: SLOT_PUBLIC_ID,
            slot_status: "paid",
            paid_tx_hash: this.readTransactionId,
            paid_at: "2026-06-25T02:00:01.000Z",
            bill_public_id: BILL_PUBLIC_ID,
            bill_status: "partially_paid",
          },
        ] as Row[],
      },
    ];
  }
}

const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);
const SLOT_PUBLIC_ID = "00000000-0000-4000-8000-000000000001";
const BILL_PUBLIC_ID = "00000000-0000-4000-8000-000000000002";
const ASSET = getRlusdAssetDescriptor("testnet");

function slot(
  overrides: Partial<ResolvedPaymentSlot> = {},
): ResolvedPaymentSlot {
  return {
    slotId: "slot-rlusd-1",
    slotPublicId: SLOT_PUBLIC_ID,
    billId: "bill-rlusd-1",
    billPublicId: BILL_PUBLIC_ID,
    billTitle: "Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: 9,
    participantLabel: "Alex",
    expectedPayerAddress: "rSender",
    expectedAmountDrops: "1250000",
    paymentContractVersion: PAYMENT_SLOT_CONTRACT_VERSION,
    asset: ASSET,
    expectedAmount: {
      code: ASSET.symbol,
      units: "1250000",
      scale: ASSET.precision,
    },
    invoiceId: INVOICE_ID,
    slotStatus: "validating",
    billStatus: "open",
    paidTransactionId: null,
    ...overrides,
  };
}

function payment(
  overrides: Partial<VerifiedPayment> = {},
): VerifiedPayment {
  return {
    contractVersion: "xrpl-group-pay:verified-payment:v1",
    receiptContract: ASSET.receiptContract,
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    asset: ASSET,
    requestedAmount: {
      code: ASSET.symbol,
      units: "1250000",
      scale: ASSET.precision,
    },
    deliveredAmount: {
      code: ASSET.symbol,
      units: "1250000",
      scale: ASSET.precision,
    },
    sourceTag: 123456,
    destinationTag: 9,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-25T02:00:00.000Z",
    ...overrides,
  };
}

describe("settleVerifiedIssuedPaymentSlot", () => {
  it("writes the generic receipt, slot, bill, and readback in one batch", async () => {
    const database = new SettlementDatabase();
    const result = await settleVerifiedIssuedPaymentSlot(
      database,
      slot(),
      payment(),
      new Date("2026-06-25T02:00:01.000Z"),
    );

    expect(database.statements).toHaveLength(4);
    expect(database.statements[0].query).toContain("verified_payment_records");
    expect(database.statements[1].values).toContain(ASSET.id);
    expect(result).toMatchObject({
      receipt: {
        status: "recorded",
        transactionId: TXID,
        assetId: ASSET.id,
        legacyProofDigest: null,
      },
      slot: { status: "paid", paidTransactionId: TXID },
      bill: { status: "partially_paid" },
    });
  });

  it("returns the durable generic receipt as existing on an exact retry", async () => {
    const result = await settleVerifiedIssuedPaymentSlot(
      new SettlementDatabase(0),
      slot({ slotStatus: "paid", paidTransactionId: TXID }),
      payment(),
      new Date("2026-06-25T02:01:01.000Z"),
    );

    expect(result.receipt.status).toBe("existing");
  });

  it("rejects issued payment facts that differ from the frozen slot", async () => {
    const database = new SettlementDatabase();
    await expect(
      settleVerifiedIssuedPaymentSlot(
        database,
        slot(),
        payment({
          requestedAmount: {
            code: ASSET.symbol,
            units: "1",
            scale: ASSET.precision,
          },
          deliveredAmount: {
            code: ASSET.symbol,
            units: "1",
            scale: ASSET.precision,
          },
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentSlotSettlementConflictError>>({
        code: "SLOT_PROOF_MISMATCH",
      }),
    );
    expect(database.statements).toHaveLength(0);
  });

  it("rejects a second transaction for an already-paid slot", async () => {
    await expect(
      settleVerifiedIssuedPaymentSlot(
        new SettlementDatabase(),
        slot({ slotStatus: "paid", paidTransactionId: "C".repeat(64) }),
        payment(),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentSlotSettlementConflictError>>({
        code: "SLOT_ALREADY_PAID",
      }),
    );
  });

  it("reports a different transaction that wins a concurrent settlement", async () => {
    const competingTransactionId = "C".repeat(64);
    await expect(
      settleVerifiedIssuedPaymentSlot(
        new SettlementDatabase(0, false, competingTransactionId),
        slot(),
        payment(),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentSlotSettlementConflictError>>({
        code: "SLOT_ALREADY_PAID",
      }),
    );
  });

  it("fails closed when the atomic batch fails", async () => {
    await expect(
      settleVerifiedIssuedPaymentSlot(
        new SettlementDatabase(1, true),
        slot(),
        payment(),
      ),
    ).rejects.toBeInstanceOf(PaymentSlotSettlementDatabaseError);
  });
});
