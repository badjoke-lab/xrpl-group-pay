import type { HTMLAttributes } from "react";

import type { Locale } from "@/features/localization/catalog";
import { paymentRecoveryCopy } from "@/features/localization/recovery-catalog";
import type { PaymentRecoveryAssessment } from "@/features/payment-recovery/taxonomy";

import {
  semanticFamilyForRecoveryDisposition,
  StatusBadge,
} from "./semantic-status";

export type RecoveryBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  assessment: PaymentRecoveryAssessment;
  locale?: Locale;
  label?: string;
};

export function RecoveryBadge({
  assessment,
  locale = "en",
  label,
  ...props
}: RecoveryBadgeProps) {
  const copy = paymentRecoveryCopy(locale, assessment);
  return (
    <StatusBadge
      family={semanticFamilyForRecoveryDisposition(assessment.disposition)}
      label={label ?? copy.title}
      animated={assessment.disposition === "wait_recheck"}
      {...props}
    />
  );
}
