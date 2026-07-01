"use client";

import { useEffect, useState } from "react";

type Destination = "/payment" | "/bill/progress" | "/proof";

export function LegacyRouteRedirect({
  destination,
}: {
  destination: Destination;
}) {
  const [href, setHref] = useState(destination);

  useEffect(() => {
    const target = `${destination}${window.location.search}${window.location.hash}`;
    setHref(target);
    window.location.replace(target);
  }, [destination]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="max-w-lg rounded-xl border border-border bg-surface p-6 text-center shadow-sm">
        <h1 className="font-heading text-2xl font-semibold">Opening XRPL Group Pay</h1>
        <p className="mt-3 leading-7 text-muted">
          This page has moved to a shorter address.
        </p>
        <a
          href={href}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-action px-5 font-semibold text-white"
        >
          Continue
        </a>
      </div>
    </main>
  );
}
