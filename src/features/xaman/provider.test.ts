import { describe, expect, it } from "vitest";
import { XAMAN_PROVIDER_CAPABILITIES } from "./provider";

describe("Xaman provider capabilities", () => {
  it("declares the current boundary", () => {
    expect(XAMAN_PROVIDER_CAPABILITIES.networks).toEqual(["testnet"]);
    expect(XAMAN_PROVIDER_CAPABILITIES.assetTypes).toEqual(["native"]);
  });
});
