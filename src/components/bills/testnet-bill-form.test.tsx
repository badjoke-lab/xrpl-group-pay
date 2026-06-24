import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BILL_DESTINATION,
  BILL_REVIEW_FIXTURE,
  CREATED_BILL_FIXTURE,
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

function fillBill() {
  fireEvent.change(screen.getByLabelText("Bill title"), {
    target: { value: "Dinner" },
  });
  fireEvent.change(screen.getByLabelText("Creator destination address"), {
    target: { value: BILL_DESTINATION },
  });
  fireEvent.change(screen.getByPlaceholderText("10"), {
    target: { value: "10" },
  });
  fireEvent.change(screen.getByPlaceholderText("2"), {
    target: { value: "2" },
  });
  const labels = screen.getAllByLabelText("Label");
  const payers = screen.getAllByLabelText("Expected payer address");
  const amounts = screen.getAllByPlaceholderText("4");
  fireEvent.change(labels[0], { target: { value: "Alex" } });
  fireEvent.change(payers[0], { target: { value: PAYER_ONE } });
  fireEvent.change(amounts[0], { target: { value: "3" } });
  fireEvent.change(labels[1], { target: { value: "Blair" } });
  fireEvent.change(payers[1], { target: { value: PAYER_TWO } });
  fireEvent.change(amounts[1], { target: { value: "5" } });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetBillForm", () => {
  it("starts with two slots and blocks review until allocation is exact", () => {
    render(<TestnetBillForm />);
    expect(screen.getByText("Participant 1")).toBeVisible();
    expect(screen.getByText("Participant 2")).toBeVisible();
    expect(screen.getByText("Allocation incomplete")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    ).toBeDisabled();
  });

  it("shows under, exact, and over allocation feedback", () => {
    render(<TestnetBillForm />);
    fireEvent.change(screen.getByPlaceholderText("10"), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByPlaceholderText("2"), {
      target: { value: "2" },
    });
    const amounts = screen.getAllByPlaceholderText("4");
    fireEvent.change(amounts[0], { target: { value: "3" } });
    fireEvent.change(amounts[1], { target: { value: "4" } });
    expect(screen.getByText("1 XRP remains to allocate.")).toBeVisible();
    fireEvent.change(amounts[1], { target: { value: "5" } });
    expect(screen.getByText("Allocation exact")).toBeVisible();
    fireEvent.change(amounts[1], { target: { value: "6" } });
    expect(screen.getByText(/allocated above the bill total/)).toBeVisible();
  });

  it("reviews without creating, preserves edits, and freezes only on confirmation", async () => {
    const fetcher = vi.fn().mockImplementation((url: string) =>
      Promise.resolve(
        url === "/api/bills/review"
          ? response(BILL_REVIEW_FIXTURE)
          : response(CREATED_BILL_FIXTURE, 201),
      ),
    );
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetBillForm />);
    fillBill();
    fireEvent.click(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Review before freezing" }),
    ).toBeVisible();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(screen.getByLabelText("Bill title")).toHaveValue("Dinner");

    fireEvent.click(
      screen.getByRole("button", { name: "Review bill before freezing" }),
    );
    await screen.findByRole("heading", { name: "Review before freezing" });
    fireEvent.click(
      screen.getByRole("button", {
        name: "Freeze bill and create payment links",
      }),
    );

    await waitFor(() => expect(screen.getByText("Bill created")).toBeVisible());
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0][0]).toBe("/api/bills/review");
    expect(fetcher.mock.calls[2][0]).toBe("/api/bills");
  });
});
