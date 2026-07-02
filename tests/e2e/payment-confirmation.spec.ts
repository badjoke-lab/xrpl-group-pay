import { expect, test } from "@playwright/test";

test("requires final confirmation before Xaman handoff", async ({ page }) => {
  const paymentToken = "a".repeat(64);
  const invoiceId = "AB".repeat(32);
  const payer = "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh";
  const recipient = "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY";

  await page.route("**/api/payments/details", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        billTitle: "XRPL Meetup Dinner",
        participantLabel: "Alex",
        expectedPayerAddress: payer,
        destinationAddress: recipient,
        destinationTag: null,
        amountDrops: "4000000",
        sourceTag: 123456,
        invoiceId,
        network: "testnet",
      }),
    });
  });

  await page.route("**/api/payments/readiness", async (route) => {
    const assessment = (
      role: "payer" | "recipient",
      account: string,
    ) => ({
      strategyId: "xrpl-asset-readiness-v1",
      role,
      status: "ready",
      ready: true,
      network: "testnet",
      account,
      assetId: "xrpl:testnet:xrp",
      amountUnits: "4000000",
      checks: [
        { code: "account_exists", status: "pass" },
        { code: "spendable_xrp", status: "pass" },
        { code: "native_balance", status: "pass" },
      ],
      blockingCode: null,
      unavailableCode: null,
      userMessageKey: `readiness.${role}.ready`,
      observedAt: "2026-07-02T00:00:00.000Z",
      facts: {
        balanceDrops: "50000000",
        reserveDrops: "10000000",
        spendableXrpDrops: "40000000",
        requiredXrpDrops: "4000012",
        estimatedFeeDrops: "12",
        issuedBalance: null,
        trustLineChecked: false,
      },
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        payer: assessment("payer", payer),
        recipient: assessment("recipient", recipient),
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
