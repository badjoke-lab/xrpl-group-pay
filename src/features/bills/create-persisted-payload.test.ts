import { describe, expect, it, vi } from "vitest";

import type {
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1ResultLike,
  D1ValueLike,
} from "@/features/persistence/d1-types";

import { createPersistedSlotPayload } from "./create-persisted-payload";

class Statement implements D1PreparedStatementLike {
  constructor(
    readonly row: Record<string, unknown> | null,
    readonly values: D1ValueLike[] = [],
  ) {}

  bind(...values: D1ValueLike[]) {
    return new Statement(this.row, values);
  }

  async first<Row = Record<string, unknown>>() {
    return this.row as Row | null;
  }

  async run<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>> {
    return { success: true, meta: { changes: 1 } };
  }
}

class Database implements D1DatabaseLike {
  prepare(query: string) {
    if (query.includes("FROM payment_slots ps")) {
      return new Statement({
        slot_id: "slot-1",
        slot_public_id: "00000000-0000-4000-8000-000000000001",
        bill_id: "bill-1",
        bill_public_id: "00000000-0000-4000-8000-000000000002",
        bill_title: "Dinner",
        payment_mode: "representative",
        recipient_label: "Alex",
        network: "testnet",
        destination_address: "rDestination",
        destination_tag: null,
        participant_label: "Blair",
        expected_payer_address: "rPayer",
        expected_amount_drops: "1000000",
        payment_contract_version: "payment-slot-v2",
        asset_id: "xrpl:testnet:xrp",
        asset_type: "native",
        currency_code: "XRP",
        issuer: null,
        amount_scale: 6,
        expected_amount_units: "1000000",
        invoice_id: "A".repeat(64),
        slot_status: "awaiting_signature",
        bill_status: "open",
        paid_tx_hash: null,
        review_reason_code: null,
        review_details_json: null,
      });
    }

    if (query.includes("FROM wallet_handoffs")) {
      return new Statement({
        id: "handoff-1",
        payment_slot_id: "slot-1",
        request_id: "22222222-2222-4222-8222-222222222222",
        status: "opened",
        expires_at: "2026-07-02T00:05:00.000Z",
        transaction_id: null,
        mobile_uri: "https://example.test/sign",
        browser_uri: "https://example.test/sign",
        qr_image_url: "https://example.test/qr.png",
        status_channel: "wss://example.test/status",
        provider_metadata_json: "{}",
      });
    }

    return new Statement(null);
  }

  async batch<Row = Record<string, unknown>>(): Promise<D1ResultLike<Row>[]> {
    throw new Error("No write is expected while resuming an active handoff.");
  }
}

describe("createPersistedSlotPayload", () => {
  it("returns the active handoff instead of creating a duplicate", async () => {
    const createHandoff = vi.fn();
    const reconcileReplacement = vi.fn();

    const result = await createPersistedSlotPayload(
      new Database(),
      "a".repeat(64),
      {
        sourceTag: 777,
        createHandoff,
        reconcileReplacement,
        now: () => new Date("2026-07-02T00:00:00.000Z"),
      },
    );

    expect(result).toMatchObject({
      payloadId: "22222222-2222-4222-8222-222222222222",
      status: "waiting",
      deepLink: "https://example.test/sign",
      qrPng: "https://example.test/qr.png",
      websocketUrl: "wss://example.test/status",
      slot: {
        publicId: "00000000-0000-4000-8000-000000000001",
        billPublicId: "00000000-0000-4000-8000-000000000002",
      },
    });
    expect(createHandoff).not.toHaveBeenCalled();
    expect(reconcileReplacement).not.toHaveBeenCalled();
  });
});
