import type { Locale } from "./catalog";
import { useLocalization } from "./provider";

const catalogs = {
  en: {
    pageEyebrow: "Bill progress",
    pageTitle: "Track settlement without trusting wallet status alone.",
    pageBody:
      "Each slot changes only after the submitted transaction is independently verified on a validated XRP Ledger.",
    loading: "Loading bill progress",
    linkUnavailable: "Bill progress link unavailable",
    invalidLink:
      "This link is incomplete or invalid. Ask the bill creator for a new progress link.",
    unavailable: "Bill progress unavailable",
    fallback: "The bill progress could not be loaded.",
    retry: "Try again",
    creatorView: "Creator view",
    readOnlyView: "Read-only view",
    representativeMode: "Representative recipient",
    directMode: "Direct recipient",
    exactPayment:
      "Each slot updates only after its exact {asset} Payment is verified on a validated XRP Ledger.",
    issuer: "Official issuer {issuer}",
    refresh: "Refresh status",
    refreshedAt: "Snapshot updated {time}",
    progress: "Settlement progress",
    paidCount: "{paid}/{total} paid",
    billTotal: "Bill total",
    recipientFunded: "Recipient-funded",
    expected: "Expected from payers",
    verified: "Verified",
    remaining: "Remaining",
    payerCount: "Payers",
    payerCountValue: "{paid} verified · {remaining} remaining",
    pending: "Pending slots",
    review: "Needs review",
    complete: "Settlement complete",
    completeBody:
      "All externally payable slots have a durable verified receipt.",
    groupOpen: "Accepting payments",
    groupPartial: "Partially paid",
    groupReview: "Review required",
    groupSettled: "Settled",
    groupClosed: "Closed incomplete",
    slots: "Participant slots",
    adminBody:
      "Creator details are visible because this is the management capability.",
    publicBody:
      "Participant labels, expected wallets, InvoiceIDs, and review diagnostics are hidden in this read-only view.",
    participant: "Participant {number}",
    paymentSlot: "Payment slot {number}",
    expectedWallet: "Expected wallet {wallet}",
    invoiceId: "InvoiceID {invoice}",
    verifiedTx: "Verified transaction {transaction}",
    ledgerIndex: "Ledger {ledger}",
    confirmedAt: "Confirmed {time}",
    updatedAt: "Last status change {time}",
    reviewReason: "Review reason: {reason}",
    publicProof: "View public proof",
    explorer: "Open transaction in XRPL Explorer",
    paid: "Paid",
    needsReview: "Needs review",
    verificationFailed: "Verification failed",
    submitted: "Submitted",
    validating: "Validating",
    awaitingSignature: "Awaiting signature",
    rejected: "Rejected",
    expired: "Request expired",
    unpaid: "Unpaid",
    shareTitle: "Link handling",
    adminShareBody:
      "Save this management link privately. Do not send it to payers or publish it. Use the participant links produced when the Bill was created.",
    publicShareBody:
      "This read-only progress link can be shared with viewers. It hides payer labels, expected wallet addresses, InvoiceIDs, and review diagnostics.",
    copyManagement: "Copy private management link",
    copyReadOnly: "Copy read-only progress link",
    copied: "Link copied",
    copyFailed: "Copy failed",
    noWalletControl:
      "The Bill operator cannot open Xaman or sign a Payment for a payer.",
    actionPaid:
      "No action is required. This slot is backed by a matching validated transaction.",
    actionUnpaid:
      "Send the private participant payment link created with this Bill. The payer must open Xaman and sign for themselves.",
    actionAwaiting:
      "Wait for the payer to approve the existing Xaman request, then refresh this page.",
    actionRejected:
      "Ask the payer to reopen their private payment link. Group Pay reconciles ledger history before allowing a replacement request.",
    actionSubmitted:
      "Do not request another payment. Refresh this page while the same submitted transaction is checked.",
    actionReview:
      "Do not ask the payer to pay again. This slot requires review before any replacement payment can be considered.",
    actionClosed:
      "No new Payment can be started because this Bill is closed.",
    technicalDetails: "Technical details",
  },
  ja: {
    pageEyebrow: "請求の進捗",
    pageTitle: "ウォレット状態だけに頼らず精算状況を確認します。",
    pageBody:
      "各支払い枠は、送信済みトランザクションが検証済みXRP Ledgerで独立確認された場合にのみ更新されます。",
    loading: "請求の進捗を読み込み中",
    linkUnavailable: "請求進捗リンクを利用できません",
    invalidLink:
      "リンクが不完全または無効です。請求作成者から新しい進捗リンクを受け取ってください。",
    unavailable: "請求の進捗を利用できません",
    fallback: "請求の進捗を読み込めませんでした。",
    retry: "再試行",
    creatorView: "作成者表示",
    readOnlyView: "閲覧専用表示",
    representativeMode: "代理受取モード",
    directMode: "直接受取モード",
    exactPayment:
      "各支払い枠は、正確な{asset} Paymentが検証済みXRP Ledgerで確認された場合にのみ更新されます。",
    issuer: "公式発行者 {issuer}",
    refresh: "状態を更新",
    refreshedAt: "スナップショット更新 {time}",
    progress: "精算進捗",
    paidCount: "{paid}/{total} 支払済み",
    billTotal: "請求合計",
    recipientFunded: "受取人負担分",
    expected: "支払者からの回収予定",
    verified: "検証済み",
    remaining: "残額",
    payerCount: "支払者",
    payerCountValue: "{paid}人検証済み・{remaining}人残り",
    pending: "未完了の支払い枠",
    review: "要確認",
    complete: "精算完了",
    completeBody:
      "外部支払い対象の全枠に永続的な検証レシートがあります。",
    groupOpen: "支払い受付中",
    groupPartial: "一部支払済み",
    groupReview: "確認が必要",
    groupSettled: "精算済み",
    groupClosed: "未完了で終了",
    slots: "参加者の支払い枠",
    adminBody:
      "管理権限を使用しているため、作成者向けの詳細を表示しています。",
    publicBody:
      "閲覧専用表示では参加者名、支払予定ウォレット、InvoiceID、確認用診断情報を非表示にしています。",
    participant: "参加者 {number}",
    paymentSlot: "支払い枠 {number}",
    expectedWallet: "支払予定ウォレット {wallet}",
    invoiceId: "InvoiceID {invoice}",
    verifiedTx: "検証済みトランザクション {transaction}",
    ledgerIndex: "Ledger {ledger}",
    confirmedAt: "確認日時 {time}",
    updatedAt: "最終状態更新 {time}",
    reviewReason: "確認理由: {reason}",
    publicProof: "公開証明を見る",
    explorer: "XRPL Explorerでトランザクションを開く",
    paid: "支払済み",
    needsReview: "要確認",
    verificationFailed: "検証失敗",
    submitted: "送信済み",
    validating: "検証中",
    awaitingSignature: "署名待ち",
    rejected: "拒否済み",
    expired: "要求期限切れ",
    unpaid: "未払い",
    shareTitle: "リンクの取り扱い",
    adminShareBody:
      "この管理リンクは非公開で保存してください。支払者へ送信したり公開したりしないでください。支払者には請求作成時に発行された参加者専用リンクを使用します。",
    publicShareBody:
      "この閲覧専用進捗リンクは閲覧者へ共有できます。参加者名、支払予定ウォレット、InvoiceID、確認用診断情報は表示されません。",
    copyManagement: "非公開の管理リンクをコピー",
    copyReadOnly: "閲覧専用進捗リンクをコピー",
    copied: "リンクをコピーしました",
    copyFailed: "コピーできませんでした",
    noWalletControl:
      "請求の操作担当が支払者に代わってXamanを開いたりPaymentへ署名したりすることはできません。",
    actionPaid:
      "操作は不要です。この枠は一致する検証済みトランザクションで確認されています。",
    actionUnpaid:
      "請求作成時に発行された参加者専用支払いリンクを送ってください。支払者本人がXamanを開いて署名します。",
    actionAwaiting:
      "支払者が既存のXaman要求を承認するまで待ち、この画面を更新してください。",
    actionRejected:
      "支払者へ専用支払いリンクを再度開くよう案内してください。代替要求の前にGroup Payが台帳履歴を照合します。",
    actionSubmitted:
      "別の支払いを依頼しないでください。同じ送信済みトランザクションを確認している間、この画面を更新してください。",
    actionReview:
      "支払者へ再支払いを依頼しないでください。代替支払いを検討する前に、この枠の確認が必要です。",
    actionClosed:
      "この請求は終了しているため、新しいPaymentを開始できません。",
    technicalDetails: "技術情報",
  },
  ko: {
    pageEyebrow: "청구서 진행 상황",
    pageTitle: "지갑 상태만 신뢰하지 않고 정산을 추적하세요.",
    pageBody:
      "각 슬롯은 제출된 트랜잭션이 검증된 XRP Ledger에서 독립적으로 확인된 후에만 변경됩니다.",
    loading: "청구서 진행 상황 불러오는 중",
    linkUnavailable: "청구서 진행 링크를 사용할 수 없습니다",
    invalidLink:
      "링크가 불완전하거나 유효하지 않습니다. 청구서 생성자에게 새 진행 링크를 요청하세요.",
    unavailable: "청구서 진행 상황을 사용할 수 없습니다",
    fallback: "청구서 진행 상황을 불러올 수 없습니다.",
    retry: "다시 시도",
    creatorView: "생성자 보기",
    readOnlyView: "읽기 전용 보기",
    representativeMode: "대표 수취인 모드",
    directMode: "직접 수취인 모드",
    exactPayment:
      "각 슬롯은 정확한 {asset} Payment가 검증된 XRP Ledger에서 확인된 후에만 업데이트됩니다.",
    issuer: "공식 발행자 {issuer}",
    refresh: "상태 새로고침",
    refreshedAt: "스냅샷 업데이트 {time}",
    progress: "정산 진행률",
    paidCount: "{paid}/{total} 결제 완료",
    billTotal: "청구서 합계",
    recipientFunded: "수취인 부담분",
    expected: "결제자 예상 금액",
    verified: "검증 완료",
    remaining: "남은 금액",
    payerCount: "결제자",
    payerCountValue: "{paid}명 검증 · {remaining}명 남음",
    pending: "대기 슬롯",
    review: "검토 필요",
    complete: "정산 완료",
    completeBody:
      "외부 결제 대상인 모든 슬롯에 영구 검증 영수증이 있습니다.",
    groupOpen: "결제 접수 중",
    groupPartial: "일부 결제 완료",
    groupReview: "검토 필요",
    groupSettled: "정산 완료",
    groupClosed: "미완료 종료",
    slots: "참가자 슬롯",
    adminBody:
      "관리 권한을 사용 중이므로 생성자 세부 정보가 표시됩니다.",
    publicBody:
      "읽기 전용 보기에서는 참가자 이름, 예상 지갑, InvoiceID 및 검토 진단을 숨깁니다.",
    participant: "참가자 {number}",
    paymentSlot: "결제 슬롯 {number}",
    expectedWallet: "예상 지갑 {wallet}",
    invoiceId: "InvoiceID {invoice}",
    verifiedTx: "검증된 트랜잭션 {transaction}",
    ledgerIndex: "Ledger {ledger}",
    confirmedAt: "확인 시간 {time}",
    updatedAt: "마지막 상태 변경 {time}",
    reviewReason: "검토 사유: {reason}",
    publicProof: "공개 증명 보기",
    explorer: "XRPL Explorer에서 트랜잭션 열기",
    paid: "결제 완료",
    needsReview: "검토 필요",
    verificationFailed: "검증 실패",
    submitted: "제출됨",
    validating: "검증 중",
    awaitingSignature: "서명 대기",
    rejected: "거부됨",
    expired: "요청 만료",
    unpaid: "미결제",
    shareTitle: "링크 취급",
    adminShareBody:
      "이 관리 링크는 비공개로 보관하십시오. 결제자에게 보내거나 공개하지 마십시오. 결제자에게는 청구서 생성 시 발급된 참가자 전용 링크를 사용하십시오.",
    publicShareBody:
      "이 읽기 전용 진행 링크는 조회자에게 공유할 수 있습니다. 참가자 이름, 예상 지갑, InvoiceID 및 검토 진단은 숨겨집니다.",
    copyManagement: "비공개 관리 링크 복사",
    copyReadOnly: "읽기 전용 진행 링크 복사",
    copied: "링크를 복사했습니다",
    copyFailed: "복사하지 못했습니다",
    noWalletControl:
      "청구서 운영자는 결제자를 대신해 Xaman을 열거나 Payment에 서명할 수 없습니다.",
    actionPaid:
      "조치가 필요하지 않습니다. 이 슬롯은 일치하는 검증 거래로 확인되었습니다.",
    actionUnpaid:
      "청구서 생성 시 발급된 참가자 전용 결제 링크를 보내십시오. 결제자가 직접 Xaman을 열고 서명해야 합니다.",
    actionAwaiting:
      "결제자가 기존 Xaman 요청을 승인할 때까지 기다린 뒤 이 페이지를 새로고침하십시오.",
    actionRejected:
      "결제자에게 전용 결제 링크를 다시 열도록 안내하십시오. Group Pay는 교체 요청 전에 원장 기록을 대조합니다.",
    actionSubmitted:
      "다른 결제를 요청하지 마십시오. 동일한 제출 거래를 확인하는 동안 이 페이지를 새로고침하십시오.",
    actionReview:
      "결제자에게 다시 결제하도록 요청하지 마십시오. 교체 결제를 고려하기 전에 이 슬롯을 검토해야 합니다.",
    actionClosed:
      "이 청구서는 종료되었으므로 새 Payment를 시작할 수 없습니다.",
    technicalDetails: "기술 세부 정보",
  },
} as const;

export type ProgressMessageKey = keyof (typeof catalogs)["en"];

export function progressTranslate(
  locale: Locale,
  key: ProgressMessageKey,
  variables: Record<string, string | number> = {},
) {
  return catalogs[locale][key].replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (_, name: string) =>
      Object.prototype.hasOwnProperty.call(variables, name)
        ? String(variables[name])
        : `{${name}}`,
  );
}

export function useProgressLocalization() {
  const { locale } = useLocalization();
  return {
    gt: (
      key: ProgressMessageKey,
      variables?: Record<string, string | number>,
    ) => progressTranslate(locale, key, variables),
  };
}
