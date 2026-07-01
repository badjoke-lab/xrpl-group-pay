import { LegacyRouteRedirect } from "@/components/navigation/legacy-route-redirect";

export const metadata = {
  title: "Participant Payment",
  robots: { index: false, follow: false },
};

export default function LegacyPaymentPage() {
  return <LegacyRouteRedirect destination="/payment" />;
}
