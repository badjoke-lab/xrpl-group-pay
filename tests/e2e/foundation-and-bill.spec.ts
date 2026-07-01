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

test("shows natural Japanese copy and allows RLUSD selection", async ({ page }) => {
  await page.goto("/bill");
  await page.getByRole("combobox", { name: "Language" }).selectOption("ja");

  await expect(
    page.getByRole("heading", { level: 1, name: "割り勘の内容を入力" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "請求を作成" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "請求内容" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "分け方と参加者" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "入力内容の確認" }),
  ).toBeVisible();
  await expect(page.getByText("共同請求を作成", { exact: true })).toHaveCount(0);
  await expect(page.getByText("配分と参加者", { exact: true })).toHaveCount(0);
  await expect(page.getByText("確認準備", { exact: true })).toHaveCount(0);

  const rlusdInput = page.locator(
    'input[name="settlementAsset"][value$=":rlusd"]',
  );
  const rlusdCard = page.locator("label").filter({ has: rlusdInput });
  await rlusdCard.click();
  await expect(rlusdInput).toBeChecked();
  await expect(
    page.getByText(/RLUSDを受け取るアカウントにはRLUSDのトラストラインが必要です/),
  ).toBeVisible();

  const totalInput = page.getByLabel("合計額");
  const creatorInput = page.getByLabel("作成者の負担");
  await expect(totalInput).toBeVisible();
  await expect(creatorInput).toBeVisible();
  await expect(totalInput.locator("xpath=following-sibling::span")).toHaveText(
    "RLUSD",
  );
  await expect(creatorInput.locator("xpath=following-sibling::span")).toHaveText(
    "RLUSD",
  );
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

  await page.getByText("Participant 2", { exact: true }).click();
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
