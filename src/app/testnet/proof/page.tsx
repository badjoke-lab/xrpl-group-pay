import { LegacyRouteRedirect } from "@/components/navigation/legacy-route-redirect";

export const metadata = {
  title: "Transaction Proof",
  robots: { index: false, follow: false },
};

export default function LegacyProofPage() {
  return <LegacyRouteRedirect destination="/proof" />;
}
