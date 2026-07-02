import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { classifyPaymentRecovery } from "@/features/payment-recovery/taxonomy";

import { RecoveryBadge } from "./recovery-badge";

afterEach(cleanup);

describe("RecoveryBadge", () => {
  it("renders wait-and-recheck as in progress", () => {
    const assessment = classifyPaymentRecovery({
      source: "verification_pending",
      reason: "TRANSACTION_NOT_VALIDATED",
      transactionId: "A".repeat(64),
    });

    render(<RecoveryBadge assessment={assessment} locale="en" />);
    const badge = screen
      .getByText("Wait and check again")
      .closest("span[data-semantic-family]");
    expect(badge).toHaveAttribute("data-semantic-family", "in_progress");
    expect(badge?.querySelector("svg")).not.toBeNull();
  });

  it("renders already-paid and terminal states without action colors colliding", () => {
    const paid = classifyPaymentRecovery({
      source: "slot",
      code: "SLOT_ALREADY_PAID",
    });
    const closed = classifyPaymentRecovery({
      source: "slot",
      code: "BILL_CLOSED",
    });

    const { rerender } = render(
      <RecoveryBadge assessment={paid} locale="ja" />,
    );
    expect(
      screen
        .getByText("支払いは記録済みです")
        .closest("span[data-semantic-family]"),
    ).toHaveAttribute("data-semantic-family", "complete");

    rerender(<RecoveryBadge assessment={closed} locale="ko" />);
    expect(
      screen
        .getByText("이 결제를 계속할 수 없습니다")
        .closest("span[data-semantic-family]"),
    ).toHaveAttribute("data-semantic-family", "destructive");
  });

  it("renders setup-required as action required", () => {
    const assessment = classifyPaymentRecovery({
      source: "readiness",
      role: "payer",
      reason: "trust_line_missing",
    });

    render(<RecoveryBadge assessment={assessment} locale="ja" />);
    expect(
      screen
        .getByText("ウォレットの準備が必要です")
        .closest("span[data-semantic-family]"),
    ).toHaveAttribute("data-semantic-family", "action_required");
  });
});
