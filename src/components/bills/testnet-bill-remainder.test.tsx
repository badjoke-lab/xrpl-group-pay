import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function continueToNextStep() {
  const button = screen.getByRole("button", { name: "Continue" });
  expect(button).toBeEnabled();
  fireEvent.click(button);
}

function reachRemainderStep() {
  fireEvent.click(
    screen.getByRole("radio", { name: /Pay a representative/ }),
  );
  continueToNextStep();

  fireEvent.change(screen.getByLabelText(/Representative or recipient name/), {
    target: { value: "Dinner organizer" },
  });
  fireEvent.change(screen.getByLabelText("Bill title"), {
    target: { value: "Tiny split" },
  });
  fireEvent.change(screen.getByLabelText(/Recipient XRPL address/), {
    target: { value: BILL_DESTINATION },
  });
  fireEvent.change(screen.getByLabelText("Bill total"), {
    target: { value: "0.000003" },
  });
  continueToNextStep();

  fireEvent.click(screen.getByRole("radio", { name: /^Equal/ }));
  const payers = screen.getAllByLabelText("Expected payer address");
  fireEvent.change(payers[0], { target: { value: PAYER_ONE } });
  fireEvent.change(payers[1], { target: { value: PAYER_TWO } });
}

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
});

describe("TestnetBillForm remainder handling", () => {
  it("blocks progress until an explicit remainder rule is selected", async () => {
    const fetcher = vi.fn().mockResolvedValue(response(BILL_REVIEW_FIXTURE));
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetBillForm />);
    reachRemainderStep();

    expect(screen.getByText("Remainder rule required")).toBeVisible();
    expect(screen.getByText("Assign the remainder explicitly")).toBeVisible();
    expect(
      screen.getByText(
        "The calculation leaves 1 smallest Asset unit. Group Pay will not discard or assign it silently.",
      ),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: /Creator pays remainder/ }));

    expect(screen.getByText("Allocation exact")).toBeVisible();
    continueToNextStep();
    fireEvent.click(screen.getByRole("button", { name: "Review and freeze" }));
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
    expect(
      screen.getByText("Remainder assignment").parentElement,
    ).toHaveTextContent("Recipient-funded amount");
  });

  it("requires a selected participant before assigning the remainder", () => {
    render(<TestnetBillForm />);
    reachRemainderStep();
    fireEvent.click(screen.getByRole("radio", { name: /Choose one participant/ }));

    expect(screen.getByLabelText("Remainder participant")).toHaveValue("");
    expect(screen.getByText("Remainder rule required")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("validates manual remainder increments exactly", () => {
    render(<TestnetBillForm />);
    reachRemainderStep();
    fireEvent.click(screen.getByRole("radio", { name: /Distribute manually/ }));

    const increments = screen.getAllByLabelText(/Remainder units for/);
    fireEvent.change(increments[0], { target: { value: "1" } });
    fireEvent.change(increments[1], { target: { value: "0" } });

    expect(screen.getByText("Allocation exact")).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });
});
