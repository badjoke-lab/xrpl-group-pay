import { publicEnv } from "@/config/public-env";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "xrpl-group-pay",
      network: publicEnv.NEXT_PUBLIC_APP_NETWORK,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
