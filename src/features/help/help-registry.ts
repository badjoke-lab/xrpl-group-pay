import type { Locale } from "@/features/localization/catalog";
import {
  guideHref,
  type GuideSectionId,
} from "@/features/guide/guide-content";

export const HELP_TOPIC_IDS = [
  "overview",
  "roles",
  "payment-modes",
  "recipient",
  "destination-tag",
  "settlement-asset",
  "allocation",
  "capability-privacy",
  "readiness",
  "xrp-readiness",
  "rlusd-readiness",
  "trustset",
  "payment-status",
  "verification",
  "safe-recovery",
  "review-required",
  "partial-completion",
  "incomplete-closure",
  "copy-to-revise",
  "destructive-confirmation",
  "security-limitations",
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
      "The operator creates and manages the Bill. The recipient receives transfers. Each payer signs only their own obligation.",
      "The same person may hold multiple roles, but each link and payment fact keeps its own scope.",
    ],
    guideSection: "roles",
  },
  "payment-modes": {
    title: "Payment modes",
    short: "Choose whether payers reimburse a representative or pay an external recipient directly.",
    detail: [
      "Representative mode may record a recipient-funded accounting portion with no self-transfer.",
      "Direct mode assigns the full Bill total to payer slots and has no recipient-funded portion.",
    ],
    guideSection: "payment-modes",
  },
  recipient: {
    title: "Recipient account",
    short: "This XRPL account receives participant payments directly.",
    detail: [
      "The recipient, network, Asset, and optional Destination Tag become immutable when the Bill is frozen.",
      "Check the address carefully. Group Pay cannot reverse a validated transfer.",
    ],
    guideSection: "create-and-freeze",
  },
  "destination-tag": {
    title: "Destination Tag",
    short: "Some exchanges and custodial recipients require this UInt32 routing value.",
    detail: [
      "Use only the tag supplied by the recipient. Missing or incorrect tags can make recovery depend on the recipient.",
      "When present, Group Pay freezes and verifies the exact Destination Tag.",
    ],
    guideSection: "create-and-freeze",
  },
  "settlement-asset": {
    title: "Settlement Asset",
    short: "Every payer slot in this Bill uses the same frozen Asset.",
    detail: [
      "XRP is native. Official RLUSD is identified by its network-specific currency and issuer.",
      "Group Pay does not exchange Assets and never verifies issued currency by ticker alone.",
    ],
    guideSection: "xrp",
  },
  allocation: {
    title: "Allocation and recipient-funded amount",
    short: "Entry rules resolve to exact frozen payer amounts before creation.",
    detail: [
      "Equal, custom, percentage, and share-based entry all produce fixed-precision PaymentSlot amounts.",
      "A recipient-funded amount is accounting only and creates no self-transfer or payer slot.",
    ],
    guideSection: "create-and-freeze",
  },
  "capability-privacy": {
    title: "Capability link privacy",
    short: "Management, progress, payment, setup, and proof links have different scopes.",
    detail: [
      "Share each private link only with its intended audience. Never place a management capability in payer instructions.",
      "Help and Guide links use fixed public anchors and never copy the active capability fragment or draft values.",
    ],
    guideSection: "capability-links",
  },
  readiness: {
    title: "Payment readiness",
    short: "Group Pay confirms payer and recipient facts before creating a wallet request.",
    detail: [
      "Blocked means a known account, balance, reserve, trust-line, or Asset condition must change.",
      "Unavailable means the facts could not be confirmed, so the safe action is to recheck rather than continue.",
    ],
    guideSection: "readiness",
  },
  "xrp-readiness": {
    title: "XRP readiness",
    short: "The payer needs enough spendable XRP for the amount, fee, and reserve constraints.",
    detail: [
      "Displayed account balance and spendable XRP are not always the same because XRPL reserve must remain.",
      "The recipient account must also be confirmed before a payment request is created.",
    ],
    guideSection: "readiness",
  },
  "rlusd-readiness": {
    title: "RLUSD readiness",
    short: "Official RLUSD requires the correct trust line, balance, recipient readiness, and spendable XRP.",
    detail: [
      "TrustSet configures the official trust line but does not transfer the Bill amount or provide RLUSD.",
      "XRP is still required for network fees and may be required for reserve constraints.",
    ],
    guideSection: "readiness",
  },
  trustset: {
    title: "Official RLUSD TrustSet",
    short: "TrustSet prepares the wallet to hold official RLUSD; it is not the Bill payment.",
    detail: [
      "The setup request freezes the account, network, official currency, issuer, and trust limit.",
      "Group Pay checks the validated trust line before returning to the payment flow.",
    ],
    guideSection: "trustset",
  },
  "payment-status": {
    title: "Payment status",
    short: "Signed or submitted is not the same as ledger-verified payment.",
    detail: [
      "While a transaction is uncertain, Group Pay keeps checking and blocks a replacement payment.",
      "Paid is shown only after every frozen payment fact matches a validated transaction.",
    ],
    guideSection: "status-meanings",
  },
  verification: {
    title: "Ledger verification",
    short: "Paid requires exact Xaman-template and validated-ledger agreement.",
    detail: [
      "Payer, recipient, Asset, amount, tags, InvoiceID, delivered result, and transaction rules are checked.",
      "Verified receipt, PaymentSlot status, and Bill progress are persisted through the atomic settlement path.",
    ],
    guideSection: "verification",
  },
  "safe-recovery": {
    title: "Safe recovery",
    short: "Retry is available only after the prior attempt is safely reconciled.",
    detail: [
      "Rejected or expired requests may be retried when no uncertain transfer remains.",
      "Pending, mismatched, duplicate, or multiple candidate transactions require waiting or review instead of automatic replacement.",
    ],
    guideSection: "recovery",
  },
  "review-required": {
    title: "Review-required payment",
    short: "Observed ledger facts do not safely prove the frozen obligation.",
    detail: [
      "Management review compares expected and observed facts without providing a manual mark-paid action.",
      "Another attempt requires explicit acceptance of possible prior value movement and repeated-payment risk.",
    ],
    guideSection: "review-required",
  },
  "partial-completion": {
    title: "Partial completion",
    short: "Each payer slot settles independently and verified payments remain paid.",
    detail: [
      "One payer's rejection, setup issue, pending transaction, or review state does not reverse another verified transfer.",
      "Progress separates verified amount from remaining amount; there is no atomic all-or-nothing group transfer.",
    ],
    guideSection: "partial-completion",
  },
  "incomplete-closure": {
    title: "Incomplete closure",
    short: "Closure stops new unpaid handoffs while preserving every verified receipt.",
    detail: [
      "It does not reverse or automatically refund validated transfers and the Bill cannot be reopened.",
      "The operator must accept the disclosures and exact typed confirmation before closure.",
    ],
    guideSection: "incomplete-closure",
  },
  "copy-to-revise": {
    title: "Copy to revise",
    short: "Create a separate editable draft instead of changing frozen payment facts.",
    detail: [
      "Editable Bill facts and final allocations are copied into browser session storage.",
      "New Bill, PaymentSlot, capability, InvoiceID, and link identities are generated; the original remains unchanged.",
    ],
    guideSection: "copy-to-revise",
  },
  "destructive-confirmation": {
    title: "Destructive confirmation",
    short: "This action has an irreversible product-state consequence.",
    detail: [
      "Read every acknowledgement and verify the exact target before entering the confirmation phrase.",
      "Typed confirmation prevents accidental activation; it does not create refunds or reverse ledger transactions.",
    ],
    guideSection: "incomplete-closure",
  },
  "security-limitations": {
    title: "Security and limitations",
    short: "Group Pay verifies supported facts but cannot reverse or insure XRPL transfers.",
    detail: [
      "Review the network, recipient, Destination Tag, Asset, issuer, and amount before signing.",
      "Group Pay cannot recover keys, sign for a user, exchange Assets, guarantee availability, or force a recipient to refund.",
    ],
    guideSection: "security-limitations",
  },
};

