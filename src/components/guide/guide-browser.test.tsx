import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getGuideContent } from "@/features/guide/guide-content";

import { GuideBrowser } from "./guide-browser";

afterEach(cleanup);

describe("GuideBrowser", () => {
  it("filters complete Guide sections without changing stable anchors", () => {
    render(<GuideBrowser content={getGuideContent("en")} />);

    const search = screen.getByRole("searchbox", { name: "Search the Guide" });
    fireEvent.change(search, { target: { value: "TrustSet" } });

    expect(
      screen.getByRole("heading", {
        name: "Official RLUSD TrustSet preparation",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", {
        name: "Official RLUSD TrustSet preparation",
      }),
    ).toHaveAttribute("href", "#trustset");
    expect(
      screen.queryByRole("heading", { name: "Bill and payer progress" }),
    ).toBeNull();
  });

  it("shows a recoverable no-results state", () => {
    render(<GuideBrowser content={getGuideContent("ja")} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "ガイドを検索" }), {
      target: { value: "一致しない検索語" },
    });
    expect(
      screen.getByRole("heading", { name: "一致するガイド項目がありません" }),
    ).toBeVisible();

    const clearControls = screen.getAllByRole("button", { name: "検索をクリア" });
    fireEvent.click(clearControls.at(-1)!);
    expect(
      screen.getByRole("heading", { name: "目的と非カストディ型の仕組み" }),
    ).toBeVisible();
  });

  it("supports slash focus and Escape clear behavior", () => {
    render(<GuideBrowser content={getGuideContent("ko")} />);
    const search = screen.getByRole("searchbox", { name: "가이드 검색" });

    fireEvent.keyDown(document, { key: "/" });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "RLUSD" } });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(search).toHaveValue("");
    expect(search).not.toHaveFocus();
  });
});
