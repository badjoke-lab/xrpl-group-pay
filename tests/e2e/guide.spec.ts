import { expect, test } from "@playwright/test";

test("searches the complete Guide while preserving stable anchors", async ({ page }) => {
  await page.goto("/guide");

  await expect(
    page.getByRole("heading", { level: 1, name: "How XRPL Group Pay works" }),
  ).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search the Guide" });
  await expect(search).toBeVisible();

  await search.fill("TrustSet");
  await expect(
    page.getByRole("heading", { name: "Official RLUSD TrustSet preparation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Official RLUSD TrustSet preparation" }),
  ).toHaveAttribute("href", "#trustset");
  await expect(
    page.getByRole("heading", { name: "Bill and payer progress" }),
  ).toHaveCount(0);
});

test("supports Guide search keyboard entry and recovery", async ({ page }) => {
  await page.goto("/guide");

  await page.keyboard.press("/");
  const search = page.getByRole("searchbox", { name: "Search the Guide" });
  await expect(search).toBeFocused();
  await search.fill("term-that-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "No Guide section matched" }),
  ).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(search).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Purpose and non-custodial behavior" }),
  ).toBeVisible();
});

test("keeps localized Guide anchors key-identical", async ({ page }) => {
  await page.goto("/guide");
  await page.getByRole("combobox", { name: "Language" }).selectOption("ja");

  await expect(
    page.getByRole("heading", { level: 1, name: "XRPL Group Payの仕組み" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "未完了として請求を終了" }),
  ).toHaveAttribute("href", "#incomplete-closure");
  await expect(
    page.getByRole("link", { name: "固定済み請求をコピーして修正" }),
  ).toHaveAttribute("href", "#copy-to-revise");
});
