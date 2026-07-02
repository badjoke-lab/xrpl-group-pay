import type { Locale } from "@/features/localization/catalog";
import {
  guideHref,
  type GuideSectionId,
} from "@/features/guide/guide-content";

export const HELP_TOPIC_IDS = [
  "overview",
  "roles",
  "recipient",
  "settlement-asset",
  "rlusd-readiness",
  "payment-status",
  "safe-recovery",
  "capability-privacy",
] as const;

export type HelpTopicId = (typeof HELP_TOPIC_IDS)[number];

export type HelpTopic = {
  id: HelpTopicId;
  title: string;
  short: string;
  detail: readonly string[];
  guideSection: GuideSectionId;
};

type TopicCopy = Omit<HelpTopic, "id">;

const en: Record<HelpTopicId, TopicCopy> = {
  overview: {
    title: "How Group Pay works",
    short: "Each payer sends an independent payment directly to the recipient.",
    detail: [
      "Group Pay coordinates the Bill but never receives or pools payer funds.",
      "Completion requires a matching validated XRPL transaction, not only a wallet signature or callback.",
    ],
    guideSection: "overview",
  },
  roles: {
    title: "Bill roles",
    short: "The Bill operator, recipient, and payer are separate roles.",
    detail: [
      "The operator creates and manages the Bill. The recipient receives every transfer. Each payer signs only their own obligation.",
      "The same person may hold multiple roles, but the payment facts remain explicit.",
    ],
    guideSection: "roles",
  },
  recipient: {
    title: "Recipient account",
    short: "This XRPL account receives the participant payments directly.",
    detail: [
      "The recipient, optional Destination Tag, network, asset, and issuer become immutable when the Bill is frozen.",
      "Check the address carefully. Group Pay cannot reverse a validated Mainnet transfer.",
    ],
    guideSection: "roles",
  },
  "settlement-asset": {
    title: "Settlement Asset",
    short: "Every payer slot in this Bill uses the same frozen asset.",
    detail: [
      "XRP is the native XRPL asset. Official RLUSD is verified with its network-specific currency and issuer.",
      "Group Pay does not exchange XRP and RLUSD and never verifies an issued asset by ticker alone.",
    ],
    guideSection: "payment-flow",
  },
  "rlusd-readiness": {
    title: "RLUSD readiness",
    short: "Official RLUSD requires a trust line, RLUSD balance, and spendable XRP.",
    detail: [
      "TrustSet configures the official trust line but does not transfer the Bill amount or provide RLUSD.",
      "XRP is still required for network fees and may be required for reserve constraints.",
    ],
    guideSection: "trustset",
  },
  "payment-status": {
    title: "Payment status",
    short: "Signed or submitted is not the same as ledger-verified payment.",
    detail: [
      "While a transaction is uncertain, Group Pay keeps checking and blocks a replacement payment.",
      "Paid is shown only after the validated transaction matches every frozen payment fact.",
    ],
    guideSection: "status-meanings",
  },
  "safe-recovery": {
    title: "Safe recovery",
    short: "Retry is available only after the prior attempt is safely reconciled.",
    detail: [
      "Rejected or expired requests may be retried when no uncertain transfer remains.",
      "Mismatched, unvalidated, duplicate, or multiple candidate transactions require waiting or review instead of automatic replacement.",
    ],
    guideSection: "recovery",
  },
  "capability-privacy": {
    title: "Capability link privacy",
    short: "Management, progress, payment, setup, and proof links have different scopes.",
    detail: [
      "Share each link only with its intended audience. A management capability must never be included in participant instructions.",
      "Help and Guide links use fixed public paths and never copy the current URL fragment or draft values.",
    ],
    guideSection: "privacy",
  },
};

const ja: Record<HelpTopicId, TopicCopy> = {
  overview: { title: "Group Payの仕組み", short: "各支払者が受取人へ独立して直接送金します。", detail: ["Group Payは請求を調整しますが、資金を受け取ったりまとめたりしません。", "完了には、ウォレット署名やコールバックだけでなく、一致する検証済みXRPL取引が必要です。"], guideSection: "overview" },
  roles: { title: "請求の役割", short: "操作担当、受取人、支払う人は別の役割です。", detail: ["操作担当が請求を作成・管理し、受取人が送金を受け取り、各支払者は自分の負担分だけに署名します。", "同じ人が複数の役割を持つ場合でも、支払い条件は明示されます。"], guideSection: "roles" },
  recipient: { title: "受取先アカウント", short: "参加者の支払いを直接受け取るXRPLアカウントです。", detail: ["受取先、Destination Tag、ネットワーク、資産、発行者は請求確定後に変更できません。", "Mainnetの検証済み送金は取り消せないため、アドレスを慎重に確認してください。"], guideSection: "roles" },
  "settlement-asset": { title: "精算資産", short: "この請求の全支払枠で同じ固定資産を使います。", detail: ["XRPはXRPLのネイティブ資産です。公式RLUSDはネットワークごとの通貨コードと発行者で検証します。", "Group PayはXRPとRLUSDを交換せず、ティッカーだけで発行資産を検証しません。"], guideSection: "payment-flow" },
  "rlusd-readiness": { title: "RLUSDの準備状態", short: "公式トラストライン、RLUSD残高、利用可能XRPが必要です。", detail: ["TrustSetは公式トラストラインを設定しますが、請求額を送金せず、RLUSD残高も増やしません。", "ネットワーク手数料とリザーブ条件のためにXRPが必要です。"], guideSection: "trustset" },
  "payment-status": { title: "支払いステータス", short: "署名済みや送信済みは台帳検証済みと同じではありません。", detail: ["取引が不確かな間は確認を続け、代替の支払い作成を止めます。", "固定された全条件と一致する検証済み取引を確認した後だけ支払済みになります。"], guideSection: "status-meanings" },
  "safe-recovery": { title: "安全な復旧", short: "以前の試行を安全に照合した後だけ再試行できます。", detail: ["不確かな送金が残っていなければ、拒否や期限切れは再試行できます。", "不一致、未検証、重複、複数候補は自動置換せず、待機または確認が必要です。"], guideSection: "recovery" },
  "capability-privacy": { title: "共有リンクのプライバシー", short: "管理、進捗、支払い、準備、証明リンクは権限が異なります。", detail: ["各リンクは対象者だけに共有してください。管理リンクを参加者向け案内へ含めてはいけません。", "ヘルプとガイドは固定公開パスを使い、現在のURLフラグメントや下書きをコピーしません。"], guideSection: "privacy" },
};

