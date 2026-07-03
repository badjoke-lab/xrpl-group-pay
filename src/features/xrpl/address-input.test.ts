import { classicAddressToXAddress } from "xrpl";
import { describe, expect, it } from "vitest";

import {
  inspectXrplAddressInput,
  isCanonicalClassicAddress,
} from "./address-input";

const account = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

describe("XRPL address input inspection", () => {
  it("accepts a valid Classic Address without rewriting it", () => {
    expect(isCanonicalClassicAddress(account)).toBe(true);
    expect(
      inspectXrplAddressInput({
        value: `  ${account}  `,
        network: "mainnet",
        role: "recipient",
      }),
    ).toMatchObject({
      status: "valid_classic",
      classicAddress: account,
      encodedNetwork: "mainnet",
    });
  });

  it("rejects malformed Classic Addresses", () => {
    expect(isCanonicalClassicAddress(`${account.slice(0, -1)}x`)).toBe(false);
    expect(
      inspectXrplAddressInput({
        value: "not-an-xrpl-address",
        network: "mainnet",
        role: "payer",
      }).status,
    ).toBe("invalid");
  });

  it("decodes a recipient X-address and requires review", () => {
    const xAddress = classicAddressToXAddress(account, 123, true);
    expect(
      inspectXrplAddressInput({
        value: xAddress,
        network: "testnet",
        role: "recipient",
      }),
    ).toMatchObject({
      status: "xaddress_review",
      classicAddress: account,
      destinationTag: "123",
      encodedNetwork: "testnet",
    });
  });

  it("blocks an X-address from a different network", () => {
    const xAddress = classicAddressToXAddress(account, false, true);
    expect(
      inspectXrplAddressInput({
        value: xAddress,
        network: "mainnet",
        role: "recipient",
      }).status,
    ).toBe("network_mismatch");
  });

  it("rejects an embedded Destination Tag in a payer X-address", () => {
    const xAddress = classicAddressToXAddress(account, 55, false);
    expect(
      inspectXrplAddressInput({
        value: xAddress,
        network: "mainnet",
        role: "payer",
      }).status,
    ).toBe("payer_tag_not_allowed");
  });

  it("rejects a recipient X-address that conflicts with an entered tag", () => {
    const xAddress = classicAddressToXAddress(account, 55, false);
    expect(
      inspectXrplAddressInput({
        value: xAddress,
        network: "mainnet",
        role: "recipient",
        destinationTag: "99",
      }).status,
    ).toBe("destination_tag_conflict");
  });
});
