import { expect, test } from "@playwright/test";

test("renders the product foundation", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: /Split the cost/i }),
  ).toBeVisible();
  await expect(page.getByText("Testnet", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Group Pay never holds your funds")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a Testnet bill" }),
  ).toBeVisible();
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

test("renders capability-bound bill progress", async ({ page }) => {
  await page.route("**/api/bills/progress", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access: "admin",
        bill: {
          publicId: "00000000-0000-4000-8000-000000000001",
          title: "XRPL Meetup Dinner",
          network: "testnet",
          destinationAddress: "rDestination",
          destinationTag: null,
          totalDrops: "10000000",
          creatorShareDrops: "2000000",
          status: "partially_paid",
          revision: 1,
          frozenAt: "2026-06-24T00:00:00.000Z",
          updatedAt: "2026-06-24T00:05:00.000Z",
        },
        summary: {
          participantCount: 2,
          paidCount: 1,
          pendingCount: 1,
          reviewCount: 0,
          expectedExternalDrops: "8000000",
          paidDrops: "3000000",
        },
        slots: [
          {
            publicId: "00000000-0000-4000-8000-000000000002",
            participantLabel: "Alex",
            expectedPayerAddress: "rAlex",
            expectedAmountDrops: "3000000",
            invoiceId: "A".repeat(64),
            status: "paid",
            paidTransactionId: "B".repeat(64),
            paidLedgerIndex: 12345,
            paidAt: "2026-06-24T00:05:00.000Z",
            updatedAt: "2026-06-24T00:05:00.000Z",
          },
          {
            publicId: "00000000-0000-4000-8000-000000000003",
            participantLabel: "Blair",
            expectedPayerAddress: "rBlair",
            expectedAmountDrops: "5000000",
            invoiceId: "C".repeat(64),
            status: "unpaid",
            paidTransactionId: null,
            paidLedgerIndex: null,
            paidAt: null,
            updatedAt: "2026-06-24T00:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.goto(`/testnet/bill/progress#token=${"a".repeat(64)}`);

  await expect(
    page.getByRole("heading", { level: 1, name: /Follow every participant/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "XRPL Meetup Dinner" }),
  ).toBeVisible();
  await expect(page.getByText("Creator view")).toBeVisible();
  await expect(page.getByText("1/2 paid")).toBeVisible();
  await expect(page.getByText("Alex")).toBeVisible();
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
