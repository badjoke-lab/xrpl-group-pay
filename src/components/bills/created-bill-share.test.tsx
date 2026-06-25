import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CREATED_BILL_FIXTURE } from "@/test/fixtures/bill-review";

import { CreatedBillShare } from "./created-bill-share";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreatedBillShare", () => {
  it("shows Asset amounts and copies the available links", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <CreatedBillShare created={CREATED_BILL_FIXTURE} onReset={vi.fn()} />,
    );

    expect(screen.getByText("10 XRP")).toBeVisible();
    expect(screen.getByText("3 XRP")).toBeVisible();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy creator progress link" }),
    );
    expect(writeText).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Copy payment link" })[0],
    );
    expect(writeText).toHaveBeenCalledTimes(2);
  });

  it("returns to bill creation", () => {
    const onReset = vi.fn();
    render(
      <CreatedBillShare created={CREATED_BILL_FIXTURE} onReset={onReset} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create another bill" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