const ko: Record<HelpTopicId, TopicCopy> = {
  overview: { title: "Group Pay 작동 방식", short: "각 결제자가 수취인에게 독립적으로 직접 전송합니다.", detail: ["Group Pay는 청구를 조정하지만 결제자 자금을 받거나 모으지 않습니다.", "완료에는 지갑 서명이나 콜백만이 아니라 일치하는 검증된 XRPL 거래가 필요합니다."], guideSection: "overview" },
  roles: { title: "청구 역할", short: "청구 운영자, 수취인, 결제자는 서로 다른 역할입니다.", detail: ["운영자는 청구를 만들고 관리하며 수취인은 전송을 받고 각 결제자는 자신의 의무에만 서명합니다.", "한 사람이 여러 역할을 맡아도 결제 사실은 명확하게 유지됩니다."], guideSection: "roles" },
  recipient: { title: "수취인 계정", short: "참가자 결제를 직접 받는 XRPL 계정입니다.", detail: ["수취인, Destination Tag, 네트워크, 자산 및 발행자는 청구가 고정된 뒤 변경할 수 없습니다.", "검증된 Mainnet 전송은 되돌릴 수 없으므로 주소를 주의 깊게 확인하십시오."], guideSection: "roles" },
  "settlement-asset": { title: "정산 자산", short: "이 청구의 모든 결제 슬롯은 같은 고정 자산을 사용합니다.", detail: ["XRP는 XRPL 네이티브 자산입니다. 공식 RLUSD는 네트워크별 통화와 발행자로 검증합니다.", "Group Pay는 XRP와 RLUSD를 교환하지 않으며 티커만으로 발행 자산을 검증하지 않습니다."], guideSection: "payment-flow" },
  "rlusd-readiness": { title: "RLUSD 준비 상태", short: "공식 트러스트라인, RLUSD 잔액 및 사용 가능 XRP가 필요합니다.", detail: ["TrustSet은 공식 트러스트라인을 설정하지만 청구 금액을 전송하거나 RLUSD 잔액을 제공하지 않습니다.", "네트워크 수수료와 준비금 조건에는 XRP가 필요합니다."], guideSection: "trustset" },
  "payment-status": { title: "결제 상태", short: "서명 또는 제출은 원장 검증 완료와 같지 않습니다.", detail: ["거래가 불확실한 동안 계속 확인하며 교체 결제를 차단합니다.", "고정된 모든 결제 사실과 일치하는 검증 거래가 확인된 후에만 결제 완료가 됩니다."], guideSection: "status-meanings" },
  "safe-recovery": { title: "안전한 복구", short: "이전 시도를 안전하게 대조한 뒤에만 재시도할 수 있습니다.", detail: ["불확실한 전송이 남지 않았다면 거절되거나 만료된 요청을 재시도할 수 있습니다.", "불일치, 미검증, 중복 또는 복수 후보는 자동 교체 대신 대기나 검토가 필요합니다."], guideSection: "recovery" },
  "capability-privacy": { title: "기능 링크 개인정보", short: "관리, 진행, 결제, 준비 및 증명 링크는 범위가 다릅니다.", detail: ["각 링크는 의도한 대상에게만 공유하십시오. 관리 기능은 참가자 안내에 포함하면 안 됩니다.", "도움말과 가이드는 고정 공개 경로를 사용하며 현재 URL 조각이나 초안 값을 복사하지 않습니다."], guideSection: "privacy" },
};

const registry: Record<Locale, Record<HelpTopicId, TopicCopy>> = { en, ja, ko };

export function getHelpTopic(locale: Locale, id: HelpTopicId): HelpTopic {
  return { id, ...(registry[locale]?.[id] ?? en[id]) };
}

export function helpGuideHref(id: HelpTopicId): string {
  return guideHref(en[id].guideSection);
}
