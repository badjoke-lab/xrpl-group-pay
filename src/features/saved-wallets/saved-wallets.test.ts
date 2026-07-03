import { describe, expect, it } from "vitest";

import {
  mergeSavedWalletRoles,
  parseSavedWalletImport,
  SAVED_WALLET_MAX_RECORDS,
  SavedWalletStorageError,
  serializeSavedWalletExport,
  validateSavedWalletDraft,
  type SavedWalletRecord,
} from "./saved-wallets";

const address = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";
const secondAddress = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
const timestamp = "2026-07-03T00:00:00.000Z";

function record(overrides: Partial<SavedWalletRecord> = {}): SavedWalletRecord {
  return {
    id: "wallet-1",
    label: "Alex",
    classicAddress: address,
    destinationTag: "123",
    role: "recipient",
    network: "mainnet",
    favorite: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastUsedAt: null,
    ...overrides,
  };
}

describe("saved wallet schema", () => {
  it("normalizes approved fields and accepts a recipient tag", () => {
    expect(
      validateSavedWalletDraft({
        label: "  Alex  ",
        classicAddress: `  ${address}  `,
        destinationTag: "123",
        role: "recipient",
        network: "mainnet",
        favorite: false,
      }),
    ).toEqual({
      label: "Alex",
      classicAddress: address,
      destinationTag: "123",
      role: "recipient",
      network: "mainnet",
      favorite: false,
    });
  });

  it("rejects malformed addresses and payer-only Destination Tags", () => {
    expect(() =>
      validateSavedWalletDraft({
        label: "Alex",
        classicAddress: "not-an-address",
        destinationTag: null,
        role: "payer",
        network: "mainnet",
        favorite: false,
      }),
    ).toThrow(SavedWalletStorageError);

    expect(() =>
      validateSavedWalletDraft({
        label: "Alex",
        classicAddress: address,
        destinationTag: "1",
        role: "payer",
        network: "mainnet",
        favorite: false,
      }),
    ).toThrow("Payer-only records cannot store a Destination Tag");
  });

  it("merges recipient and payer reuse into a both-role record", () => {
    expect(mergeSavedWalletRoles("recipient", "payer")).toBe("both");
    expect(mergeSavedWalletRoles("both", "payer")).toBe("both");
    expect(mergeSavedWalletRoles("recipient", "recipient")).toBe("recipient");
  });
});

describe("saved wallet import and export", () => {
  it("round-trips only the approved address-book fields", () => {
    const text = serializeSavedWalletExport([record()], timestamp);
    const parsed = parseSavedWalletImport(text);

    expect(parsed).toEqual({
      schemaVersion: 1,
      exportedAt: timestamp,
      wallets: [record()],
    });
    expect(text).not.toContain("capability");
    expect(text).not.toContain("billId");
    expect(text).not.toContain("paymentToken");
    expect(text).not.toContain("invoiceId");
    expect(text).not.toContain("transactionHash");
  });

  it("rejects duplicate network and address pairs", () => {
    const duplicate = JSON.stringify({
      schemaVersion: 1,
      exportedAt: timestamp,
      wallets: [record(), record({ id: "wallet-2", label: "Duplicate" })],
    });

    expect(() => parseSavedWalletImport(duplicate)).toThrow(
      "duplicate network and address pairs",
    );
  });

  it("allows the same address on separate networks and rejects excessive imports", () => {
    const separateNetworks = JSON.stringify({
      schemaVersion: 1,
      exportedAt: timestamp,
      wallets: [record(), record({ id: "wallet-2", network: "testnet" })],
    });
    expect(parseSavedWalletImport(separateNetworks).wallets).toHaveLength(2);

    const tooMany = JSON.stringify({
      schemaVersion: 1,
      exportedAt: timestamp,
      wallets: Array.from({ length: SAVED_WALLET_MAX_RECORDS + 1 }, (_, index) =>
        record({
          id: `wallet-${index}`,
          classicAddress: index === 0 ? address : secondAddress,
        }),
      ),
    });

    let error: unknown;
    try {
      parseSavedWalletImport(tooMany);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SavedWalletStorageError);
    expect(error).toMatchObject({ code: "too_many_records" });
  });

  it("rejects unknown fields by never serializing them", () => {
    const unsafe = {
      ...record(),
      capability: "secret",
      billId: "bill-secret",
    };
    const text = serializeSavedWalletExport([unsafe], timestamp);
    expect(text).not.toContain("secret");
  });
});
