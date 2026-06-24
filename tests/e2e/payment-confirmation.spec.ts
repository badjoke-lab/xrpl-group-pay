import { expect, test } from "@playwright/test";

test("requires final confirmation before Xaman handoff", async ({ page }) => {
  const paymentToken = "a".repeat(64);
  const invoiceId = "AB".repeat(32);

  await page.route("**/api/payments/details", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        billTitle: "XRPL Meetup Dinner",
        participantLabel: "Alex",
        expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
        destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
        destinationTag: null,
        amountDrops: "4000000",
        sourceTag: 123456,
        invoiceId,
        network: "testnet",
      }),
    });
  });

  await page.goto(`/testnet/payment#token=${paymentToken}`);

  await expect(
    page.getByRole("heading", { name: "XRPL Meetup Dinner" }),
  ).toBeVisible();
  await expect(page.getByText(/4\s+XRP/)).toBeVisible();
  await expect(page.getByLabel("Recipient XRPL address")).toHaveCount(0);

  await page.getByRole("button", { name: "Review final payment" }).click();
  await expect(
    page.getByRole("heading", { name: "Confirm the exact Testnet payment" }),
  ).toBeVisible();
  await expect(page.getByText(invoiceId)).toBeVisible();
  await expect(page.getByText("123456", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Xaman Sign Request" }),
  ).toBeVisible();
});
