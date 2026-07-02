import type { Metadata } from "next";

import { FloatingHelp } from "@/components/help/floating-help";
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
          <div className="fixed bottom-5 right-5 z-40">
            <FloatingHelp />
          </div>
        </LocalizationProvider>
      </body>
    </html>
  );
}
