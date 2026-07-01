import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const baseUrl = process.env.PRODUCTION_UI_URL ?? "https://xgp.badjoke-lab.com";
const outputDir = resolve(
  process.env.PRODUCTION_UI_OUTPUT_DIR ?? "artifacts/production-ui-audit",
);
const viewports = [
  { name: "mobile-320", width: 320, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "desktop-1280", width: 1280, height: 800 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function capture(page, viewport, variant) {
  const screenshot = `${viewport.name}-${variant}-bill-full.png`;
  await page.screenshot({
    path: resolve(outputDir, screenshot),
    fullPage: true,
    animations: "disabled",
  });

  const metrics = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;
    const selectedAsset = document.querySelector(
      'input[name="settlementAsset"]:checked',
    );
    const text = body.textContent ?? "";
    return {
      documentClientWidth: documentElement.clientWidth,
      documentScrollWidth: documentElement.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      title: document.title,
      language: document.documentElement.lang,
      selectedAssetId:
        selectedAsset instanceof HTMLInputElement ? selectedAsset.value : null,
      reviewedJapaneseCopy: text.includes("割り勘の内容を入力"),
      reviewedJapaneseSections:
        text.includes("請求を作成") &&
        text.includes("分け方と参加者") &&
        text.includes("入力内容の確認"),
      staleJapaneseCopy:
        text.includes("共同請求を作成") ||
        text.includes("配分と参加者") ||
        text.includes("確認準備"),
      mixedEnglishShell:
        text.includes("Create one bill. Send each person their exact share.") ||
        text.includes("Creator flow · XRPL Mainnet"),
    };
  });
  const horizontalOverflow =
    metrics.documentScrollWidth > metrics.documentClientWidth + 1 ||
    metrics.bodyScrollWidth > metrics.bodyClientWidth + 1;

  results.push({
    viewport,
    variant,
    url: page.url(),
    screenshot,
    horizontalOverflow,
    metrics,
  });
}

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: "en-US",
    });
    const page = await context.newPage();
    const response = await page.goto(`${baseUrl}/bill`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    if (!response?.ok()) {
      throw new Error(
        `Production Bill page returned ${response?.status() ?? "no response"}`,
      );
    }

    await page.getByRole("heading", { name: "Create a shared bill" }).waitFor();
    await capture(page, viewport, "en-xrp");

    await page.getByRole("combobox", { name: "Language" }).selectOption("ja");
    await page.locator('html[lang="ja"]').waitFor();
    await page
      .getByRole("heading", { level: 1, name: "割り勘の内容を入力" })
      .waitFor({ timeout: 15_000 });
    await page
      .getByRole("heading", { name: "請求を作成", exact: true })
      .waitFor({ timeout: 15_000 });
    await page
      .getByRole("heading", { name: "分け方と参加者", exact: true })
      .waitFor({ timeout: 15_000 });
    await page
      .getByRole("heading", { name: "入力内容の確認", exact: true })
      .waitFor({ timeout: 15_000 });

    const rlusdInput = page.locator(
      'input[name="settlementAsset"][value$=":rlusd"]',
    );
    const rlusdCard = page.locator("label").filter({ has: rlusdInput });
    await rlusdCard.click();
    await page.getByText(/RLUSD/, { exact: false }).first().waitFor();
    if (!(await rlusdInput.isChecked())) {
      throw new Error(`RLUSD selection failed at ${viewport.name}`);
    }

    await capture(page, viewport, "ja-rlusd");
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: 3,
  capturedAt: new Date().toISOString(),
  baseUrl,
  page: "/bill",
  results,
};
await writeFile(
  resolve(outputDir, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

const failures = results.filter(
  (result) =>
    result.horizontalOverflow ||
    (result.variant === "ja-rlusd" &&
      (!result.metrics.reviewedJapaneseCopy ||
        !result.metrics.reviewedJapaneseSections ||
        result.metrics.staleJapaneseCopy ||
        result.metrics.mixedEnglishShell ||
        result.metrics.selectedAssetId !== "xrpl:mainnet:rlusd")),
);
if (failures.length > 0) {
  throw new Error(
    `Production UI audit failed: ${failures
      .map((item) => `${item.viewport.name}/${item.variant}`)
      .join(", ")}`,
  );
}

console.log(
  `Production UI audit captured ${results.length} complete XRP and Japanese RLUSD views without horizontal overflow or mixed-language copy.`,
);
