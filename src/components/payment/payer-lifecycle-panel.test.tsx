import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalizationProvider } from "@/features/localization/provider";
import { payerLifecycleFromApiError } from "@/features/payment-recovery/payer-lifecycle";

import { PayerLifecyclePanel } from "./payer-lifecycle-panel";

afterEach(cleanup);

describe("PayerLifecyclePanel", () => {
  it("shows retry only for a retry-safe reconciled path", () => {
    const retry = vi.fn();
    render(
      <LocalizationProvider initialLocale="en">
        <PayerLifecyclePanel
          lifecycle={payerLifecycleFromApiError("TRANSACTION_FAILED")}
          onRetry={retry}
        />
      </LocalizationProvider>,
    );

    const button = screen.getByRole("button", { name: "Retry safely" });
    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/checks the payer account and frozen InvoiceID/),
    ).toBeVisible();
  });

  it("blocks replacement for review-required transactions", () => {
    render(
      <LocalizationProvider initialLocale="ja">
        <PayerLifecyclePanel
          lifecycle={payerLifecycleFromApiError("PAYMENT_REQUIRES_REVIEW")}
          transactionId={"A".repeat(64)}
        />
      </LocalizationProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "この支払いは確認が必要です" }),
    ).toBeVisible();
    expect(
      screen.getByText("この状態では代替支払いを作成できません。"),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /再試行/ })).toBeNull();
  });

  it("offers only recheck while reconciliation is unavailable", () => {
    const recheck = vi.fn();
    render(
      <LocalizationProvider initialLocale="ko">
        <PayerLifecyclePanel
          lifecycle={payerLifecycleFromApiError(
            "PAYMENT_RECONCILIATION_UNAVAILABLE",
          )}
          onRecheck={recheck}
        />
      </LocalizationProvider>,
    );

    expect(screen.queryByRole("button", { name: /재시도/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));
    expect(recheck).toHaveBeenCalledTimes(1);
  });

  it("never offers another payment for an already-paid slot", () => {
    render(
      <LocalizationProvider initialLocale="en">
        <PayerLifecyclePanel
          lifecycle={payerLifecycleFromApiError("SLOT_ALREADY_PAID")}
        />
      </LocalizationProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "Payment already completed" }),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });
});
