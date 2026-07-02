import type { Locale } from "@/features/localization/catalog";

export const GUIDE_SECTION_IDS = [
  "overview",
  "roles",
  "payment-modes",
  "xrp",
  "rlusd",
  "trustset",
  "payment-flow",
  "status-meanings",
  "failures",
  "recovery",
  "privacy",
  "security-limitations",
  "faq",
] as const;

export type GuideSectionId = (typeof GUIDE_SECTION_IDS)[number];

export type GuideSection = {
  id: GuideSectionId;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

type GuideLocaleContent = {
  eyebrow: string;
  title: string;
  description: string;
  contentsLabel: string;
  homeLabel: string;
  openInNewTabLabel: string;
  sections: readonly GuideSection[];
};

const en: GuideLocaleContent = {
  eyebrow: "Product guide",
  title: "How XRPL Group Pay works",
  description:
    "A public guide to direct XRP and official RLUSD settlement, independent payer obligations, wallet preparation, verification, and safe recovery.",
  contentsLabel: "On this page",
  homeLabel: "Back to home",
  openInNewTabLabel: "Open full Guide",
  sections: [
    {
      id: "overview",
      title: "Overview",
      paragraphs: [
        "XRPL Group Pay coordinates a shared Bill without receiving or pooling participant funds. Each payer sends an independent XRPL Payment directly to the frozen recipient account.",
        "The application marks a payment complete only after a validated ledger transaction matches the expected payer, destination, asset, amount, tags, and InvoiceID.",
      ],
    },
    {
      id: "roles",
      title: "Roles",
      paragraphs: [
        "The Bill operator creates and manages the Bill. The recipient is the XRPL account that receives funds. A payer reviews and signs one independent Payment from their own wallet.",
        "One person may hold more than one role, but the application does not treat the roles as interchangeable.",
      ],
    },
    {
      id: "payment-modes",
      title: "Payment modes",
      paragraphs: [
        "Pay a representative when one person receives reimbursements, fees, or shared-purchase payments. A recipient-funded portion may be recorded with no self-transfer.",
        "Pay a store or organizer directly when every payer sends funds to an external recipient. In this mode the full Bill total is assigned to payer slots.",
      ],
    },
    {
      id: "xrp",
      title: "Paying with XRP",
      paragraphs: [
        "XRP is the native XRPL asset. The frozen obligation is shown in XRP, while the wallet determines the network fee separately.",
        "The payer needs enough spendable XRP for both the amount and the applicable fee and reserve constraints.",
      ],
    },
    {
      id: "rlusd",
      title: "Paying with official RLUSD",
      paragraphs: [
        "RLUSD is an issued XRPL asset. Group Pay freezes the official network-specific issuer together with the amount and never verifies RLUSD by ticker alone.",
        "The payer needs the official trust line, enough RLUSD balance, and enough spendable XRP for fees and reserve requirements.",
      ],
    },
    {
      id: "trustset",
      title: "RLUSD TrustSet preparation",
      paragraphs: [
        "A TrustSet authorizes the wallet to hold official RLUSD on the selected network. It does not transfer the Bill amount and it does not provide an RLUSD balance.",
        "Group Pay verifies the resulting trust line on XRPL before presenting the wallet as ready.",
      ],
    },
    {
      id: "payment-flow",
      title: "Payment flow",
      paragraphs: [
        "The payer checks the Bill details and readiness result, reviews the final asset and amount, then continues to Xaman. Opening or signing a wallet request does not prove payment.",
        "After submission, Group Pay waits for validated-ledger verification. Each payer slot settles independently, so one failure does not reverse another payer's completed transfer.",
      ],
    },
    {
      id: "status-meanings",
      title: "Status meanings",
      paragraphs: [
        "Unpaid means no matching validated Payment is recorded. In progress covers wallet approval, submission, and ledger validation. Complete means the frozen obligation has been verified.",
        "Action required means setup, retry, expiry handling, or human review is needed. Destructive is reserved for confirmed failure or an unsafe condition.",
      ],
    },
    {
      id: "failures",
      title: "Common failure patterns",
      paragraphs: [
        "Common conditions include wallet rejection or expiry, temporary provider failure, missing RLUSD trust line, insufficient balance, submitted but unvalidated transactions, and validated failures.",
        "A wrong payer, destination, amount, asset, issuer, tag, InvoiceID, partial payment, cross-currency payment, duplicate, or multiple candidate requires review rather than automatic replacement.",
      ],
    },
    {
      id: "recovery",
      title: "Safe recovery",
      paragraphs: [
        "A new wallet handoff is offered only when policy classifies the condition as safe to retry. Uncertain submissions remain in wait-and-recheck or review-required state.",
        "The application reconciles the ledger before replacing a prior handoff and never allows an administrator to manually declare an unmatched transaction verified.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy and shared links",
      paragraphs: [
        "Management, read-only progress, participant payment, setup, and proof links have different access scopes. Share each capability only with its intended viewer.",
        "Guide and help links contain only fixed public paths and anchors. They never include capability fragments, payer data, draft values, or private Bill content.",
      ],
    },
    {
      id: "security-limitations",
      title: "Security and limitations",
      paragraphs: [
        "Group Pay is non-custodial and cannot sign for a payer, reverse a validated transfer, refund automatically, or make an atomic all-or-nothing group payment.",
        "Xaman and XRPL availability can be delayed. Mainnet transfers use real assets and are irreversible, so the network, recipient, asset, issuer, and amount must be reviewed before signing.",
      ],
    },
    {
      id: "faq",
      title: "FAQ",
      paragraphs: [
        "Does creating a Bill move funds? No. It freezes payment conditions and creates capability links.",
        "Can Group Pay exchange XRP and RLUSD? No. Every Bill uses one frozen settlement asset and the application performs no conversion.",
        "Can one failed payer cancel everyone else? No. Every payer slot is independent and already verified payments remain paid.",
      ],
    },
  ],
};

const ja: GuideLocaleContent = {
  eyebrow: "製品ガイド",
  title: "XRPL Group Payの仕組み",
  description:
    "XRPと公式RLUSDの直接精算、参加者ごとの独立した支払い、ウォレット準備、台帳検証、安全な復旧を説明します。",
  contentsLabel: "このページの内容",
  homeLabel: "ホームへ戻る",
  openInNewTabLabel: "完全版ガイドを開く",
  sections: [
    { id: "overview", title: "概要", paragraphs: ["XRPL Group Payは参加者の資金を受け取ったりまとめたりせず、共同請求を調整します。各支払者は固定された受取先へ独立したXRPL Paymentを直接送ります。", "支払者、受取先、資産、金額、タグ、InvoiceIDが一致する検証済み台帳取引を確認した後だけ、支払済みになります。"] },
    { id: "roles", title: "役割", paragraphs: ["請求の操作担当は請求を作成・管理します。受取人は資金を受け取るXRPLアカウントです。支払う人は自分のウォレットから1件の独立したPaymentを確認して署名します。", "同じ人が複数の役割を持つことはできますが、役割は同じ意味として扱いません。"] },
    { id: "payment-modes", title: "支払いモード", paragraphs: ["代表者へ支払うモードは、立替精算、会費、共同購入などで1人が受け取る場合に使います。受取人負担分は自己送金なしで記録できます。", "店舗や主催者へ直接支払うモードでは、全員が外部の受取先へ直接送金し、請求総額の全額を支払枠へ割り当てます。"] },
    { id: "xrp", title: "XRPで支払う", paragraphs: ["XRPはXRPLのネイティブ資産です。負担額はXRPで固定され、ネットワーク手数料はウォレット側で別に決まります。", "支払額に加えて、手数料とリザーブ条件を満たす利用可能XRPが必要です。"] },
    { id: "rlusd", title: "公式RLUSDで支払う", paragraphs: ["RLUSDはXRPL上の発行資産です。Group Payはネットワークごとの公式発行者を金額と一緒に固定し、ティッカーだけでは検証しません。", "公式トラストライン、十分なRLUSD残高、手数料とリザーブ用の利用可能XRPが必要です。"] },
    { id: "trustset", title: "RLUSD TrustSetの準備", paragraphs: ["TrustSetは選択したネットワークの公式RLUSDを保有できるようにする設定です。請求額の送金ではなく、RLUSD残高も増えません。", "Group PayはXRPL上でトラストラインを確認してから準備完了と表示します。"] },
    { id: "payment-flow", title: "支払いの流れ", paragraphs: ["支払者は請求内容と準備状態を確認し、最終的な資産と金額を確認してXamanへ進みます。ウォレットを開いたことや署名したことだけでは支払い証明になりません。", "送信後は検証済み台帳で確認します。各支払枠は独立しているため、1人の失敗が他の完了済み送金を取り消すことはありません。"] },
    { id: "status-meanings", title: "ステータスの意味", paragraphs: ["未払いは一致する検証済みPaymentがない状態です。進行中はウォレット承認、送信、台帳検証を示します。完了は固定された負担額の検証が終わった状態です。", "対応が必要は準備、再試行、期限切れ対応、人による確認が必要な状態です。破壊的状態は確定した失敗や危険な条件だけに使います。"] },
    { id: "failures", title: "よくある失敗", paragraphs: ["ウォレットでの拒否や期限切れ、一時的な接続障害、RLUSDトラストライン不足、残高不足、未検証の送信、検証済み失敗などがあります。", "支払者、受取先、金額、資産、発行者、タグ、InvoiceIDの不一致、部分送金、異なる通貨、重複、複数候補は自動再作成せず確認対象になります。"] },
    { id: "recovery", title: "安全な復旧", paragraphs: ["ポリシー上安全に再試行できる場合だけ、新しいウォレット引き渡しを表示します。送信状況が不確かな場合は再確認待ちまたは要確認のままです。", "以前の引き渡しを置き換える前に台帳を照合し、一致しない取引を管理者が手動で検証済みにすることはできません。"] },
    { id: "privacy", title: "プライバシーと共有リンク", paragraphs: ["管理、閲覧専用、参加者支払い、準備、証明の各リンクは権限範囲が異なります。対象者以外へ共有しないでください。", "ガイドとヘルプのURLは固定された公開パスとアンカーだけを使い、能力トークン、支払者情報、下書き、非公開の請求内容を含みません。"] },
    { id: "security-limitations", title: "安全性と制限", paragraphs: ["Group Payは資金を預からず、支払者の代理署名、検証済み送金の取消、自動返金、全員一括の原子的決済はできません。", "XamanやXRPLの応答が遅れる場合があります。Mainnet送金は実資産で不可逆なので、ネットワーク、受取先、資産、発行者、金額を署名前に確認してください。"] },
    { id: "faq", title: "よくある質問", paragraphs: ["請求作成で資金は動きますか？ 動きません。支払い条件を固定し、リンクを作成します。", "XRPとRLUSDを交換できますか？ できません。請求ごとに1つの精算資産を固定し、交換は行いません。", "1人の失敗で全員が取り消されますか？ 取り消されません。各支払枠は独立し、検証済み支払いは維持されます。"] },
  ],
};

const ko: GuideLocaleContent = {
  eyebrow: "제품 가이드",
  title: "XRPL Group Pay 작동 방식",
  description:
    "XRP와 공식 RLUSD 직접 정산, 독립 결제 의무, 지갑 준비, 원장 검증 및 안전한 복구를 설명합니다.",
  contentsLabel: "이 페이지의 내용",
  homeLabel: "홈으로 돌아가기",
  openInNewTabLabel: "전체 가이드 열기",
  sections: [
    { id: "overview", title: "개요", paragraphs: ["XRPL Group Pay는 참가자 자금을 받거나 모으지 않고 공동 청구를 조정합니다. 각 결제자는 고정된 수취인 계정으로 독립적인 XRPL Payment를 직접 보냅니다.", "결제자, 수취인, 자산, 금액, 태그 및 InvoiceID가 일치하는 검증된 원장 거래가 확인된 뒤에만 결제 완료로 표시됩니다."] },
    { id: "roles", title: "역할", paragraphs: ["청구 운영자는 청구를 만들고 관리합니다. 수취인은 자금을 받는 XRPL 계정입니다. 결제자는 자신의 지갑에서 하나의 독립 Payment를 검토하고 서명합니다.", "한 사람이 여러 역할을 맡을 수 있지만 각 역할을 같은 의미로 취급하지 않습니다."] },
    { id: "payment-modes", title: "결제 모드", paragraphs: ["대표자에게 지불 모드는 환급, 회비 또는 공동 구매처럼 한 사람이 수취하는 경우에 사용합니다. 수취인 부담분은 자기 송금 없이 기록할 수 있습니다.", "상점 또는 주최자에게 직접 지불 모드에서는 모든 결제자가 외부 수취인에게 직접 보내며 전체 금액이 결제 슬롯에 배정됩니다."] },
    { id: "xrp", title: "XRP 결제", paragraphs: ["XRP는 XRPL의 네이티브 자산입니다. 의무 금액은 XRP로 고정되며 네트워크 수수료는 지갑이 별도로 결정합니다.", "결제 금액과 수수료 및 준비금 조건을 충족할 사용 가능 XRP가 필요합니다."] },
    { id: "rlusd", title: "공식 RLUSD 결제", paragraphs: ["RLUSD는 XRPL 발행 자산입니다. Group Pay는 네트워크별 공식 발행자를 금액과 함께 고정하며 티커만으로 검증하지 않습니다.", "공식 트러스트라인, 충분한 RLUSD 잔액, 수수료와 준비금용 사용 가능 XRP가 필요합니다."] },
    { id: "trustset", title: "RLUSD TrustSet 준비", paragraphs: ["TrustSet은 선택한 네트워크의 공식 RLUSD를 보유할 수 있게 하는 설정입니다. 청구 금액을 전송하지 않으며 RLUSD 잔액을 제공하지도 않습니다.", "Group Pay는 XRPL에서 트러스트라인을 확인한 뒤 준비 완료로 표시합니다."] },
    { id: "payment-flow", title: "결제 흐름", paragraphs: ["결제자는 청구와 준비 상태를 확인하고 최종 자산과 금액을 검토한 뒤 Xaman으로 이동합니다. 지갑 요청을 열거나 서명한 것만으로 결제가 증명되지는 않습니다.", "제출 후 검증된 원장을 확인합니다. 각 결제 슬롯은 독립적이므로 한 명의 실패가 다른 완료 거래를 되돌리지 않습니다."] },
    { id: "status-meanings", title: "상태 의미", paragraphs: ["미결제는 일치하는 검증 거래가 없는 상태입니다. 진행 중은 지갑 승인, 제출 및 원장 검증을 포함합니다. 완료는 고정 의무가 검증된 상태입니다.", "조치 필요는 설정, 재시도, 만료 처리 또는 사람의 검토가 필요함을 뜻합니다. 파괴적 상태는 확정 실패나 위험 조건에만 사용합니다."] },
    { id: "failures", title: "일반적인 실패", paragraphs: ["지갑 거절 또는 만료, 일시적 공급자 장애, RLUSD 트러스트라인 없음, 잔액 부족, 제출됐지만 미검증 상태, 검증된 실패가 포함됩니다.", "결제자, 수취인, 금액, 자산, 발행자, 태그, InvoiceID 불일치와 부분 결제, 교차 통화, 중복 또는 복수 후보는 자동 교체가 아니라 검토가 필요합니다."] },
    { id: "recovery", title: "안전한 복구", paragraphs: ["정책상 안전한 재시도로 분류된 경우에만 새 지갑 요청을 제공합니다. 제출이 불확실하면 재확인 대기 또는 검토 필요 상태를 유지합니다.", "이전 요청을 교체하기 전에 원장을 대조하며 일치하지 않는 거래를 관리자가 임의로 검증 완료로 바꿀 수 없습니다."] },
    { id: "privacy", title: "개인정보와 공유 링크", paragraphs: ["관리, 읽기 전용 진행, 참가자 결제, 준비 및 증명 링크는 서로 다른 접근 범위를 가집니다. 각 링크는 의도한 대상에게만 공유하십시오.", "가이드와 도움말 URL은 고정 공개 경로와 앵커만 사용하며 기능 토큰, 결제자 정보, 초안 값 또는 비공개 청구 내용을 포함하지 않습니다."] },
    { id: "security-limitations", title: "보안과 한계", paragraphs: ["Group Pay는 자금을 보관하지 않으며 결제자 대신 서명하거나 검증된 전송을 취소하거나 자동 환불하거나 원자적 그룹 결제를 만들 수 없습니다.", "Xaman 또는 XRPL 응답이 지연될 수 있습니다. Mainnet 전송은 실제 자산이며 되돌릴 수 없으므로 서명 전에 네트워크, 수취인, 자산, 발행자와 금액을 확인하십시오."] },
    { id: "faq", title: "자주 묻는 질문", paragraphs: ["청구를 만들면 자금이 이동합니까? 아닙니다. 결제 조건을 고정하고 기능 링크를 만듭니다.", "XRP와 RLUSD를 교환할 수 있습니까? 아닙니다. 각 청구는 하나의 정산 자산을 고정하며 환전하지 않습니다.", "한 명의 실패가 모두를 취소합니까? 아닙니다. 각 슬롯은 독립적이며 검증된 결제는 유지됩니다."] },
  ],
};

const contentByLocale: Record<Locale, GuideLocaleContent> = { en, ja, ko };

export function getGuideContent(locale: Locale): GuideLocaleContent {
  return contentByLocale[locale] ?? en;
}

export function guideHref(section: GuideSectionId): `/guide#${GuideSectionId}` {
  return `/guide#${section}`;
}
