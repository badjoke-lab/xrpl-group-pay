import { createHash, timingSafeEqual } from "node:crypto";

import { resolvePaymentOperations } from "./payment-operations";

const TOKEN_HEADER = "x-xrpl-mainnet-acceptance";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export class MainnetInternalAuthorizationError extends Error {
  readonly code = "MAINNET_INTERNAL_AUTH_REQUIRED" as const;

  constructor() {
    super("The internal Mainnet operation is not available.");
    this.name = "MainnetInternalAuthorizationError";
  }
}

export class MainnetInternalAuthorizationConfigurationError extends Error {
  constructor() {
    super("The internal Mainnet authorization boundary is not configured safely.");
    this.name = "MainnetInternalAuthorizationConfigurationError";
  }
}

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function assertMainnetInternalAuthorization(
  input: Record<string, string | undefined>,
  headers: Headers,
) {
  const operations = resolvePaymentOperations(input);
  if (operations.network === "testnet") return operations;

  if (input.MAINNET_RELEASE_MODE !== "internal") {
    throw new MainnetInternalAuthorizationConfigurationError();
  }

  const expectedHex = input.MAINNET_ACCEPTANCE_TOKEN_SHA256?.trim().toLowerCase();
  if (!expectedHex || !SHA256_PATTERN.test(expectedHex)) {
    throw new MainnetInternalAuthorizationConfigurationError();
  }

  const supplied = headers.get(TOKEN_HEADER)?.trim();
  if (!supplied) throw new MainnetInternalAuthorizationError();

  const actual = digest(supplied);
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new MainnetInternalAuthorizationError();
  }

  return operations;
}

export function mainnetAcceptanceTokenDigest(token: string) {
  if (token.length < 32) {
    throw new Error("The Mainnet acceptance token must contain at least 32 characters.");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}
