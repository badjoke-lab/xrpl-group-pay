import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "XRPL Group Pay",
    template: "%s · XRPL Group Pay",
  },
  description:
    "A non-custodial shared-expense settlement application on the XRP Ledger.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
