import { describe, expect, it } from "vitest";

import type { LedgerVerificationProof } from "@/features/payment-verification/types";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "./d1-types";
import {
  PaymentReceiptConflictError,
  PaymentReceiptInputError,
  recordVerifiedPayment,
} from "./verified-payment-receipts";

type ReceiptRow = {
  receipt_id: string;
  network: "testnet";
  transaction_id: string;
  invoice_id: string;
  ledger_index: number;
  sender: string;
  destination: string;
  amount_drops: string;
  delivered_amount_drops: string;
  source_tag: number;
  destination_tag: number | null;
  verified_at: string;
  recorded_at: string;
  proof_digest: string;
};

class MemoryStatement implements D1PreparedStatementLike {
  constructor(
    readonly database: MemoryD1,
    readonly query: string,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new MemoryStatement(this.database, this.query, values);
  }

  async first<Row = Record<string, unknown>>() {
    return this.database.first(this) as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    throw new Error("MemoryD1 uses batch for receipt writes.");
  }
}

class MemoryD1 implements D1DatabaseLike {
  private transactionRows = new Map<string, ReceiptRow>();
  private invoiceRows = new Map<string, ReceiptRow>();

  prepare(query: string) {
    return new MemoryStatement(this, query);
  }

  first(statement: MemoryStatement) {
    const [network, value] = statement.values as [string, string];
    if (statement.query.includes("invoice_id = ?2")) {
      return this.invoiceRows.get(`${network}:${value}`) ?? null;
    }
    return this.transactionRows.get(`${network}:${value}`) ?? null;
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    const nextTransactions = new Map(this.transactionRows);
    const nextInvoices = new Map(this.invoiceRows);
    const results: D1ResultLike<Row>[] = [];

    for (const rawStatement of statements) {
      const statement = rawStatement as MemoryStatement;
      if (statement.query.includes("INSERT INTO verified_payment_receipts")) {
        const values = statement.values;
        const row: ReceiptRow = {
          receipt_id: String(values[0]),
          network: "testnet",
          transaction_id: String(values[2]),
          invoice_id: String(values[3]),
          ledger_index: Number(values[4]),
          sender: String(values[5]),
          destination: String(values[6]),
          amount_drops: String(values[7]),
          delivered_amount_drops: String(values[8]),
          source_tag: Number(values[9]),
          destination_tag:
            values[10] === null ? null : Number(values[10]),
          verified_at: String(values[11]),
          recorded_at: String(values[12]),
          proof_digest: String(values[13]),
        };
        const transactionKey = `${row.network}:${row.transaction_id}`;
        const invoiceKey = `${row.network}:${row.invoice_id}`;
        const existingTransaction = nextTransactions.get(transactionKey);
        const existingInvoice = nextInvoices.get(invoiceKey);

        if (!existingTransaction && existingInvoice) {
          throw new Error("UNIQUE constraint failed: network, invoice_id");
        }

        if (!existingTransaction) {
          nextTransactions.set(transactionKey, row);
          nextInvoices.set(invoiceKey, row);
        }

        results.push({
          success: true,
          meta: { changes: existingTransaction ? 0 : 1 },
        });
        continue;
      }

      const [network, transactionId] = statement.values as [string, string];
      const row = nextTransactions.get(`${network}:${transactionId}`);
      results.push({
        success: true,
        results: (row ? [row] : []) as Row[],
        meta: { changes: 0 },
      });
    }

    this.transactionRows = nextTransactions;
    this.invoiceRows = nextInvoices;
    return results;
  }

  get size() {
    return this.transactionRows.size;
  }
}

const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);

function makeProof(
  overrides: Partial<LedgerVerificationProof> = {},
): LedgerVerificationProof {
  const transactionId = overrides.transactionId ?? TXID;
  return {
    network: "testnet",
    transactionId,
    ledgerIndex: 12345,
    sender: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
    destination: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    amountDrops: "4000000",
    deliveredAmountDrops: "4000000",
    sourceTag: 123456,
    destinationTag: 9,
    invoiceId: INVOICE_ID,
    idempotencyKey: `testnet:${transactionId}`,
    verifiedAt: "2026-06-23T01:02:03.000Z",
    ...overrides,
  };
}

describe("recordVerifiedPayment", () => {
  it("keeps a later re-verification of the same ledger facts idempotent", async () => {
    const database = new MemoryD1();
    const first = await recordVerifiedPayment(
      database,
      makeProof(),
      new Date("2026-06-23T01:02:04.000Z"),
    );
    const retry = await recordVerifiedPayment(
      database,
      makeProof({ verifiedAt: "2026-06-23T01:03:03.000Z" }),
      new Date("2026-06-23T01:03:04.000Z"),
    );

    expect(first).toMatchObject({
      receiptId: `testnet:${TXID}`,
      status: "created",
      transactionId: TXID,
      invoiceId: INVOICE_ID,
      recordedAt: "2026-06-23T01:02:04.000Z",
    });
    expect(retry).toEqual({ ...first, status: "existing" });
    expect(database.size).toBe(1);
  });

  it("rejects different verified facts for an existing transaction ID", async () => {
    const database = new MemoryD1();
    await recordVerifiedPayment(database, makeProof());

    await expect(
      recordVerifiedPayment(database, makeProof({ amountDrops: "3999999" })),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentReceiptConflictError>>({
        code: "TRANSACTION_PROOF_CONFLICT",
      }),
    );
    expect(database.size).toBe(1);
  });

  it("rejects reusing an InvoiceID for another verified transaction", async () => {
    const database = new MemoryD1();
    await recordVerifiedPayment(database, makeProof());
    const otherTransaction = "C".repeat(64);

    await expect(
      recordVerifiedPayment(
        database,
        makeProof({
          transactionId: otherTransaction,
          idempotencyKey: `testnet:${otherTransaction}`,
        }),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PaymentReceiptConflictError>>({
        code: "INVOICE_ALREADY_RECORDED",
      }),
    );
    expect(database.size).toBe(1);
  });

  it("rejects a proof whose idempotency key does not match its transaction", async () => {
    await expect(
      recordVerifiedPayment(
        new MemoryD1(),
        makeProof({ idempotencyKey: `testnet:${"D".repeat(64)}` }),
      ),
    ).rejects.toBeInstanceOf(PaymentReceiptInputError);
  });

  it("collapses concurrent exact retries to one stored row", async () => {
    const database = new MemoryD1();
    const outcomes = await Promise.all([
      recordVerifiedPayment(database, makeProof()),
      recordVerifiedPayment(database, makeProof()),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual([
      "created",
      "existing",
    ]);
    expect(database.size).toBe(1);
  });
});
