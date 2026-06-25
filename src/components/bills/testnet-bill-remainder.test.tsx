import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BILL_DESTINATION,
  BILL_REVIEW_FIXTURE,
  PAYER_ONE,
  PAYER_TWO,
} from "@/test/fixtures/bill-review";

import { TestnetBillForm } from "./testnet-bill-form";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fillRemainderBill() {
  fireEvent.change(screen.getByLabelText("Bill title"), {
    target: { value: "Tiny split" },
  });
  fireEvent.change(screen.getByLabelText("Creator destination address"), {
    target: { value: BILL_DESTINATION },
  });
  fireEvent.change(screen.getByPlaceholderText("10"), {
    target: { value: "0.000003" },
  });
  fireEvent.change(screen.getByPlaceholderText("2"), {
    target: { value: "0" },
  });
  const payers = screen.getAllByLabelText("Expected payer address");
  fireEvent.change(payers[0], { target: { value: PAYER_ONE } });
  fireEvent.change(payers[1], { target: { value: PAYER_TWO } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetBillForm remainder handling", () => {
  it("blocks review until an explicit remainder rule is selected", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(BILL_REVIEW_FIXTURE));
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetBillForm />);
    fireEvent.click(screen.getByLabelText(/^Equal/));
    fillRemainderBill();

    expect(screen.getByText("Remainder rule required")).toBeVisible();
    expect(
      screen.getByText("Assign the remainder explicitly"),
    ).toBeVisible();
    expect(screen.getByText("1", { selector: "strong" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Creator pays remainder/));

    expect(screen.getByText("Allocation exact")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Review before freezing" }),
    ).toBeVisible();

    const request = JSON.parse(
      (fetcher.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(request.allocation).toMatchObject({
      strategy: "equal",
      remainderAssignment: { kind: "creator" },
    });
    expect(screen.getByText("Equal", { exact: true })).toBeVisible();
    expect(screen.getByText("Remainder units")).toBeVisible();
    expect(screen.getByText("Creator", { exact: true })).toBeVisible();
  });

  it("requires a selected participant before assigning the remainder", () => {
    render(<TestnetBillForm />);
    fireEvent.click(screen.getByLabelText(/^Equal/));
    fillRemainderBill();
    fireEvent.click(screen.getByLabelText(/Choose one participant/));

    expect(screen.getByLabelText("Remainder participant")).toHaveValue("");
    expect(screen.getByText("Remainder rule required")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    ).toBeDisabled();
  });

  it("validates manual remainder increments exactly", () => {
    render(<TestnetBillForm />);
    fireEvent.click(screen.getByLabelText(/^Equal/));
    fillRemainderBill();
    fireEvent.click(screen.getByLabelText(/Distribute manually/));

    const increments = screen.getAllByLabelText(/Remainder units for/);
    fireEvent.change(increments[0], { target: { value: "1" } });
    fireEvent.change(increments[1], { target: { value: "0" } });

    expect(screen.getByText("Allocation exact")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    ).toBeEnabled();
  });
});