const ja: Record<HelpTopicId, TopicCopy> = {
  overview: { title: "Group Payの仕組み", short: "各支払者が受取人へ独立して直接送金します。", detail: ["Group Payは請求を調整しますが、資金を受け取ったりまとめたりしません。", "完了には署名やコールバックだけでなく、一致する検証済みXRPL取引が必要です。"], guideSection: "overview" },
  roles: { title: "請求の役割", short: "操作担当、受取人、支払者は別の役割です。", detail: ["操作担当が請求を管理し、受取人が送金を受け、各支払者は自分の負担分だけに署名します。", "同じ人が複数の役割を持つ場合でも、リンクと支払い条件の権限は分離されます。"], guideSection: "roles" },
  "payment-modes": { title: "支払いモード", short: "代表者への精算か、外部受取先への直接支払いかを選びます。", detail: ["代表者モードでは自己送金なしの受取人負担分を記録できます。", "直接モードでは請求総額の全額を支払枠へ割り当てます。"], guideSection: "payment-modes" },
  recipient: { title: "受取先アカウント", short: "参加者の支払いを直接受け取るXRPLアカウントです。", detail: ["受取先、ネットワーク、資産、Destination Tagは請求確定後に変更できません。", "検証済み送金は取り消せないため、アドレスを慎重に確認してください。"], guideSection: "create-and-freeze" },
  "destination-tag": { title: "Destination Tag", short: "取引所やカストディ受取先で必要なUInt32の振り分け値です。", detail: ["受取先が指定したタグだけを使用してください。誤りや不足の回復は受取先に依存する場合があります。", "入力した場合は正確なタグを固定して検証します。"], guideSection: "create-and-freeze" },
  "settlement-asset": { title: "精算資産", short: "請求内の全支払枠で同じ固定資産を使います。", detail: ["XRPはネイティブ資産、公式RLUSDはネットワークごとの通貨と発行者で識別します。", "資産交換は行わず、ティッカーだけで発行資産を検証しません。"], guideSection: "xrp" },
  allocation: { title: "割り当てと受取人負担分", short: "入力方式は作成前に正確な固定金額へ変換されます。", detail: ["均等、個別金額、割合、比率は固定精度のPaymentSlot金額になります。", "受取人負担分は会計値で、自己送金や支払枠を作りません。"], guideSection: "create-and-freeze" },
  "capability-privacy": { title: "権限リンクのプライバシー", short: "管理、進捗、支払い、準備、証明リンクは権限が異なります。", detail: ["各非公開リンクは対象者だけに共有し、管理リンクを支払者向け案内へ含めないでください。", "ヘルプとガイドは固定公開アンカーを使い、現在の権限フラグメントや下書きをコピーしません。"], guideSection: "capability-links" },
  readiness: { title: "支払い準備状態", short: "ウォレット要求前に支払者と受取人の条件を確認します。", detail: ["ブロックはアカウント、残高、リザーブ、トラストライン、資産条件の変更が必要です。", "取得不能は条件を確認できないため、続行せず再確認します。"], guideSection: "readiness" },
  "xrp-readiness": { title: "XRPの準備状態", short: "金額、手数料、リザーブ条件を満たす利用可能XRPが必要です。", detail: ["表示残高と利用可能XRPは、XRPLリザーブのため一致しない場合があります。", "支払い要求前に受取先アカウントも確認します。"], guideSection: "readiness" },
  "rlusd-readiness": { title: "RLUSDの準備状態", short: "公式トラストライン、残高、受取可能性、利用可能XRPが必要です。", detail: ["TrustSetは公式トラストラインを設定しますが、請求額を送金せずRLUSD残高も増やしません。", "ネットワーク手数料とリザーブ条件にはXRPが必要です。"], guideSection: "readiness" },
  trustset: { title: "公式RLUSD TrustSet", short: "公式RLUSDを保有する準備であり、請求の支払いではありません。", detail: ["準備要求ではアカウント、ネットワーク、公式通貨、発行者、上限を固定します。", "検証済みトラストラインを確認してから支払いへ戻ります。"], guideSection: "trustset" },
  "payment-status": { title: "支払いステータス", short: "署名済みや送信済みは台帳検証済みと同じではありません。", detail: ["取引が不確かな間は確認を続け、代替支払いを止めます。", "固定済みの全条件と一致する検証済み取引を確認した後だけ支払済みになります。"], guideSection: "status-meanings" },
  verification: { title: "台帳検証", short: "Xamanテンプレートと検証済み台帳が正確に一致して初めて支払済みになります。", detail: ["支払者、受取先、資産、金額、タグ、InvoiceID、受渡結果を確認します。", "レシート、PaymentSlot、請求進捗を原子的な精算経路で保存します。"], guideSection: "verification" },
  "safe-recovery": { title: "安全な復旧", short: "以前の試行を安全に照合した後だけ再試行できます。", detail: ["不確かな送金がなければ拒否や期限切れを再試行できます。", "保留、不一致、重複、複数候補は自動置換せず待機または確認します。"], guideSection: "recovery" },
  "review-required": { title: "確認が必要な支払い", short: "観測台帳情報だけでは固定済み負担を安全に証明できません。", detail: ["管理画面で予定条件と観測情報を比較し、手動の支払済み操作は提供しません。", "別の試行には以前の資金移動と重複支払いの危険への明示確認が必要です。"], guideSection: "review-required" },
  "partial-completion": { title: "部分完了", short: "各支払枠は独立し、検証済み支払いは維持されます。", detail: ["1人の拒否、準備不足、保留、要確認が他の検証済み送金を取り消すことはありません。", "全員一括の原子的送金ではなく、検証済み額と残額を分けて表示します。"], guideSection: "partial-completion" },
  "incomplete-closure": { title: "未完了終了", short: "検証済みレシートを保持し、未払い枠の新規要求を停止します。", detail: ["検証済み送金を取消・自動返金せず、請求は再開できません。", "終了前に説明と正確な確認文字列を受け入れる必要があります。"], guideSection: "incomplete-closure" },
  "copy-to-revise": { title: "コピーして修正", short: "固定済み条件を変えず、別の編集可能な下書きを作ります。", detail: ["編集可能な請求情報と最終割り当てをブラウザセッションへコピーします。", "Bill、PaymentSlot、権限、InvoiceID、リンクを新規生成し、元の請求は変更しません。"], guideSection: "copy-to-revise" },
  "destructive-confirmation": { title: "破壊的操作の確認", short: "製品状態へ不可逆な影響を与える操作です。", detail: ["確認文を入力する前に、対象と全説明を確認してください。", "入力確認は誤操作を防ぎますが、返金や台帳取引の取消は行いません。"], guideSection: "incomplete-closure" },
  "security-limitations": { title: "安全性と制限", short: "対応情報を検証しますが、XRPL送金の取消や保険は提供しません。", detail: ["署名前にネットワーク、受取先、Destination Tag、資産、発行者、金額を確認してください。", "鍵復旧、代理署名、資産交換、可用性保証、受取人への返金強制はできません。"], guideSection: "security-limitations" },
};

