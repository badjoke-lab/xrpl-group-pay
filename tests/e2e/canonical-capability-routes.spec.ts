import { expect, test } from "@playwright/test";

const token = "ab".repeat(32);

for (const route of [
  { legacy: "/testnet/payment", canonical: "/payment" },
  { legacy: "/testnet/bill/progress", canonical: "/bill/progress" },
  { legacy: "/testnet/proof", canonical: "/proof" },
] as const) {
  test(`redirects ${route.legacy} without dropping the capability fragment`, async ({
    page,
  }) => {
    await page.goto(`${route.legacy}?lang=ja#token=${token}`);

    await expect(page).toHaveURL(
      new RegExp(`${route.canonical.replaceAll("/", "\\/")}\\?lang=ja#token=${token}$`),
    );
  });
}
