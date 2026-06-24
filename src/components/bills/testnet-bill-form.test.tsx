import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TestnetBillForm } from "./testnet-bill-form";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const createdBill = {
  bill: {
    publicId: "00000000-0000-4000-8000-000000000001",
    title: "Dinner",
    network: "testnet",
    destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
    destinationTag: null,
    totalDrops: "10000000",
    creatorShareDrops: "2000000",
    status: "open",
    revision: 1,
    frozenAt: "2026-06-24T00:00:00.000Z",
    createdAt: "2026-06-24T00:00:00.000Z",
  },
  capabilities: {
    publicToken: "1".repeat(64),
    adminToken: "2".repeat(64),
  },
  slots: [
    {
      publicId: "00000000-0000-4000-8000-000000000002",
      participantLabel: "Alex",
      expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      expectedAmountDrops: "3000000",
      invoiceId: "A".repeat(64),
      status: "unpaid",
      paymentToken: "3".repeat(64),
    },
    {
      publicId: "00000000-0000-4000-8000-000000000003",
      participantLabel: "Blair",
      expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
      expectedAmountDrops: "5000000",
      invoiceId: "B".repeat(64),
      status: "unpaid",
      paymentToken: "4".repeat(64),
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TestnetBillForm", () => {
  it("starts with two participant slots", () => {
    render(<TestnetBillForm />);
    expect(screen.getByText("Participant 1")).toBeVisible();
    expect(screen.getByText("Participant 2")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Remove participant 1" }),
    ).toBeDisabled();
  });

  it("creates a frozen bill and exposes one link per participant", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(createdBill, 201));
    vi.stubGlobal("fetch", fetcher);

    render(<TestnetBillForm />);
    fireEvent.change(screen.getByLabelText("Bill title"), {
      target: { value: "Dinner" },
    });
    fireEvent.change(screen.getByLabelText("Creator destination address"), {
      target: { value: createdBill.bill.destinationAddress },
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
    fireEvent.change(payers[0], {
      target: { value: createdBill.slots[0].expectedPayerAddress },
    });
    fireEvent.change(amounts[0], { target: { value: "3" } });
    fireEvent.change(labels[1], { target: { value: "Blair" } });
    fireEvent.change(payers[1], {
      target: { value: createdBill.slots[1].expectedPayerAddress },
    });
    fireEvent.change(amounts[1], { target: { value: "5" } });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Create participant payment links",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Bill created")).toBeVisible();
    });
    expect(
      screen.getAllByRole("button", { name: "Copy payment link" }),
    ).toHaveLength(2);
    expect(fetcher).toHaveBeenCalledWith(
      "/api/bills",
      expect.objectContaining({
        body: JSON.stringify({
          title: "Dinner",
          destinationAddress: createdBill.bill.destinationAddress,
          totalXrp: "10",
          creatorShareXrp: "2",
          participants: [
            {
              label: "Alex",
              expectedPayerAddress:
                createdBill.slots[0].expectedPayerAddress,
              amountXrp: "3",
            },
            {
              label: "Blair",
              expectedPayerAddress:
                createdBill.slots[1].expectedPayerAddress,
              amountXrp: "5",
            },
          ],
        }),
      }),
    );
  });
});
