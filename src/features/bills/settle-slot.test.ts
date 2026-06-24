import { describe, expect, it } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";
import type { LedgerVerificationProof } from "@/features/payment-verification/types";

import type { ResolvedPaymentSlot } from "./payment-slot";
import {
  PaymentSlotSettlementConflictError,
  PaymentSlotSettlementDatabaseError,
  settleVerifiedPaymentSlot,
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
  ) {}

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    if (this.fail) throw new Error("database failed");

    return [
      { success: true, meta: { changes: this.receiptChanges } },
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 1 } },
      {
        success: true,
        results: [
          {
            receipt_id: `testnet:${TXID}`,
            transaction_id: TXID,
            invoice_id: INVOICE_ID,
            recorded_at: "2026-06-24T00:00:01.000Z",
            proof_digest: PROOF_DIGEST,
            slot_public_id: SLOT_PUBLIC_ID,
            slot_status: "paid",
            paid_tx_hash: TXID,
            paid_at: "2026-06-24T00:00:01.000Z",
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
const PROOF_DIGEST =
  "7984D6E437BFB764D5E8995BB9FE56C2EC03641BDBD413A848668109B19A24C6";

function slot(
  overrides: Partial<ResolvedPaymentSlot> = {},
): ResolvedPaymentSlot {
  return {
    slotId: "slot-1",
    slotPublicId: SLOT_PUBLIC_ID,
    billId: "bill-1",
    billPublicId: BILL_PUBLIC_ID,
    billTitle: "Dinner",
    network: "testnet",
    destinationAddress: "rDestination",
    destinationTag: 9,
    participantLabel: "Alex",
    expectedPayerAddress: "rSender",
    expectedAmountDrops: "4000000",
    invoiceId: INVOICE_ID,
    slotStatus: "validating",
    billStatus: "open",
    paidTransactionId: null,
    ...overrides,
  };
}

function proof(
  overrides: Partial<LedgerVerificationProof> = {},
): LedgerVerificationProof {
  return {
    network: "testnet",
    transactionId: TXID,
    ledgerIndex: 12345,
    sender: "rSender",
    destination: "rDestination",
    amountDrops: "4000000",
    deliveredAmountDrops: "4000000",
    sourceTag: 123456,
    destinationTag: 9,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${TXID}`,
    verifiedAt: "2026-06-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("settleVerifiedPaymentSlot", () => {
  it("writes the receipt, slot, bill, and readback in one batch", async () => {
    const database = new SettlementDatabase();
    const result = await settleVerifiedPaymentSlot(
      database,
      slot(),
      proof(),
      new Date("2026-06-24T00:00:01.000Z"),
    );

    expect(database.statements).toHaveLength(4);
    expect(result).toMatchObject({
      receipt: { status: "created", transactionId: TXID },
      slot: { status: "paid", paidTransactionId: TXID },
      bill: { status: "partially_paid" },
    });
    expect(database.statements[1].values).toContain(PROOF_DIGEST);
  });

  it("returns the durable receipt as existing on an exact retry", async () => {
    const result = await settleVerifiedPaymentSlot(
      new SettlementDatabase(0),
      slot({ slotStatus: "paid", paidTransactionId: TXID }),
      proof({ verifiedAt: "2026-06-24T00:01:00.000Z" }),
      new Date("2026-06-24T00:01:01.000Z"),
    );

    expect(result.receipt.status).toBe("existing");
  });

  it("rejects proof facts that differ from the frozen slot", async () => {
    const database = new SettlementDatabase();
    await expect(
      settleVerifiedPaymentSlot(database, slot(), proof({ amountDrops: "1" })),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentSlotSettlementConflictError>>({
        code: "SLOT_PROOF_MISMATCH",
      }),
    );
    expect(database.statements).toHaveLength(0);
  });

  it("rejects a second transaction for an already-paid slot", async () => {
    await expect(
      settleVerifiedPaymentSlot(
        new SettlementDatabase(),
        slot({ slotStatus: "paid", paidTransactionId: "C".repeat(64) }),
        proof(),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentSlotSettlementConflictError>>({
        code: "SLOT_ALREADY_PAID",
      }),
    );
  });

  it("fails closed when the atomic batch fails", async () => {
    await expect(
      settleVerifiedPaymentSlot(
        new SettlementDatabase(1, true),
        slot(),
        proof(),
      ),
    ).rejects.toBeInstanceOf(PaymentSlotSettlementDatabaseError);
  });
});
