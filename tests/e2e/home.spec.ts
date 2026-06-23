import { expect, test } from "@playwright/test";

test("renders the product foundation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Split the cost/i })).toBeVisible();
  await expect(page.getByText("Testnet", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Group Pay never holds your funds")).toBeVisible();
});

test("renders the Xaman Testnet payment vertical slice", async ({ page }) => {
  await page.goto("/testnet/payment");

  await expect(
    page.getByRole("heading", { name: /Send one XRP Payment through Xaman/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Recipient XRPL address")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to Xaman" }),
  ).toBeVisible();
  await expect(page.getByText("Testnet", { exact: true }).first()).toBeVisible();
});

test("exposes a no-store health endpoint", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(response.headers()["cache-control"]).toContain("no-store");
  await expect(response.json()).resolves.toMatchObject({
    status: "ok",
    service: "xrpl-group-pay",
    network: "testnet",
  });
});
