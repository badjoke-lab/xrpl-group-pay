import type { Locale } from "./catalog";

const messages = {
  en: {
    eyebrow: "RLUSD account preparation",
    title: "Prepare this wallet for official RLUSD",
    description:
      "Create or confirm the official network-specific RLUSD trust line before receiving or holding the amount required for this Group Pay request.",
    loading: "Loading the preparation link…",
    unavailableTitle: "Preparation link unavailable",
    unavailableBody:
      "This link is invalid, expired, or cannot be loaded right now.",
    account: "Wallet account",
    network: "XRPL network",
    asset: "Asset",
    issuer: "Official issuer",
    required: "Required amount",
    limit: "Trust limit",
    noticeTitle: "This is not a payment",
    noticeBody:
      "TrustSet only creates or updates an RLUSD trust line. It does not transfer the bill amount, buy RLUSD, or add funds to this wallet. XRP is still required for the network fee and account reserve.",
    start: "Open RLUSD setup in Xaman",
    retry: "Create a new setup request",
    check: "Check setup status",
    open: "Open Xaman",
    qrAlt: "QR code for the RLUSD TrustSet request",
    waitingTitle: "Approve the TrustSet in Xaman",
    waitingBody:
      "Review the official RLUSD issuer, trust limit, account, and network before signing.",
    rejectedTitle: "Setup was cancelled",
    rejectedBody:
      "No TrustSet was completed. You can create a new setup request safely.",
    expiredTitle: "Setup request expired",
    expiredBody:
      "No TrustSet was confirmed. Create a new setup request to continue.",
    verifyingTitle: "Checking the XRPL trust line",
    verifyingBody:
      "The transaction was submitted. This page will report ready only after the validated ledger shows the expected official RLUSD trust line.",
    readyTitle: "Official RLUSD trust line ready",
    readyBody:
      "The validated XRP Ledger now shows the required official RLUSD trust line for this wallet.",
    notRequiredTitle: "No TrustSet is required",
    notRequiredBody:
      "This wallet already has sufficient official RLUSD trust-line capacity for this request.",
    failedTitle: "Setup needs attention",
    failedBody:
      "The expected trust line could not be confirmed. Check the wallet state and try again.",
    working: "Working…",
    genericError: "The RLUSD setup could not be completed right now.",
    recipientPurpose: "Receive RLUSD",
    payerPurpose: "Hold and pay RLUSD",
  },
  ja: {
    eyebrow: "RLUSD口座準備",
    title: "このウォレットで公式RLUSDを利用できるようにする",
    description:
      "このGroup Payで必要なRLUSDを受け取る、または保有する前に、ネットワーク別の公式RLUSDトラストラインを作成・確認します。",
    loading: "準備リンクを読み込んでいます…",
    unavailableTitle: "準備リンクを利用できません",
    unavailableBody:
      "リンクが無効か、期限切れか、現在読み込めない状態です。",
    account: "対象ウォレット",
    network: "XRPLネットワーク",
    asset: "資産",
    issuer: "公式発行元",
    required: "必要額",
    limit: "トラスト上限",
    noticeTitle: "これは支払いではありません",
    noticeBody:
      "TrustSetはRLUSDトラストラインを作成・更新するだけです。請求額の送金、RLUSDの購入、残高の入金は行いません。ネットワーク手数料と口座準備金にはXRPが必要です。",
    start: "XamanでRLUSD設定を開く",
    retry: "新しい設定リクエストを作る",
    check: "設定状況を確認",
    open: "Xamanを開く",
    qrAlt: "RLUSD TrustSetリクエストのQRコード",
    waitingTitle: "XamanでTrustSetを承認してください",
    waitingBody:
      "署名前に、公式RLUSD発行元、トラスト上限、対象口座、ネットワークを確認してください。",
    rejectedTitle: "設定をキャンセルしました",
    rejectedBody:
      "TrustSetは完了していません。安全に新しい設定リクエストを作成できます。",
    expiredTitle: "設定リクエストの期限が切れました",
    expiredBody:
      "TrustSetは確認されていません。新しい設定リクエストを作成してください。",
    verifyingTitle: "XRPL上のトラストラインを確認しています",
    verifyingBody:
      "トランザクションは送信されました。検証済みLedgerで公式RLUSDトラストラインを確認できた場合のみ準備完了になります。",
    readyTitle: "公式RLUSDトラストラインの準備が完了しました",
    readyBody:
      "検証済みXRP Ledgerで、このウォレットに必要な公式RLUSDトラストラインを確認しました。",
    notRequiredTitle: "TrustSetは不要です",
    notRequiredBody:
      "このウォレットには、今回必要な額を扱える公式RLUSDトラストラインがすでにあります。",
    failedTitle: "設定内容の確認が必要です",
    failedBody:
      "必要なトラストラインを確認できませんでした。ウォレットの状態を確認して再試行してください。",
    working: "処理中…",
    genericError: "現在RLUSD設定を完了できません。",
    recipientPurpose: "RLUSDを受け取る",
    payerPurpose: "RLUSDを保有して支払う",
  },
  ko: {
    eyebrow: "RLUSD 계정 준비",
    title: "이 지갑에서 공식 RLUSD를 사용할 수 있도록 준비",
    description:
      "이 Group Pay 요청에 필요한 RLUSD를 받거나 보유하기 전에 네트워크별 공식 RLUSD 신뢰선을 생성하거나 확인합니다.",
    loading: "준비 링크를 불러오는 중…",
    unavailableTitle: "준비 링크를 사용할 수 없습니다",
    unavailableBody:
      "링크가 유효하지 않거나 만료되었거나 현재 불러올 수 없습니다.",
    account: "대상 지갑",
    network: "XRPL 네트워크",
    asset: "자산",
    issuer: "공식 발행자",
    required: "필요 금액",
    limit: "신뢰 한도",
    noticeTitle: "이 작업은 결제가 아닙니다",
    noticeBody:
      "TrustSet은 RLUSD 신뢰선만 생성하거나 변경합니다. 청구 금액 전송, RLUSD 구매 또는 잔액 충전은 하지 않습니다. 네트워크 수수료와 계정 준비금에는 XRP가 필요합니다.",
    start: "Xaman에서 RLUSD 설정 열기",
    retry: "새 설정 요청 만들기",
    check: "설정 상태 확인",
    open: "Xaman 열기",
    qrAlt: "RLUSD TrustSet 요청 QR 코드",
    waitingTitle: "Xaman에서 TrustSet을 승인하세요",
    waitingBody:
      "서명하기 전에 공식 RLUSD 발행자, 신뢰 한도, 대상 계정 및 네트워크를 확인하세요.",
    rejectedTitle: "설정이 취소되었습니다",
    rejectedBody:
      "TrustSet이 완료되지 않았습니다. 새 설정 요청을 안전하게 만들 수 있습니다.",
    expiredTitle: "설정 요청이 만료되었습니다",
    expiredBody:
      "TrustSet이 확인되지 않았습니다. 계속하려면 새 설정 요청을 만드세요.",
    verifyingTitle: "XRPL 신뢰선을 확인하는 중",
    verifyingBody:
      "트랜잭션이 제출되었습니다. 검증된 원장에서 예상한 공식 RLUSD 신뢰선이 확인된 경우에만 준비 완료로 표시됩니다.",
    readyTitle: "공식 RLUSD 신뢰선 준비 완료",
    readyBody:
      "검증된 XRP Ledger에서 이 지갑에 필요한 공식 RLUSD 신뢰선을 확인했습니다.",
    notRequiredTitle: "TrustSet이 필요하지 않습니다",
    notRequiredBody:
      "이 지갑에는 이번 요청에 충분한 공식 RLUSD 신뢰선 용량이 이미 있습니다.",
    failedTitle: "설정 확인이 필요합니다",
    failedBody:
      "필요한 신뢰선을 확인할 수 없습니다. 지갑 상태를 확인한 후 다시 시도하세요.",
    working: "처리 중…",
    genericError: "현재 RLUSD 설정을 완료할 수 없습니다.",
    recipientPurpose: "RLUSD 받기",
    payerPurpose: "RLUSD 보유 및 결제",
  },
} as const;

export type TrustSetMessageKey = keyof (typeof messages)["en"];

export function trustSetTranslate(locale: Locale, key: TrustSetMessageKey) {
  return messages[locale]?.[key] ?? messages.en[key];
}
