"use client";

import { usePathname } from "next/navigation";

import type { HelpTopicId } from "@/features/help/help-registry";

import { ContextualHelp } from "./contextual-help";

function topicForPath(pathname: string): HelpTopicId {
  if (pathname.startsWith("/rlusd/prepare")) return "trustset";
  if (pathname.startsWith("/payment")) return "payment-status";
  if (pathname.startsWith("/manage") || pathname.startsWith("/progress")) {
    return "partial-completion";
  }
  if (pathname.startsWith("/proof")) return "verification";
  if (pathname.startsWith("/bill")) return "payment-modes";
  return "overview";
}

export function FloatingHelp() {
  const pathname = usePathname();

  if (pathname.startsWith("/guide")) return null;
  return <ContextualHelp topic={topicForPath(pathname)} variant="icon" />;
}
