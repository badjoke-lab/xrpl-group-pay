import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AllocationStatus } from "./allocation-status";

const customAllocation = {
  status: "incomplete" as const,
  differenceUnits: null,
  scale: 6,
};

afterEach(cleanup);

describe("AllocationStatus", () => {
  it("does not request participant amounts for an Equal split", () => {
    render(
      <AllocationStatus
        strategy="equal"
        customAllocation={customAllocation}
        strategyPreview={{ status: "incomplete", message: "" }}
        assetSymbol="XRP"
      />,
    );

    expect(
      screen.getByText(
        "Enter the bill total to calculate each participant share.",
      ),
    ).toBeVisible();
    expect(screen.queryByText(/every participant amount/i)).toBeNull();
  });

  it("keeps direct amount guidance for a Custom Amount split", () => {
    render(
      <AllocationStatus
        strategy="custom"
        customAllocation={customAllocation}
        strategyPreview={{ status: "incomplete", message: "" }}
        assetSymbol="XRP"
      />,
    );

    expect(
      screen.getByText(
        "Enter the total, creator share, and every participant amount.",
      ),
    ).toBeVisible();
  });

  it("uses percentage-specific guidance", () => {
    render(
      <AllocationStatus
        strategy="percentage"
        customAllocation={customAllocation}
        strategyPreview={{ status: "incomplete", message: "" }}
        assetSymbol="RLUSD"
      />,
    );

    expect(
      screen.getByText(
        "Enter the bill total and percentages that add up to 100%.",
      ),
    ).toBeVisible();
  });
});
