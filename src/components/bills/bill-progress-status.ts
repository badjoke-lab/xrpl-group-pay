import type { SemanticStatusFamily } from "@/components/ui/semantic-status";
import type { BillProgress } from "@/features/bills/progress";
import type {
  ProgressMessageKey,
  useProgressLocalization,
} from "@/features/localization/progress-catalog";

type SlotStatus = BillProgress["slots"][number]["status"];
type BillStatus = BillProgress["bill"]["status"];
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

export function billGroupSemanticStatus(
  status: BillStatus,
  gt: ProgressTranslator,
): BillProgressSemanticStatus {
  switch (status) {
    case "settled":
      return {
        label: gt("groupSettled"),
        family: "complete",
        animated: false,
      };
    case "partially_paid":
      return {
        label: gt("groupPartial"),
        family: "in_progress",
        animated: false,
      };
    case "needs_review":
      return {
        label: gt("groupReview"),
        family: "action_required",
        animated: false,
      };
    case "closed_incomplete":
      return {
        label: gt("groupClosed"),
        family: "destructive",
        animated: false,
      };
    case "open":
      return {
        label: gt("groupOpen"),
        family: "neutral",
        animated: false,
      };
  }
}

export function slotSafeActionKey(
  status: SlotStatus,
  billClosed: boolean,
): ProgressMessageKey {
  if (billClosed) return "actionClosed";
  if (status === "paid") return "actionPaid";
  if (status === "needs_review" || status === "verification_failed") {
    return "actionReview";
  }
  if (status === "submitted" || status === "validating") {
    return "actionSubmitted";
  }
  if (status === "payload_created" || status === "awaiting_signature") {
    return "actionAwaiting";
  }
  if (status === "rejected" || status === "expired") {
    return "actionRejected";
  }
  return "actionUnpaid";
}
