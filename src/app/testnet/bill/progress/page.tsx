import { LegacyRouteRedirect } from "@/components/navigation/legacy-route-redirect";

export const metadata = {
  title: "Bill Progress",
  robots: { index: false, follow: false },
};

export default function LegacyBillProgressPage() {
  return <LegacyRouteRedirect destination="/bill/progress" />;
}
