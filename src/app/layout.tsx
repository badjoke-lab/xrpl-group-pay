import type { Metadata } from "next";

import { LocalizationProvider } from "@/features/localization/provider";
import { getRequestLocale } from "@/features/localization/server";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "XRPL Group Pay",
    template: "%s · XRPL Group Pay",
  },
  description:
    "A non-custodial shared-expense settlement application on the XRP Ledger.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html lang={locale}>
      <body>
        <LocalizationProvider initialLocale={locale}>
          {children}
        </LocalizationProvider>
      </body>
    </html>
  );
}
