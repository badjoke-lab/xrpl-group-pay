"use client";

import { useEffect } from "react";

export type LegacyRouteDestination = "/payment" | "/bill/progress" | "/proof";

export function legacyRouteTarget(
  destination: LegacyRouteDestination,
  search: string,
  hash: string,
) {
  return `${destination}${search}${hash}`;
}

export function LegacyRouteRedirect({
  destination,
}: {
  destination: LegacyRouteDestination;
}) {
  useEffect(() => {
    window.location.replace(
      legacyRouteTarget(
        destination,
        window.location.search,
        window.location.hash,
      ),
    );
  }, [destination]);

  function continueToCanonicalRoute() {
    window.location.replace(
      legacyRouteTarget(
        destination,
        window.location.search,
        window.location.hash,
      ),
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-lg rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Opening XRPL Group Pay</h1>
        <p className="mt-3 leading-7 text-muted">
          This page has moved to a shorter address.
        </p>
        <button
          type="button"
          onClick={continueToCanonicalRoute}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-action px-5 font-semibold text-white"
        >
          Continue
        </button>
      </div>
    </main>
  );
}
