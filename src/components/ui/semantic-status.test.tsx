import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  AssetBadge,
  LinkTypeBadge,
  ReadinessBadge,
  RoleBadge,
} from "./identity-badges";
import { NetworkBadge } from "./network-badge";
import {
  CardAccent,
  semanticFamilyForRecoveryDisposition,
  StatusBadge,
} from "./semantic-status";

afterEach(cleanup);

describe("semantic status system", () => {
  it.each([
    ["neutral", "Unpaid"],
    ["in_progress", "Validating"],
    ["complete", "Paid"],
    ["action_required", "Needs review"],
    ["destructive", "Failed"],
  ] as const)("renders %s with text and an icon", (family, label) => {
    render(<StatusBadge family={family} label={label} />);

    const badge = screen.getByText(label).closest("span[data-semantic-family]");
    expect(badge).toHaveAttribute("data-semantic-family", family);
    expect(badge?.querySelector("svg")).not.toBeNull();
  });

  it("maps recovery dispositions into the five approved families", () => {
    expect(semanticFamilyForRecoveryDisposition("safe_retry")).toBe(
      "action_required",
    );
    expect(semanticFamilyForRecoveryDisposition("wait_recheck")).toBe(
      "in_progress",
    );
    expect(semanticFamilyForRecoveryDisposition("setup_required")).toBe(
      "action_required",
    );
    expect(semanticFamilyForRecoveryDisposition("review_required")).toBe(
      "action_required",
    );
    expect(semanticFamilyForRecoveryDisposition("already_paid")).toBe(
      "complete",
    );
    expect(semanticFamilyForRecoveryDisposition("terminal")).toBe(
      "destructive",
    );
  });

  it("uses a thin semantic accent without replacing card content", () => {
    render(
      <CardAccent family="action_required">
        <p>Review this payment</p>
      </CardAccent>,
    );

    const card = screen
      .getByText("Review this payment")
      .closest("div[data-semantic-family]");
    expect(card).toHaveAttribute("data-semantic-family", "action_required");
    expect(card).toHaveClass("border-l-2");
  });
});

describe("identity badges", () => {
  it("keeps XRP and RLUSD neutral instead of using success colors", () => {
    const { rerender } = render(<AssetBadge symbol="XRP" />);
    expect(screen.getByText("XRP").closest("span")).not.toHaveClass(
      "text-success",
    );

    rerender(<AssetBadge symbol="RLUSD" official locale="ja" />);
    expect(screen.getByText("RLUSD · 公式").closest("span")).not.toHaveClass(
      "text-success",
    );
  });

  it("keeps Mainnet prominent without destructive styling", () => {
    const { rerender } = render(<NetworkBadge network="mainnet" />);
    const mainnet = screen.getByText("Mainnet · live").closest("span");
    expect(mainnet).toHaveAttribute("data-network", "mainnet");
    expect(mainnet).toHaveClass("bg-warning-subtle");
    expect(mainnet).not.toHaveClass("text-danger");

    rerender(<NetworkBadge network="testnet" />);
    expect(screen.getByText("Testnet").closest("span")).toHaveAttribute(
      "data-network",
      "testnet",
    );
  });

  it("provides role and link labels in English Japanese and Korean", () => {
    const { rerender } = render(<RoleBadge role="recipient" locale="en" />);
    expect(screen.getByText("Recipient")).toBeVisible();

    rerender(<RoleBadge role="payer" locale="ja" />);
    expect(screen.getByText("支払う人")).toBeVisible();

    rerender(<LinkTypeBadge type="preparation" locale="ko" />);
    expect(screen.getByText("준비 링크")).toBeVisible();
  });

  it("maps readiness to semantic families and localized labels", () => {
    const { rerender } = render(
      <ReadinessBadge status="ready" locale="ja" />,
    );
    expect(screen.getByText("準備完了").closest("span[data-semantic-family]")).toHaveAttribute(
      "data-semantic-family",
      "complete",
    );

    rerender(<ReadinessBadge status="blocked" locale="ko" />);
    expect(screen.getByText("조치 필요").closest("span[data-semantic-family]")).toHaveAttribute(
      "data-semantic-family",
      "action_required",
    );
  });
});
