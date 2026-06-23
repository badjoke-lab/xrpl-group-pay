import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TestnetPaymentForm } from "./testnet-payment-form";

describe("TestnetPaymentForm", () => {
  it("renders a Testnet-only, user-approved payment form", () => {
    render(<TestnetPaymentForm />);

    expect(
      screen.getByRole("heading", { name: "Create a Testnet Payment" }),
    ).toBeVisible();
    expect(screen.getByLabelText("Recipient XRPL address")).toBeRequired();
    expect(
      screen.getByRole("button", { name: "Continue to Xaman" }),
    ).toBeEnabled();
    expect(screen.getByText(/forces Xaman to use XRPL Testnet/i)).toBeVisible();
  });
});
