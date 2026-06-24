import { expect, test } from "@playwright/test";

test("renders the product foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /Split the cost/i }),
  ).toBeVisible();
  await expect(page.getByText("Testnet", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Group Pay never holds your funds")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create a Testnet bill" })).toBeVisible();
});

test("renders the shared bill creator", async ({ page }) => {
  await page.goto("/testnet/bill");

  await expect(
    page.getByRole("heading", { level: 1, name: /Create one bill/i }),
  ).toBeVisible();
  await expect(page.getByLabel("Bill title")).toBeVisible();
  await expect(page.getByText("Participant 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Participant 2", { exact: true })).toBeVisible();
});

test("renders a capability-bound participant payment", async ({ page }) => {
  await page.goto(`/testnet/payment#token=${"a".repeat(64)}`);

  await expect(
    page.getByRole("heading", { level: 1, name: /Review your share/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to Xaman" }),
  ).toBeVisible();
  await expect(page.getByLabel("Recipient XRPL address")).toHaveCount(0);
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
