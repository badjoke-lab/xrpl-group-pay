import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LocalizationProvider } from "@/features/localization/provider";
import {
  SavedWalletStorageError,
  type SavedWalletRecord,
} from "@/features/saved-wallets/saved-wallets";

import { SavedWalletPicker } from "./saved-wallet-picker";

const mocks = vi.hoisted(() => ({
  listSavedWallets: vi.fn(),
  markSavedWalletUsed: vi.fn(),
  saveSavedWallet: vi.fn(),
  deleteSavedWallet: vi.fn(),
  clearSavedWallets: vi.fn(),
  importSavedWallets: vi.fn(),
}));

vi.mock("@/features/saved-wallets/saved-wallets", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/features/saved-wallets/saved-wallets")
  >();
  return {
    ...original,
    listSavedWallets: mocks.listSavedWallets,
    markSavedWalletUsed: mocks.markSavedWalletUsed,
    saveSavedWallet: mocks.saveSavedWallet,
    deleteSavedWallet: mocks.deleteSavedWallet,
    clearSavedWallets: mocks.clearSavedWallets,
    importSavedWallets: mocks.importSavedWallets,
  };
});

const recipient: SavedWalletRecord = {
  id: "saved-recipient",
  label: "Meetup venue",
  classicAddress: "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe",
  destinationTag: "321",
  role: "recipient",
  network: "mainnet",
  favorite: true,
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
  lastUsedAt: null,
};

beforeEach(() => {
  mocks.listSavedWallets.mockReset();
  mocks.markSavedWalletUsed.mockReset();
  mocks.saveSavedWallet.mockReset();
  mocks.deleteSavedWallet.mockReset();
  mocks.clearSavedWallets.mockReset();
  mocks.importSavedWallets.mockReset();
  mocks.listSavedWallets.mockResolvedValue([recipient]);
  mocks.markSavedWalletUsed.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SavedWalletPicker", () => {
  it("selects a same-network, same-role saved wallet", async () => {
    const onSelect = vi.fn();
    render(
      <LocalizationProvider initialLocale="en">
        <SavedWalletPicker
          role="recipient"
          network="mainnet"
          currentLabel=""
          currentAddress=""
          currentDestinationTag=""
          onSelect={onSelect}
        />
      </LocalizationProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Choose saved wallet" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Meetup venue" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Use this wallet" }));

    await waitFor(() =>
      expect(mocks.markSavedWalletUsed).toHaveBeenCalledWith("saved-recipient"),
    );
    expect(onSelect).toHaveBeenCalledWith(recipient);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("filters records by network and field role", async () => {
    mocks.listSavedWallets.mockResolvedValue([
      recipient,
      { ...recipient, id: "testnet", network: "testnet", label: "Testnet" },
      { ...recipient, id: "payer", role: "payer", label: "Payer only" },
    ]);

    render(
      <LocalizationProvider initialLocale="en">
        <SavedWalletPicker
          role="recipient"
          network="mainnet"
          currentLabel=""
          currentAddress=""
          onSelect={() => undefined}
        />
      </LocalizationProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Choose saved wallet" }),
    );

    expect(await screen.findByText("Meetup venue")).toBeVisible();
    expect(screen.queryByText("Testnet")).toBeNull();
    expect(screen.queryByText("Payer only")).toBeNull();
  });

  it("shows local-storage failure without removing direct-entry capability", async () => {
    mocks.listSavedWallets.mockRejectedValue(
      new SavedWalletStorageError("unavailable", "unavailable"),
    );

    render(
      <LocalizationProvider initialLocale="ja">
        <SavedWalletPicker
          role="payer"
          network="mainnet"
          currentLabel="田中"
          currentAddress="rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe"
          onSelect={() => undefined}
        />
      </LocalizationProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "保存済みから選ぶ" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "アドレスの直接入力は引き続き使えます",
    );
    expect(
      screen.getByRole("button", { name: "このウォレットを保存" }),
    ).toBeEnabled();
  });

  it("returns focus to the trigger when the panel closes", async () => {
    render(
      <LocalizationProvider initialLocale="en">
        <SavedWalletPicker
          role="recipient"
          network="mainnet"
          currentLabel=""
          currentAddress=""
          onSelect={() => undefined}
        />
      </LocalizationProvider>,
    );
    const trigger = screen.getByRole("button", { name: "Choose saved wallet" });
    fireEvent.click(trigger);
    await screen.findByRole("dialog");
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
