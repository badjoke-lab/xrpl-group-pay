import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TestnetTransactionProof } from "./testnet-transaction-proof";

afterEach(cleanup);

describe("TestnetTransactionProof", () => {
  it("shows an invalid-link state", () => {
    render(<TestnetTransactionProof proofToken="invalid" />);
    expect(
      screen.getByRole("heading", { name: "Transaction proof unavailable" }),
    ).toBeVisible();
  });
});
