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
    const screenshot = `${viewport.name}-bill-full.png`;
    await page.screenshot({
      path: resolve(outputDir, screenshot),
      fullPage: true,
      animations: "disabled",
    });

    const metrics = await page.evaluate(() => {
      const documentElement = document.documentElement;
      const body = document.body;
      return {
        documentClientWidth: documentElement.clientWidth,
        documentScrollWidth: documentElement.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        title: document.title,
      };
    });
    const horizontalOverflow =
      metrics.documentScrollWidth > metrics.documentClientWidth + 1 ||
      metrics.bodyScrollWidth > metrics.bodyClientWidth + 1;

    results.push({
      viewport,
      url: page.url(),
      screenshot,
      horizontalOverflow,
      metrics,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

const report = {
  schemaVersion: 1,
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

const failures = results.filter((result) => result.horizontalOverflow);
if (failures.length > 0) {
  throw new Error(
    `Horizontal overflow detected: ${failures.map((item) => item.viewport.name).join(", ")}`,
  );
}

console.log(
  `Production UI audit captured ${results.length} viewports without horizontal overflow.`,
);
