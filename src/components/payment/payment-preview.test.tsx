import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PaymentPreview } from "./payment-preview";

describe("PaymentPreview", () => {
  it("shows the bill, amount, recipient, network, and non-custodial boundary", () => {
    render(
      <PaymentPreview
        billTitle="XRPL Meetup Dinner"
        amount="4"
        recipient="rABC…9XYZ"
        network="testnet"
      />,
    );

    expect(screen.getByRole("heading", { name: "XRPL Meetup Dinner" })).toBeVisible();
    expect(screen.getByText("4", { exact: false })).toBeVisible();
    expect(screen.getByText("rABC…9XYZ")).toBeVisible();
    expect(screen.getByText("Testnet")).toBeVisible();
    expect(screen.getByText("Group Pay never holds your funds")).toBeVisible();
  });
});
