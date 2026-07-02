import type { Locale } from "./catalog";

const messages = {
  en: {
    recipient: "Recipient",
    operator: "Bill operator",
    payer: "Payer",
    paymentLink: "Payment link",
    progressLink: "Progress link",
    preparationLink: "Setup link",
    proofLink: "Proof link",
    readinessReady: "Ready",
    readinessBlocked: "Blocked",
    readinessUnavailable: "Unavailable",
    readinessChecking: "Checking",
    official: "Official",
  },
  ja: {
    recipient: "受取人",
    operator: "請求の操作担当",
    payer: "支払う人",
    paymentLink: "支払いリンク",
    progressLink: "進捗リンク",
    preparationLink: "準備リンク",
    proofLink: "証明リンク",
    readinessReady: "準備完了",
    readinessBlocked: "対応が必要",
    readinessUnavailable: "確認できません",
    readinessChecking: "確認中",
    official: "公式",
  },
  ko: {
    recipient: "수취인",
    operator: "청구 운영자",
    payer: "결제자",
    paymentLink: "결제 링크",
    progressLink: "진행 링크",
    preparationLink: "준비 링크",
    proofLink: "증명 링크",
    readinessReady: "준비 완료",
    readinessBlocked: "조치 필요",
    readinessUnavailable: "확인 불가",
    readinessChecking: "확인 중",
    official: "공식",
  },
} as const;

export type SemanticMessageKey = keyof (typeof messages)["en"];

export function semanticTranslate(locale: Locale, key: SemanticMessageKey) {
  return messages[locale]?.[key] ?? messages.en[key];
}
