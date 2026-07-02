"use client";

import { usePathname } from "next/navigation";

import { ContextualHelp } from "./contextual-help";

export function FloatingHelp() {
  const pathname = usePathname();

  if (pathname.startsWith("/guide")) return null;
  return <ContextualHelp topic="overview" variant="icon" />;
}
