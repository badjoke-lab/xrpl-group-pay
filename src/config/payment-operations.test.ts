import { describe, expect, it } from "vitest";

import {
  assertPaymentOperationAllowed,
  PaymentOperationsConfigurationError,
  PaymentOperationsHaltedError,
  resolvePaymentOperations,
} from "./payment-operations";

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

  it("allows verification-only draining without creating new requests", () => {
    expect(
      resolvePaymentOperations({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        MAINNET_OPERATIONS_MODE: "verify-only",
      }),
    ).toMatchObject({
      mode: "verify-only",
      creationEnabled: false,
      verificationEnabled: true,
      status: "verification-only",
    });
  });

  it("requires explicit enabled mode for full Mainnet operation", () => {
    expect(
      resolvePaymentOperations({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        MAINNET_OPERATIONS_MODE: "enabled",
      }),
    ).toMatchObject({
      mode: "enabled",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    });
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

  it("blocks creation but allows verification in verify-only mode", () => {
    const input = {
      APP_NETWORK: "mainnet",
      NEXT_PUBLIC_APP_NETWORK: "mainnet",
      MAINNET_OPERATIONS_MODE: "verify-only",
    };

    expect(() => assertPaymentOperationAllowed(input, "create")).toThrow(
      expect.objectContaining({
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "create",
        mode: "verify-only",
      }),
    );
    expect(assertPaymentOperationAllowed(input, "verify")).toMatchObject({
      verificationEnabled: true,
    });
  });
});
