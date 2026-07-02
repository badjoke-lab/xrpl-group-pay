import { describe, expect, it, vi } from "vitest";

import { billProgressSemanticStatus } from "./bill-progress-status";

const gt = vi.fn((key: string) => key) as never;

describe("billProgressSemanticStatus", () => {
  it.each([
    ["unpaid", "neutral"],
    ["payload_created", "in_progress"],
    ["awaiting_signature", "in_progress"],
    ["submitted", "in_progress"],
    ["validating", "in_progress"],
    ["paid", "complete"],
    ["rejected", "action_required"],
    ["expired", "action_required"],
    ["needs_review", "action_required"],
    ["verification_failed", "destructive"],
  ] as const)("maps %s to %s", (status, family) => {
    expect(billProgressSemanticStatus(status, gt)).toMatchObject({ family });
  });

  it("animates only active progress states", () => {
    expect(billProgressSemanticStatus("submitted", gt).animated).toBe(true);
    expect(billProgressSemanticStatus("validating", gt).animated).toBe(true);
    expect(
      billProgressSemanticStatus("awaiting_signature", gt).animated,
    ).toBe(true);
    expect(billProgressSemanticStatus("paid", gt).animated).toBe(false);
  });
});
