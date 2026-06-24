import { describe, expect, it } from "vitest";

import {
  calculateAllocationPreview,
  formatDropsAsXrp,
} from "./allocation-preview";

describe("calculateAllocationPreview", () => {
  it("reports under, exact, and over allocations", () => {
    expect(
      calculateAllocationPreview({
        totalXrp: "10",
        creatorShareXrp: "2",
        participantAmountsXrp: ["3", "4"],
      }),
    ).toMatchObject({ status: "under", differenceDrops: 1_000_000n });

    expect(
      calculateAllocationPreview({
        totalXrp: "10",
        creatorShareXrp: "2",
        participantAmountsXrp: ["3", "5"],
      }),
    ).toMatchObject({ status: "exact", differenceDrops: 0n });

    expect(
      calculateAllocationPreview({
        totalXrp: "10",
        creatorShareXrp: "2",
        participantAmountsXrp: ["4", "5"],
      }),
    ).toMatchObject({ status: "over", differenceDrops: -1_000_000n });
  });

  it("stays incomplete for empty, zero, or over-precision participant values", () => {
    expect(
      calculateAllocationPreview({
        totalXrp: "10",
        creatorShareXrp: "2",
        participantAmountsXrp: ["", "5"],
      }).status,
    ).toBe("incomplete");
    expect(
      calculateAllocationPreview({
        totalXrp: "10",
        creatorShareXrp: "2",
        participantAmountsXrp: ["0", "8"],
      }).status,
    ).toBe("incomplete");
    expect(
      calculateAllocationPreview({
        totalXrp: "10.0000001",
        creatorShareXrp: "2",
        participantAmountsXrp: ["3", "5"],
      }).status,
    ).toBe("incomplete");
  });
});

describe("formatDropsAsXrp", () => {
  it("formats signed drops without floating point conversion", () => {
    expect(formatDropsAsXrp(1_250_000n)).toBe("1.25");
    expect(formatDropsAsXrp(-500_000n)).toBe("-0.5");
  });
});
