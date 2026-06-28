import { describe, expect, it } from "vitest";

import {
  assertPaymentOperationAllowed,
  PaymentOperationsConfigurationError,
  PaymentOperationsHaltedError,
  resolvePaymentOperations,
} from "./payment-operations";

const NOW = new Date("2026-06-28T00:00:00.000Z");
const FUTURE = "2026-06-28T00:20:00.000Z";

function controlled(mode: "enabled" | "verify-only") {
  return {
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    MAINNET_RELEASE_MODE: "internal",
    MAINNET_OPERATIONS_MODE: mode,
    MAINNET_ACCEPTANCE_EXPIRES_AT: FUTURE,
  };
}

describe("resolvePaymentOperations", () => {
  it("keeps Testnet operational without Mainnet controls", () => {
    expect(resolvePaymentOperations({})).toEqual({
      network: "testnet",
      mode: "testnet",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    });
  });

  it("defaults an otherwise valid Mainnet identity to halted", () => {
    expect(
      resolvePaymentOperations({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
      }),
    ).toEqual({
      network: "mainnet",
      mode: "halted",
      creationEnabled: false,
      verificationEnabled: false,
      status: "halted",
    });
  });

  it("allows a time-bound verification-only window", () => {
    expect(resolvePaymentOperations(controlled("verify-only"), NOW)).toMatchObject({
      mode: "verify-only",
      creationEnabled: false,
      verificationEnabled: true,
      status: "verification-only",
    });
  });

  it("requires a time-bound internal window for full operation", () => {
    expect(resolvePaymentOperations(controlled("enabled"), NOW)).toMatchObject({
      mode: "enabled",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    });
  });

  it("automatically halts an expired internal window", () => {
    expect(
      resolvePaymentOperations(
        {
          ...controlled("enabled"),
          MAINNET_ACCEPTANCE_EXPIRES_AT: "2026-06-27T23:59:59.000Z",
        },
        NOW,
      ),
    ).toEqual({
      network: "mainnet",
      mode: "halted",
      creationEnabled: false,
      verificationEnabled: false,
      status: "halted",
    });
  });

  it("fails closed for a missing, oversized, or contaminated window", () => {
    expect(() =>
      resolvePaymentOperations(
        {
          APP_NETWORK: "mainnet",
          NEXT_PUBLIC_APP_NETWORK: "mainnet",
          MAINNET_RELEASE_MODE: "internal",
          MAINNET_OPERATIONS_MODE: "enabled",
        },
        NOW,
      ),
    ).toThrow(PaymentOperationsConfigurationError);

    expect(() =>
      resolvePaymentOperations(
        {
          ...controlled("enabled"),
          MAINNET_ACCEPTANCE_EXPIRES_AT: "2026-06-28T00:31:00.000Z",
        },
        NOW,
      ),
    ).toThrow(PaymentOperationsConfigurationError);

    expect(() =>
      resolvePaymentOperations({
        APP_NETWORK: "testnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
        MAINNET_ACCEPTANCE_EXPIRES_AT: FUTURE,
      }),
    ).toThrow(PaymentOperationsConfigurationError);
  });

  it("rejects network mismatch and invalid modes", () => {
    expect(() =>
      resolvePaymentOperations({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
      }),
    ).toThrow(PaymentOperationsConfigurationError);
    expect(() =>
      resolvePaymentOperations({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        MAINNET_OPERATIONS_MODE: "open",
      }),
    ).toThrow(PaymentOperationsConfigurationError);
  });
});

describe("assertPaymentOperationAllowed", () => {
  it("blocks both operations while Mainnet is halted", () => {
    const input = {
      APP_NETWORK: "mainnet",
      NEXT_PUBLIC_APP_NETWORK: "mainnet",
      MAINNET_OPERATIONS_MODE: "halted",
    };

    expect(() => assertPaymentOperationAllowed(input, "create")).toThrow(
      PaymentOperationsHaltedError,
    );
    expect(() => assertPaymentOperationAllowed(input, "verify")).toThrow(
      PaymentOperationsHaltedError,
    );
  });

  it("blocks creation but allows verification in a live verify-only window", () => {
    const input = controlled("verify-only");

    expect(() => assertPaymentOperationAllowed(input, "create", NOW)).toThrow(
      expect.objectContaining({
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "create",
        mode: "verify-only",
      }),
    );
    expect(assertPaymentOperationAllowed(input, "verify", NOW)).toMatchObject({
      verificationEnabled: true,
    });
  });

  it("blocks an operation after the internal window expires", () => {
    expect(() =>
      assertPaymentOperationAllowed(
        controlled("enabled"),
        "verify",
        new Date("2026-06-28T00:20:00.001Z"),
      ),
    ).toThrow(PaymentOperationsHaltedError);
  });
});
