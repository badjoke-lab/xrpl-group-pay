import { describe, expect, it } from "vitest";

import { createRlusdPaymentIntent } from "@/features/payment-intents/rlusd";

import { buildIssuedPaymentTransaction } from "./issued-payment-builder";
import {
  ONE_SHOT_LEDGER_WINDOW,
  pinOneShotPaymentTransaction,
} from "./one-shot-payment";

const DESTINATION = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const PAYER = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";
const OTHER = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
const INVOICE_ID = "AB".repeat(32);

describe("one-shot XRPL Payment binding", () => {
  it("pins the expected payer, Sequence, and LastLedgerSequence", () => {
    const transaction = buildIssuedPaymentTransaction(
      createRlusdPaymentIntent({
        paymentSlotId: "slot-1",
        network: "mainnet",
        amountUnits: "1",
        destination: DESTINATION,
        destinationTag: null,
        sourceTag: 2171267705,
        invoiceId: INVOICE_ID,
        expectedPayer: PAYER,
      }),
    );

    expect(
      pinOneShotPaymentTransaction(transaction, PAYER, {
        account: PAYER,
        sequence: 100,
        validatedLedgerIndex: 1_000_000,
      }),
    ).toEqual({
      ...transaction,
      Account: PAYER,
      Sequence: 100,
      LastLedgerSequence: 1_000_000 + ONE_SHOT_LEDGER_WINDOW,
    });
  });

  it("is deterministic for a reused Wallet Handoff", () => {
    const transaction = buildIssuedPaymentTransaction(
      createRlusdPaymentIntent({
        paymentSlotId: "slot-2",
        network: "mainnet",
        amountUnits: "1",
        destination: DESTINATION,
        destinationTag: null,
        sourceTag: 2171267705,
        invoiceId: INVOICE_ID,
        expectedPayer: PAYER,
      }),
    );
    const state = {
      account: PAYER,
      sequence: 101,
      validatedLedgerIndex: 1_000_100,
    };

    const first = pinOneShotPaymentTransaction(transaction, PAYER, state);
    const second = pinOneShotPaymentTransaction(transaction, PAYER, state);

    expect(second.Account).toBe(first.Account);
    expect(second.Sequence).toBe(first.Sequence);
    expect(second.LastLedgerSequence).toBe(first.LastLedgerSequence);
  });

  it("rejects signing state for a different account", () => {
    const transaction = buildIssuedPaymentTransaction(
      createRlusdPaymentIntent({
        paymentSlotId: "slot-3",
        network: "mainnet",
        amountUnits: "1",
        destination: DESTINATION,
        destinationTag: null,
        sourceTag: 2171267705,
        invoiceId: INVOICE_ID,
        expectedPayer: PAYER,
      }),
    );

    expect(() =>
      pinOneShotPaymentTransaction(transaction, PAYER, {
        account: OTHER,
        sequence: 100,
        validatedLedgerIndex: 1_000_000,
      }),
    ).toThrow("does not match the expected payer");
  });
});
