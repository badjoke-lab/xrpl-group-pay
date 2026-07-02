import type { XrplNetwork } from "@/features/assets/types";

import {
  newBillDraft,
  type BillDraft,
  type BillPaymentMode,
  type ParticipantDraft,
  type SettlementAssetId,
} from "./bill-form-model";

export type BillCreationStep = 1 | 2 | 3 | 4;

const VERSION = 1;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const BILL_DRAFT_SESSION_EVENT = "xgp:bill-draft-session";

export function billDraftStorageKey(network: XrplNetwork) {
  return `xgp.bill-draft.${network}.v${VERSION}`;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.slice(0, 512) : fallback;
}

function mode(value: unknown): BillPaymentMode {
  return value === "representative" || value === "direct" ? value : "";
}

function asset(value: unknown, network: XrplNetwork): SettlementAssetId {
  const allowed = [`xrpl:${network}:xrp`, `xrpl:${network}:rlusd`];
  return allowed.includes(String(value))
    ? (value as SettlementAssetId)
    : (`xrpl:${network}:xrp` as SettlementAssetId);
}

function participant(value: unknown): ParticipantDraft | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = text(item.id).trim();
  if (!id || id.length > 64) return null;
  return {
    id,
    label: text(item.label),
    expectedPayerAddress: text(item.expectedPayerAddress),
    amount: text(item.amount),
    percentage: text(item.percentage),
    shares: text(item.shares, "1") || "1",
    remainderUnits: text(item.remainderUnits, "0") || "0",
  };
}

function sanitizeDraft(value: unknown, network: XrplNetwork): BillDraft | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const fallback = newBillDraft(network);
  const participants = Array.isArray(raw.participants)
    ? raw.participants.slice(0, 50).map(participant).filter(Boolean)
    : [];
  if (participants.length < 2) return null;

  const paymentMode = mode(raw.paymentMode);
  const recipientFundedEnabled =
    paymentMode === "representative" && raw.recipientFundedEnabled === true;

  return {
    paymentMode,
    recipientLabel: text(raw.recipientLabel),
    recipientFundedEnabled,
    recipientFundedAmount: text(raw.recipientFundedAmount, "0") || "0",
    title: text(raw.title),
    destinationAddress: text(raw.destinationAddress),
    destinationTag: text(raw.destinationTag),
    settlementAssetId: asset(raw.settlementAssetId, network),
    totalAmount: text(raw.totalAmount),
    creatorShareAmount: text(raw.creatorShareAmount, "0"),
    allocationStrategy:
      raw.allocationStrategy === "equal" ||
      raw.allocationStrategy === "custom" ||
      raw.allocationStrategy === "percentage" ||
      raw.allocationStrategy === "shares"
        ? raw.allocationStrategy
        : fallback.allocationStrategy,
    remainderMode:
      raw.remainderMode === "creator" ||
      raw.remainderMode === "first_participant" ||
      raw.remainderMode === "selected_participant" ||
      raw.remainderMode === "manual"
        ? raw.remainderMode
        : "",
    remainderParticipantId: text(raw.remainderParticipantId),
    participants: participants as ParticipantDraft[],
  };
}

function readEnvelope(network: XrplNetwork) {
  try {
    return JSON.parse(
      window.sessionStorage.getItem(billDraftStorageKey(network)) ?? "null",
    ) as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function copiedSource(value: unknown) {
  const source = text(value).trim();
  return source && UUID_PATTERN.test(source) ? source : null;
}

function announceDraftChange(network: XrplNetwork) {
  window.dispatchEvent(
    new CustomEvent(BILL_DRAFT_SESSION_EVENT, { detail: { network } }),
  );
}

export function readBillDraftSession(network: XrplNetwork): {
  draft: BillDraft;
  step: BillCreationStep;
  copiedFromPublicId?: string;
} | null {
  if (typeof window === "undefined") return null;
  const value = readEnvelope(network);
  if (!value || value.version !== VERSION || value.network !== network) {
    return null;
  }
  const draft = sanitizeDraft(value.draft, network);
  if (!draft) return null;
  const rawStep = Number(value.step);
  const step =
    rawStep === 1 || rawStep === 2 || rawStep === 3 || rawStep === 4
      ? rawStep
      : 1;
  const copiedFromPublicId = copiedSource(value.copiedFromPublicId);
  return copiedFromPublicId
    ? { draft, step, copiedFromPublicId }
    : { draft, step };
}

export function writeBillDraftSession(
  network: XrplNetwork,
  draft: BillDraft,
  step: BillCreationStep,
  copiedFromPublicId?: string | null,
) {
  if (typeof window === "undefined") return;
  const existing = readEnvelope(network);
  const source =
    copiedFromPublicId === undefined
      ? copiedSource(existing?.copiedFromPublicId)
      : copiedSource(copiedFromPublicId);
  window.sessionStorage.setItem(
    billDraftStorageKey(network),
    JSON.stringify({
      version: VERSION,
      network,
      draft,
      step,
      ...(source ? { copiedFromPublicId: source } : {}),
    }),
  );
  announceDraftChange(network);
}

export function clearBillDraftSession(network: XrplNetwork) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(billDraftStorageKey(network));
  announceDraftChange(network);
}
