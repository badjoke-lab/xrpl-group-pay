import type { BillProgress } from "@/features/bills/progress";
import type { useProgressLocalization } from "@/features/localization/progress-catalog";
import type { SemanticStatusFamily } from "@/components/ui/semantic-status";

type SlotStatus = BillProgress["slots"][number]["status"];
type ProgressTranslator = ReturnType<typeof useProgressLocalization>["gt"];

export type BillProgressSemanticStatus = {
  label: string;
  family: SemanticStatusFamily;
  animated: boolean;
};

export function billProgressSemanticStatus(
  status: SlotStatus,
  gt: ProgressTranslator,
): BillProgressSemanticStatus {
  if (status === "paid") {
    return { label: gt("paid"), family: "complete", animated: false };
  }
  if (status === "needs_review") {
    return {
      label: gt("needsReview"),
      family: "action_required",
      animated: false,
    };
  }
  if (status === "verification_failed") {
    return {
      label: gt("verificationFailed"),
      family: "destructive",
      animated: false,
    };
  }
  if (status === "submitted") {
    return {
      label: gt("submitted"),
      family: "in_progress",
      animated: true,
    };
  }
  if (status === "validating") {
    return {
      label: gt("validating"),
      family: "in_progress",
      animated: true,
    };
  }
  if (status === "payload_created" || status === "awaiting_signature") {
    return {
      label: gt("awaitingSignature"),
      family: "in_progress",
      animated: status === "awaiting_signature",
    };
  }
  if (status === "rejected") {
    return {
      label: gt("rejected"),
      family: "action_required",
      animated: false,
    };
  }
  if (status === "expired") {
    return {
      label: gt("expired"),
      family: "action_required",
      animated: false,
    };
  }
  return { label: gt("unpaid"), family: "neutral", animated: false };
}