const ko: Record<HelpTopicId, TopicCopy> = {
  overview: { title: "Group Pay 작동 방식", short: "각 결제자가 수취인에게 독립적으로 직접 전송합니다.", detail: ["Group Pay는 청구를 조정하지만 결제자 자금을 받거나 모으지 않습니다.", "완료에는 지갑 서명이나 콜백이 아니라 일치하는 검증 XRPL 거래가 필요합니다."], guideSection: "overview" },
  roles: { title: "청구 역할", short: "청구 운영자, 수취인, 결제자는 서로 다른 역할입니다.", detail: ["운영자는 청구를 관리하고 수취인은 전송을 받으며 각 결제자는 자신의 의무에만 서명합니다.", "한 사람이 여러 역할을 맡아도 링크와 결제 사실의 범위는 분리됩니다."], guideSection: "roles" },
  "payment-modes": { title: "결제 모드", short: "대표자 환급 또는 외부 수취인 직접 결제를 선택합니다.", detail: ["대표자 모드는 자기 전송 없는 수취인 부담 회계를 기록할 수 있습니다.", "직접 모드는 전체 청구 금액을 결제 슬롯에 배정합니다."], guideSection: "payment-modes" },
  recipient: { title: "수취인 계정", short: "참가자 결제를 직접 받는 XRPL 계정입니다.", detail: ["수취인, 네트워크, 자산 및 Destination Tag는 청구 고정 후 변경할 수 없습니다.", "검증된 전송은 되돌릴 수 없으므로 주소를 주의 깊게 확인하십시오."], guideSection: "create-and-freeze" },
  "destination-tag": { title: "Destination Tag", short: "일부 거래소나 수탁 수취인이 요구하는 UInt32 라우팅 값입니다.", detail: ["수취인이 제공한 태그만 사용하십시오. 누락이나 오류의 복구는 수취인에게 의존할 수 있습니다.", "태그가 있으면 정확한 값을 고정하고 검증합니다."], guideSection: "create-and-freeze" },
  "settlement-asset": { title: "정산 자산", short: "이 청구의 모든 결제 슬롯은 같은 고정 자산을 사용합니다.", detail: ["XRP는 네이티브이고 공식 RLUSD는 네트워크별 통화와 발행자로 식별합니다.", "Group Pay는 자산을 교환하거나 티커만으로 발행 자산을 검증하지 않습니다."], guideSection: "xrp" },
  allocation: { title: "배정과 수취인 부담분", short: "입력 규칙은 생성 전에 정확한 고정 결제 금액으로 확정됩니다.", detail: ["균등, 사용자 지정, 비율 및 지분 입력은 고정 정밀도 PaymentSlot 금액이 됩니다.", "수취인 부담분은 회계 값이며 자기 전송이나 결제 슬롯을 만들지 않습니다."], guideSection: "create-and-freeze" },
  "capability-privacy": { title: "기능 링크 개인정보", short: "관리, 진행, 결제, 설정 및 증명 링크는 범위가 다릅니다.", detail: ["각 비공개 링크는 의도한 대상에게만 공유하고 관리 링크를 결제자 안내에 넣지 마십시오.", "도움말과 가이드는 고정 공개 앵커를 사용하며 현재 기능 조각이나 초안을 복사하지 않습니다."], guideSection: "capability-links" },
  readiness: { title: "결제 준비 상태", short: "지갑 요청 전에 결제자와 수취인 사실을 확인합니다.", detail: ["차단은 계정, 잔액, 준비금, 트러스트라인 또는 자산 조건 변경이 필요함을 뜻합니다.", "사용 불가는 사실을 확인할 수 없으므로 계속하지 않고 재확인합니다."], guideSection: "readiness" },
  "xrp-readiness": { title: "XRP 준비 상태", short: "금액, 수수료 및 준비금 조건을 충족할 사용 가능 XRP가 필요합니다.", detail: ["XRPL 준비금 때문에 표시 잔액과 사용 가능 XRP가 다를 수 있습니다.", "결제 요청 전에 수취인 계정도 확인합니다."], guideSection: "readiness" },
  "rlusd-readiness": { title: "RLUSD 준비 상태", short: "공식 트러스트라인, 잔액, 수취 준비 및 사용 가능 XRP가 필요합니다.", detail: ["TrustSet은 공식 트러스트라인을 설정하지만 청구 금액을 보내거나 RLUSD 잔액을 제공하지 않습니다.", "네트워크 수수료와 준비금 조건에는 XRP가 필요합니다."], guideSection: "readiness" },
  trustset: { title: "공식 RLUSD TrustSet", short: "공식 RLUSD 보유 준비이며 청구 결제가 아닙니다.", detail: ["설정 요청은 계정, 네트워크, 공식 통화, 발행자 및 한도를 고정합니다.", "검증된 트러스트라인을 확인한 뒤 결제로 돌아갑니다."], guideSection: "trustset" },
  "payment-status": { title: "결제 상태", short: "서명 또는 제출은 원장 검증 완료와 같지 않습니다.", detail: ["거래가 불확실한 동안 계속 확인하고 교체 결제를 차단합니다.", "고정된 모든 결제 사실과 일치하는 검증 거래 후에만 결제 완료가 됩니다."], guideSection: "status-meanings" },
  verification: { title: "원장 검증", short: "Xaman 템플릿과 검증 원장이 정확히 일치해야 결제 완료가 됩니다.", detail: ["결제자, 수취인, 자산, 금액, 태그, InvoiceID 및 전달 결과를 확인합니다.", "영수증, PaymentSlot 상태 및 청구 진행을 원자적 정산 경로로 저장합니다."], guideSection: "verification" },
  "safe-recovery": { title: "안전한 복구", short: "이전 시도를 안전하게 대조한 뒤에만 재시도할 수 있습니다.", detail: ["불확실한 전송이 없다면 거절 또는 만료를 재시도할 수 있습니다.", "보류, 불일치, 중복 또는 복수 후보는 자동 교체 대신 대기나 검토가 필요합니다."], guideSection: "recovery" },
  "review-required": { title: "검토가 필요한 결제", short: "관찰 원장 사실만으로 고정 의무를 안전하게 증명할 수 없습니다.", detail: ["관리 검토는 예상과 관찰 사실을 비교하며 수동 결제 완료 기능을 제공하지 않습니다.", "다른 시도에는 이전 가치 이동과 중복 결제 위험에 대한 명시적 확인이 필요합니다."], guideSection: "review-required" },
  "partial-completion": { title: "부분 완료", short: "각 결제 슬롯은 독립적이며 검증 결제는 완료 상태로 유지됩니다.", detail: ["한 결제자의 거절, 설정 문제, 보류 또는 검토가 다른 검증 전송을 되돌리지 않습니다.", "전체 그룹 원자 결제가 아니며 검증 금액과 남은 금액을 분리합니다."], guideSection: "partial-completion" },
  "incomplete-closure": { title: "미완료 종료", short: "검증 영수증을 보존하면서 미결제 슬롯의 새 요청을 중지합니다.", detail: ["검증 전송을 취소하거나 자동 환불하지 않으며 청구를 다시 열 수 없습니다.", "종료 전에 공개 사항과 정확한 입력 확인을 승인해야 합니다."], guideSection: "incomplete-closure" },
  "copy-to-revise": { title: "복사하여 수정", short: "고정 사실을 변경하지 않고 별도 편집 초안을 만듭니다.", detail: ["편집 가능한 청구 사실과 최종 배정을 브라우저 세션에 복사합니다.", "Bill, PaymentSlot, 기능, InvoiceID 및 링크를 새로 만들고 원본은 변경하지 않습니다."], guideSection: "copy-to-revise" },
  "destructive-confirmation": { title: "파괴적 작업 확인", short: "제품 상태에 되돌릴 수 없는 결과를 주는 작업입니다.", detail: ["확인 문구를 입력하기 전에 대상과 모든 승인 문장을 검토하십시오.", "입력 확인은 실수를 줄이지만 환불이나 원장 거래 취소를 만들지 않습니다."], guideSection: "incomplete-closure" },
  "security-limitations": { title: "보안과 제한", short: "지원 사실을 검증하지만 XRPL 전송을 취소하거나 보장하지 않습니다.", detail: ["서명 전에 네트워크, 수취인, Destination Tag, 자산, 발행자 및 금액을 확인하십시오.", "키 복구, 대리 서명, 자산 교환, 가용성 보장 또는 수취인의 환불 강제는 할 수 없습니다."], guideSection: "security-limitations" },
};

const registry: Record<Locale, Record<HelpTopicId, TopicCopy>> = { en, ja, ko };

export function getHelpTopic(locale: Locale, id: HelpTopicId): HelpTopic {
  return { id, ...(registry[locale]?.[id] ?? en[id]) };
}

export function helpGuideHref(id: HelpTopicId): string {
  return guideHref(en[id].guideSection);
}
