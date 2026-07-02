import type { AssetReadinessAssessment } from "./asset-readiness";

export type PaymentReadinessResponse = {
  payer: AssetReadinessAssessment;
  recipient: AssetReadinessAssessment;
};
