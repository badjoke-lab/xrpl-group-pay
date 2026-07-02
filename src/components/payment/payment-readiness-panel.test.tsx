import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getRlusdAssetDescriptor } from "@/features/assets/registry";
import type { PaymentDetails } from "@/features/bills/payment-details";
import { LocalizationProvider } from "@/features/localization/provider";
import type { AssetReadinessAssessment } from "@/features/xrpl/asset-readiness";

import {
  PaymentReadinessPanel,
  paymentReadinessAllowsHandoff,
} from "./payment-readiness-panel";

const asset = getRlusdAssetDescriptor("testnet");
const details: PaymentDetails = {
  billTitle: "Dinner",
  participantLabel: "Alex",
  expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
  destinationTag: null,
  sourceTag: 123456,
  invoiceId: "A".repeat(64),
  network: "testnet",
  asset,
  amount: { code: "RLUSD", units: "4000000", scale: 6 },
  amountDrops: null,
};

function readiness(
  role: "payer" | "recipient",
  status: "ready" | "blocked" | "unavailable",
  code: string | null = null,
): AssetReadinessAssessment {
  return {
    strategyId: "xrpl-asset-readiness-v1",
    role,
    status,
    ready: status === "ready",
    network: "testnet",
    account:
      role === "payer"
        ? details.expectedPayerAddress
        : details.destinationAddress,
    assetId: asset.id,
    amountUnits: details.amount.units,
    checks: [
      {
        code: code ?? "ready",
        status:
          status === "ready"
            ? "pass"
            : status === "blocked"
              ? "block"
              : "unavailable",
      },
    ],
    blockingCode: status === "blocked" ? code : null,
    unavailableCode: status === "unavailable" ? code : null,
    userMessageKey: `readiness.${role}.${code ?? "ready"}`,
    observedAt: "2026-07-02T00:00:00.000Z",
    facts: {
      spendableXrpDrops: "20",
      requiredXrpDrops: "12",
      reserveDrops: "10000000",
      estimatedFeeDrops: "12",
      issuedBalance: "1.5",
    },
  };
}

afterEach(cleanup);

describe("payment readiness gate", () => {
  it("allows handoff only after both roles are ready", () => {
    expect(
      paymentReadinessAllowsHandoff({
        payer: readiness("payer", "ready"),
        recipient: readiness("recipient", "ready"),
      }),
    ).toBe(true);
    expect(
      paymentReadinessAllowsHandoff({
        payer: readiness("payer", "blocked", "trust_line_missing"),
        recipient: readiness("recipient", "ready"),
      }),
    ).toBe(false);
    expect(paymentReadinessAllowsHandoff(null)).toBe(false);
  });

  it("offers official RLUSD setup only for a confirmed missing trust line", () => {
    const onPrepare = vi.fn();
    render(
      <LocalizationProvider initialLocale="en">
        <PaymentReadinessPanel
          details={details}
          readiness={{
            payer: readiness("payer", "blocked", "trust_line_missing"),
            recipient: readiness("recipient", "ready"),
          }}
          loading={false}
          error={null}
          setupWorking={false}
          setupPath={null}
          onRecheck={() => undefined}
          onPrepareSetup={onPrepare}
        />
      </LocalizationProvider>,
    );

    expect(
      screen.getByText("The payer does not have the official RLUSD trust line."),
    ).toBeVisible();
    expect(
      screen.getByText(/does not provide RLUSD and it does not pay this Bill/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Prepare official RLUSD TrustSet",
      }),
    );
    expect(onPrepare).toHaveBeenCalledTimes(1);
  });

  it("does not describe temporary unavailability as insufficient funds", () => {
    render(
      <LocalizationProvider initialLocale="ja">
        <PaymentReadinessPanel
          details={details}
          readiness={{
            payer: readiness(
              "payer",
              "unavailable",
              "validated_ledger_data_unavailable",
            ),
            recipient: readiness("recipient", "ready"),
          }}
          loading={false}
          error={null}
          setupWorking={false}
          setupPath={null}
          onRecheck={() => undefined}
          onPrepareSetup={() => undefined}
        />
      </LocalizationProvider>,
    );

    expect(
      screen.getAllByText(/残高不足を意味する表示ではありません/).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/XRPが不足しています/)).toBeNull();
  });
});
