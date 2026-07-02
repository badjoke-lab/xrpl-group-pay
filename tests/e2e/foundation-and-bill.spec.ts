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
  await expect(
    page.getByRole("heading", { name: "受取人と各支払者の負担額を設定" }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "参加者は誰に支払いますか？" }),
  ).toBeVisible();

  await page.getByRole("radio", { name: /代表者へ支払う/ }).click();
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(
    page.getByRole("heading", { name: "受取人と請求内容" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "精算資産" }),
  ).toBeVisible();

  const rlusdInput = page.locator(
    'input[name="settlementAsset"][value$=":rlusd"]',
  );
  const rlusdCard = page.locator("label").filter({ has: rlusdInput });
  await rlusdCard.click();
  await expect(rlusdInput).toBeChecked();
  await expect(
    page.getByText(/RLUSDを受け取るアカウントにはRLUSDのトラストラインが必要です/),
  ).toBeVisible();

  const totalInput = page.getByLabel("請求総額");
  await expect(totalInput).toBeVisible();
  await expect(totalInput.locator("xpath=following-sibling::span")).toHaveText(
    "RLUSD",
  );

  await page
    .getByRole("checkbox", { name: /受取人負担分を含める/ })
    .click();
  const fundedInput = page.getByLabel("受取人負担額");
  await expect(fundedInput).toBeVisible();
  await expect(fundedInput.locator("xpath=following-sibling::span")).toHaveText(
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
        paymentMode: "representative",
        recipientLabel: "Dinner organizer",
        destinationAddress: "rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY",
        destinationTag: null,
        asset: {
          id: "xrpl:testnet:xrp",
          paymentRail: "xrpl",
          network: "testnet",
          symbol: "XRP",
          assetType: "native",
          currency: "XRP",
          issuer: null,
          precision: 6,
          verificationStrategy: "xrpl-xrp-v1",
          receiptContract: "xrpl-xrp-payment-v1",
        },
        totalAmount: { code: "XRP", units: "10000000", scale: 6 },
        recipientFundedAmount: { code: "XRP", units: "2000000", scale: 6 },
        creatorShareAmount: { code: "XRP", units: "2000000", scale: 6 },
        allocatedAmount: { code: "XRP", units: "10000000", scale: 6 },
        totalDrops: "10000000",
        recipientFundedDrops: "2000000",
        creatorShareDrops: "2000000",
        allocatedDrops: "10000000",
        participants: [
          {
            participantLabel: "Alex",
            expectedPayerAddress: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
            expectedAmount: { code: "XRP", units: "3000000", scale: 6 },
            expectedAmountDrops: "3000000",
          },
          {
            participantLabel: "Blair",
            expectedPayerAddress: "rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH",
            expectedAmount: { code: "XRP", units: "5000000", scale: 6 },
            expectedAmountDrops: "5000000",
          },
        ],
      }),
    });
  });

  await page.goto("/testnet/bill");
  await page.getByRole("radio", { name: /Pay a representative/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByLabel("Representative or recipient name").fill("Dinner organizer");
  await page.getByLabel("Bill title").fill("Dinner");
  await page
    .getByLabel("Recipient XRPL address")
    .fill("rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY");
  await page.getByLabel("Bill total").fill("10");
  await page
    .getByRole("checkbox", { name: /Include a recipient-funded amount/ })
    .click();
  await page
    .getByRole("textbox", { name: "Recipient-funded amount" })
    .fill("2");
  await page.getByRole("button", { name: "Continue" }).click();

  const labels = page.getByLabel("Label");
  const payers = page.getByLabel("Expected payer address");
  const amounts = page.getByLabel("Assigned amount");
  await labels.nth(0).fill("Alex");
  await payers.nth(0).fill("rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh");
  await amounts.nth(0).fill("3");

  await page.getByText("Participant 2", { exact: true }).click();
  await labels.nth(1).fill("Blair");
  await payers.nth(1).fill("rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH");
  await amounts.nth(1).fill("5");

  await expect(page.getByText("Allocation exact")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Review and freeze" }).click();
  await expect(
    page.getByRole("heading", { name: "Review before freezing" }),
  ).toBeVisible();
  await expect(page.getByText("No funds move when the Bill is created")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Freeze bill and create payment links" }),
  ).toBeVisible();
});
