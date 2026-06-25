import { describe, expect, it } from "vitest";

import {
  DeploymentGateError,
  resolveDeploymentTarget,
} from "./deployment-gate";

describe("resolveDeploymentTarget", () => {
  it("defaults to a legacy-compatible Testnet target", () => {
    expect(resolveDeploymentTarget({})).toEqual({
      network: "testnet",
      publicNetwork: "testnet",
      databaseBinding: "PAYMENTS_DB",
      sourceTag: null,
      mainnetReleaseMode: "disabled",
      mainnetOperationsMode: "halted",
      mainnetRuntimeAllowed: false,
      mainnetGateApproved: false,
    });
  });

  it("rejects public and server network mismatches", () => {
    expect(() =>
      resolveDeploymentTarget({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
      }),
    ).toThrow(DeploymentGateError);
  });

  it("prevents Testnet from selecting the Mainnet D1 binding", () => {
    expect(() =>
      resolveDeploymentTarget({
        APP_NETWORK: "testnet",
        NEXT_PUBLIC_APP_NETWORK: "testnet",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
      }),
    ).toThrow(
      "A Testnet deployment cannot use the Mainnet payment database binding.",
    );
  });

  it.each([
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
      },
      "ALLOW_MAINNET_RUNTIME=true",
    ],
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
      },
      "MAINNET_GATE_APPROVED=true",
    ],
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
      },
      "MAINNET_RELEASE_MODE=disabled",
    ],
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
      },
      "PAYMENTS_DB_MAINNET",
    ],
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
      },
      "MAINNET_SOURCE_TAG_APPROVED=true",
    ],
    [
      {
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        MAINNET_SOURCE_TAG_APPROVED: "true",
      },
      "XRPL_MAINNET_SOURCE_TAG",
    ],
  ])("fails closed for incomplete Mainnet configuration", (input, message) => {
    expect(() => resolveDeploymentTarget(input)).toThrow(message);
  });

  it("accepts a halted Mainnet deployment target for incident response", () => {
    expect(
      resolveDeploymentTarget({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_SOURCE_TAG_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        MAINNET_OPERATIONS_MODE: "halted",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        XRPL_MAINNET_SOURCE_TAG: "123",
      }),
    ).toMatchObject({
      network: "mainnet",
      mainnetOperationsMode: "halted",
    });
  });

  it("accepts Mainnet only with every runtime gate, Source Tag, and isolated D1 binding", () => {
    expect(
      resolveDeploymentTarget({
        APP_NETWORK: "mainnet",
        NEXT_PUBLIC_APP_NETWORK: "mainnet",
        ALLOW_MAINNET_RUNTIME: "true",
        MAINNET_GATE_APPROVED: "true",
        MAINNET_SOURCE_TAG_APPROVED: "true",
        MAINNET_RELEASE_MODE: "internal",
        MAINNET_OPERATIONS_MODE: "enabled",
        PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
        XRPL_MAINNET_SOURCE_TAG: "123",
      }),
    ).toEqual({
      network: "mainnet",
      publicNetwork: "mainnet",
      databaseBinding: "PAYMENTS_DB_MAINNET",
      sourceTag: 123,
      mainnetReleaseMode: "internal",
      mainnetOperationsMode: "enabled",
      mainnetRuntimeAllowed: true,
      mainnetGateApproved: true,
    });
  });
});
