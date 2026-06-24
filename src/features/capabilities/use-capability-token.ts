"use client";

import { useSyncExternalStore } from "react";

export const CAPABILITY_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const HASH_SNAPSHOT_PENDING = "__capability_pending__";

export function normalizeCapabilityToken(value: string | null | undefined) {
  return value && CAPABILITY_TOKEN_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

export function parseCapabilityTokenFromHash(hash: string) {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const candidate = raw.startsWith("token=")
    ? new URLSearchParams(raw).get("token")
    : raw;
  return normalizeCapabilityToken(candidate);
}

function subscribeToHash(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange);
  return () => window.removeEventListener("hashchange", onStoreChange);
}

function getHashSnapshot() {
  return window.location.hash;
}

function getServerHashSnapshot() {
  return HASH_SNAPSHOT_PENDING;
}

export function useCapabilityToken(explicitToken?: string) {
  const hash = useSyncExternalStore(
    subscribeToHash,
    getHashSnapshot,
    getServerHashSnapshot,
  );
  const capability =
    explicitToken !== undefined
      ? normalizeCapabilityToken(explicitToken)
      : hash === HASH_SNAPSHOT_PENDING
        ? null
        : parseCapabilityTokenFromHash(hash);

  return {
    capability,
    resolved: explicitToken !== undefined || hash !== HASH_SNAPSHOT_PENDING,
  };
}
