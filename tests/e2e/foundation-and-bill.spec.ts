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

test("reviews a shared bill before freezing it", async ({ page }) => {
  await page.route("**/api/bills/review", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        network: "testnet",
        title: "Dinner",
        destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
        destinationTag: null,
        totalDrops: "10000000",
        creatorShareDrops: "2000000",
        allocatedDrops: "10000000",
        participants: [
          {
            participantLabel: "Alex",
            expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            expectedAmountDrops: "3000000",
          },
          {
            participantLabel: "Blair",
            expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
            expectedAmountDrops: "5000000",
          },
        ],
      }),
    });
  });

  await page.goto("/testnet/bill");
  await page.getByLabel("Bill title").fill("Dinner");
  await page
    .getByLabel("Creator destination address")
    .fill("rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY");
  await page.getByPlaceholder("10").fill("10");
  await page.getByPlaceholder("2").fill("2");

  const labels = page.getByLabel("Label");
  const payers = page.getByLabel("Expected payer address");
  const amounts = page.getByPlaceholder("4");
  await labels.nth(0).fill("Alex");
  await payers.nth(0).fill("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
  await amounts.nth(0).fill("3");
  await labels.nth(1).fill("Blair");
  await payers.nth(1).fill("rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH");
  await amounts.nth(1).fill("5");

  await expect(page.getByText("Allocation exact")).toBeVisible();
  await page.getByRole("button", { name: "Review bill before freezing" }).click();
  await expect(
    page.getByRole("heading", { name: "Review before freezing" }),
  ).toBeVisible();
  await expect(page.getByText("No funds move when the Bill is created")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Freeze bill and create payment links" }),
  ).toBeVisible();
});
