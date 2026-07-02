import { describe, expect, it } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { Locale } from "@/features/localization/catalog";
import { CREATED_BILL_FIXTURE } from "@/test/fixtures/bill-review";

import {
  buildParticipantInstructions,
  buildRlusdPreparationInstructions,
  participantCollectionAmount,
} from "./sharing-instructions";

const locales: Locale[] = ["en", "ja", "ko"];

describe("participant sharing instructions", () => {
  it("calculates the participant collection total independently of recipient funding", () => {
    expect(participantCollectionAmount(CREATED_BILL_FIXTURE)).toEqual({
      code: "XRP",
      scale: 6,
      units: "8000000",
    });
  });

  it.each(locales)("includes every frozen XRP payment fact in %s", (locale) => {
    const slot = CREATED_BILL_FIXTURE.slots[0];
    const text = buildParticipantInstructions({
      locale,
      created: CREATED_BILL_FIXTURE,
      slot,
      paymentUrl: "https://example.test/payment#token=participant",
    });

    expect(text).toContain(CREATED_BILL_FIXTURE.bill.title);
    expect(text).toContain(slot.expectedPayerAddress);
    expect(text).toContain("XRPL Testnet");
    expect(text).toContain("3 XRP");
    expect(text).toContain(CREATED_BILL_FIXTURE.bill.destinationAddress);
    expect(text).toContain("https://example.test/payment#token=participant");
    expect(text).toContain("XRP");
  });

  it.each(locales)("includes official RLUSD preparation and XRP requirements in %s", (locale) => {
    const asset = getRlusdAssetDescriptor("testnet");
    const created = {
      ...CREATED_BILL_FIXTURE,
      bill: {
        ...CREATED_BILL_FIXTURE.bill,
        asset,
        totalAmount: { code: "RLUSD", units: "10000000", scale: 6 },
        recipientFundedAmount: { code: "RLUSD", units: "2000000", scale: 6 },
        creatorShareAmount: { code: "RLUSD", units: "2000000", scale: 6 },
        totalDrops: null,
        recipientFundedDrops: null,
        creatorShareDrops: null,
      },
      slots: CREATED_BILL_FIXTURE.slots.map((slot) => ({
        ...slot,
        asset,
        expectedAmount: {
          code: "RLUSD",
          units: slot.expectedAmount.units,
          scale: 6,
        },
        expectedAmountDrops: null,
      })),
    };
    const text = buildRlusdPreparationInstructions({
      locale,
      created,
      slot: created.slots[0],
      paymentUrl: "https://example.test/payment#token=participant",
    });

    expect(text).toContain("RLUSD");
    expect(text).toContain(asset.issuer);
    expect(text).toContain("XRP");
    expect(text).toContain("TrustSet");
    expect(text).toContain(created.slots[0].expectedPayerAddress);
  });
});
