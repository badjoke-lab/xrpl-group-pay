import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { classicAddressToXAddress } from "xrpl";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocalizationProvider } from "@/features/localization/provider";

import { XrplAddressField } from "./xrpl-address-field";

const account = "rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe";

function RecipientHarness({ initialValue = "" }: { initialValue?: string }) {
  const [address, setAddress] = useState(initialValue);
  const [tag, setTag] = useState("");
  return (
    <LocalizationProvider initialLocale="en">
      <XrplAddressField
        label="Recipient XRPL address"
        value={address}
        destinationTag={tag}
        role="recipient"
        network="testnet"
        onChangeAddress={setAddress}
        onChangeDestinationTag={setTag}
      />
      <div data-testid="canonical-address">{address}</div>
      <div data-testid="destination-tag">{tag}</div>
    </LocalizationProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("XrplAddressField", () => {
  it("requires explicit confirmation before applying a decoded X-address", () => {
    const xAddress = classicAddressToXAddress(account, 123, true);
    render(<RecipientHarness initialValue={xAddress} />);

    expect(screen.getByText("X-address decoded")).toBeVisible();
    expect(screen.getByTestId("canonical-address")).toHaveTextContent(xAddress);
    expect(screen.getByTestId("destination-tag")).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "Use decoded address" }));

    expect(screen.getByTestId("canonical-address")).toHaveTextContent(account);
    expect(screen.getByTestId("destination-tag")).toHaveTextContent("123");
    expect(screen.queryByText("X-address decoded")).toBeNull();
  });

  it("reads the clipboard only after the paste button is activated", async () => {
    const readText = vi.fn().mockResolvedValue(`  ${account}  `);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText },
    });

    render(<RecipientHarness />);
    expect(readText).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Paste" }));

    await waitFor(() => expect(readText).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("canonical-address")).toHaveTextContent(account);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Address pasted and checked.",
    );
  });

  it("keeps direct entry available when clipboard access fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    render(<RecipientHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Clipboard access failed. You can still type or paste directly.",
      ),
    );

    fireEvent.change(screen.getByLabelText("Recipient XRPL address"), {
      target: { value: account },
    });
    expect(screen.getByTestId("canonical-address")).toHaveTextContent(account);
  });

  it("rejects a tagged payer X-address with localized guidance", () => {
    const tagged = classicAddressToXAddress(account, 55, false);
    render(
      <LocalizationProvider initialLocale="ja">
        <XrplAddressField
          label="支払者XRPLアドレス"
          value={tagged}
          role="payer"
          network="mainnet"
          onChangeAddress={() => undefined}
        />
      </LocalizationProvider>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "支払者アドレスにDestination Tagを含めることはできません。",
    );
  });
});
