import { describe, expect, it } from "vitest";

import { buildMainnetSignInAttestation } from "./mainnet-xaman-attestation-core.mjs";

describe("Mainnet Xaman SignIn attestation request", () => {
  it("is Mainnet-forced, short-lived, and incapable of ledger submission", () => {
    expect(
      buildMainnetSignInAttestation(
        "xrpl-group-pay-mainnet-123",
        "Provider attestation",
      ),
    ).toEqual({
      txjson: { TransactionType: "SignIn" },
      options: {
        submit: false,
        expire: 1,
        force_network: "MAINNET",
      },
      custom_meta: {
        identifier: "xrpl-group-pay-mainnet-123",
        instruction: "Provider attestation",
      },
    });
  });

  it("never constructs a Payment transaction", () => {
    const request = buildMainnetSignInAttestation("id", "instruction");
    expect(request.txjson.TransactionType).not.toBe("Payment");
    expect(request.options.submit).toBe(false);
  });
});
