import { describe, expect, it } from "vitest";

import { buildMainnetSignInAttestation } from "./mainnet-xaman-attestation-core.mjs";

describe("Mainnet Xaman SignIn attestation request", () => {
  it("uses the documented minimal Mainnet-forced request shape", () => {
    expect(buildMainnetSignInAttestation()).toEqual({
      txjson: { TransactionType: "SignIn" },
      options: { force_network: "MAINNET" },
    });
  });

  it("never constructs a Payment transaction or submission option", () => {
    const request = buildMainnetSignInAttestation();
    expect(request.txjson.TransactionType).not.toBe("Payment");
    expect(request.options).not.toHaveProperty("submit");
    expect(request).not.toHaveProperty("custom_meta");
  });
});
