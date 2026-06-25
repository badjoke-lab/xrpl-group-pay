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
import { settleVerifiedIssuedPaymentSlot } from "./settle-issued-slot";

const TXID = "A".repeat(64);
const INVOICE_ID = "B".repeat(64);
const SLOT_PUBLIC_ID = "00000000-0000-4000-8000-000000000011";
const BILL_PUBLIC_ID = "00000000-0000-4000-8000-000000000012";
const ASSET = getRlusdAssetDescriptor("mainnet");

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

class MainnetSettlementDatabase implements D1DatabaseLike {
  statements: Statement[] = [];

  prepare(query: string) {
    return new Statement(query);
  }

  async batch<Row = Record<string, unknown>>(
    statements: D1PreparedStatementLike[],
  ): Promise<D1ResultLike<Row>[]> {
    this.statements = statements as Statement[];
    const digest = this.statements[0].values[20] as string;

    return [
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 1 } },
      { success: true, meta: { changes: 1 } },
      {
        success: true,
        results: [
          {
            receipt_id: `mainnet:${TXID}`,
            network: "mainnet",
            transaction_id: TXID,
            invoice_id: INVOICE_ID,
            asset_id: ASSET.id,
            recorded_at: "2026-06-26T02:00:01.000Z",
            verified_payment_digest: digest,
            legacy_proof_digest: null,
            slot_public_id: SLOT_PUBLIC_ID,
            slot_status: "paid",
            paid_tx_hash: TXID,
            paid_at: "2026-06-26T02:00:01.000Z",
            bill_public_id: BILL_PUBLIC_ID,
            bill_status: "settled",
          },
        ] as Row[],
      },
    ];
  }
}

const slot: ResolvedPaymentSlot = {
  slotId: "slot-mainnet-rlusd",
  slotPublicId: SLOT_PUBLIC_ID,
  billId: "bill-mainnet-rlusd",
  billPublicId: BILL_PUBLIC_ID,
  billTitle: "Dinner",
  network: "mainnet",
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
  billStatus: "partially_paid",
  paidTransactionId: null,
};

const payment: VerifiedPayment = {
  contractVersion: "xrpl-group-pay:verified-payment:v1",
  receiptContract: ASSET.receiptContract,
  network: "mainnet",
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
  idempotencyKey: `mainnet:${TXID}`,
  verifiedAt: "2026-06-26T02:00:00.000Z",
};

describe("Mainnet RLUSD settlement", () => {
  it("records a network-scoped RLUSD receipt atomically", async () => {
    const database = new MainnetSettlementDatabase();
    const result = await settleVerifiedIssuedPaymentSlot(
      database,
      slot,
      payment,
      new Date("2026-06-26T02:00:01.000Z"),
    );

    expect(result).toMatchObject({
      receipt: {
        receiptId: `mainnet:${TXID}`,
        network: "mainnet",
        assetId: "xrpl:mainnet:rlusd",
      },
      slot: { status: "paid", paidTransactionId: TXID },
      bill: { status: "settled" },
    });
    expect(database.statements[0].values).toContain("mainnet");
    expect(database.statements[1].values).toContain(ASSET.id);
  });
});
