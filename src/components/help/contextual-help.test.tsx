import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LocalizationProvider } from "@/features/localization/provider";

import { ContextualHelp } from "./contextual-help";

afterEach(cleanup);

describe("ContextualHelp", () => {
  it("opens and closes without discarding current input", () => {
    render(
      <LocalizationProvider initialLocale="en">
        <label>
          Draft title
          <input defaultValue="Dinner draft" />
        </label>
        <ContextualHelp topic="overview" />
      </LocalizationProvider>,
    );

    const input = screen.getByLabelText("Draft title") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Edited dinner draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Help" }));

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(input.value).toBe("Edited dinner draft");

    fireEvent.click(screen.getByRole("button", { name: "Close help" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(input.value).toBe("Edited dinner draft");
    expect(screen.getByRole("button", { name: "Help" })).toHaveFocus();
  });

  it("opens only a fixed public Guide target in a protected tab", () => {
    render(
      <LocalizationProvider initialLocale="ja">
        <ContextualHelp topic="capability-privacy" />
      </LocalizationProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "ヘルプ" }));
    const link = screen.getByRole("link", { name: "完全版ガイドを開く" });

    expect(link).toHaveAttribute("href", "/guide#privacy");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(link.getAttribute("href")).not.toContain("token=");
  });

  it("closes on Escape", () => {
    render(
      <LocalizationProvider initialLocale="ko">
        <ContextualHelp topic="payment-status" />
      </LocalizationProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "도움말" }));
    expect(screen.getByRole("dialog")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
