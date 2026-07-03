import type { Locale } from "@/features/localization/catalog";

export const WALLET_TROUBLESHOOTING_IDS = [
  "wallet-addresses",
  "x-address",
  "clipboard",
  "saved-wallets",
  "saved-wallet-not-shown",
  "saved-wallet-storage",
  "saved-wallet-import",
  "payer-wallet-mismatch",
  "exchange-manual-transfer",
  "rlusd-readiness",
] as const;

export type WalletTroubleshootingId =
  (typeof WALLET_TROUBLESHOOTING_IDS)[number];

type TroubleshootingItem = {
  id: WalletTroubleshootingId;
  title: string;
  symptom: string;
  cause: string;
  action: readonly string[];
  warning?: string;
};

export type WalletHelpContent = {
  eyebrow: string;
  title: string;
  description: string;
  backToGuide: string;
  changelogLabel: string;
  contentsLabel: string;
  quickStartTitle: string;
  quickStartSteps: readonly string[];
  savedWalletTitle: string;
  savedWalletSteps: readonly string[];
  localOnlyTitle: string;
  localOnlyBullets: readonly string[];
  troubleshootingTitle: string;
  symptomLabel: string;
  causeLabel: string;
  actionLabel: string;
  warningLabel: string;
  items: readonly TroubleshootingItem[];
};

const en: WalletHelpContent = {
  eyebrow: "Wallet help",
  title: "Address entry, saved wallets, and troubleshooting",
  description:
    "Use this page when creating a Bill, reusing a recipient or payer, or resolving an address, Xaman, storage, import, or RLUSD readiness problem.",
  backToGuide: "Back to Guide",
  changelogLabel: "See what changed",
  contentsLabel: "On this page",
  quickStartTitle: "Enter a wallet safely",
  quickStartSteps: [
    "Choose the correct network and Settlement Asset before entering addresses.",
    "Enter a Classic Address directly, use normal paste, or use the Paste button. An X-address must be decoded and explicitly confirmed before it is used.",
    "For a recipient, review the decoded Destination Tag. For a payer, use the payer's Classic Address without an embedded Destination Tag.",
    "Review every recipient, payer, amount, Asset, issuer, network, and Destination Tag before freezing the Bill.",
    "For payment, the account selected in Xaman must match the frozen expected payer address.",
  ],
  savedWalletTitle: "Use saved wallets",
  savedWalletSteps: [
    "Enter a valid Classic Address, add an optional label, and select Save this wallet.",
    "Choose whether the record is for a recipient, payer, or both. A recipient record may include a Destination Tag; a payer-only record cannot.",
    "On a later Bill, select Choose saved wallet, then search by label or address. Only records for the current network and field role appear.",
    "Selecting a record fills the form but does not skip address checks, readiness, review, Bill freeze, Xaman signing, or validated-ledger verification.",
    "Use Edit, favorite, delete, delete all, JSON export, or validated JSON import from the saved-wallet panel.",
  ],
  localOnlyTitle: "What saved wallets do and do not store",
  localOnlyBullets: [
    "Saved wallets stay in IndexedDB for this browser profile and application origin.",
    "They are not uploaded to Group Pay, written to D1, synchronized between devices, or used as identity proof.",
    "They do not contain Bill links, capabilities, amounts, InvoiceIDs, Xaman requests, transaction hashes, receipts, proofs, balances, or readiness results.",
    "Private browsing, browser cleanup, storage eviction, or profile removal may delete them.",
    "Other people using the same browser profile may see local labels and addresses.",
  ],
  troubleshootingTitle: "Troubleshooting by symptom",
  symptomLabel: "What you see",
  causeLabel: "Likely reason",
  actionLabel: "What to do",
  warningLabel: "Important",
  items: [
    {
      id: "wallet-addresses",
      title: "The address is rejected",
      symptom: "The form reports an invalid XRPL address or does not allow Bill review.",
      cause:
        "The value is incomplete, contains an altered character, fails the Classic Address checksum, or is still an unconfirmed X-address.",
      action: [
        "Copy the address again from the wallet and compare the first and last characters.",
        "Remove surrounding spaces, but do not change letter case or internal characters.",
        "When an X-address review card appears, confirm the decoded Classic Address before continuing.",
      ],
    },
    {
      id: "x-address",
      title: "The X-address has the wrong network or tag",
      symptom:
        "The form reports a network mismatch, payer tag, or Destination Tag conflict.",
      cause:
        "The X-address was encoded for another XRPL network, contains a tag in a payer field, or disagrees with the recipient tag already entered.",
      action: [
        "Use an address encoded for the current Mainnet or Testnet deployment.",
        "For a payer, obtain the Classic Address without an embedded Destination Tag.",
        "For a recipient, compare the embedded tag with the separately entered Destination Tag and keep only the correct value.",
      ],
    },
    {
      id: "clipboard",
      title: "The Paste button cannot read the clipboard",
      symptom: "A clipboard permission or availability message appears.",
      cause:
        "The browser denied clipboard permission, the page context does not support the API, or the operating system blocked access.",
      action: [
        "Use the browser's normal paste command or type the address directly.",
        "Check browser site permissions only when you want to use the Paste button.",
        "Validate the resulting address before saving or freezing the Bill.",
      ],
    },
    {
      id: "saved-wallets",
      title: "Save this wallet is disabled",
      symptom: "The save action is unavailable beside the address field.",
      cause:
        "Only a valid canonical Classic Address can be saved. An empty, malformed, or unconfirmed X-address is not stored.",
      action: [
        "Finish entering a valid Classic Address.",
        "If using an X-address, apply the decoded address first.",
        "Then select Save this wallet and provide a label and role.",
      ],
    },
    {
      id: "saved-wallet-not-shown",
      title: "A saved wallet does not appear in the picker",
      symptom: "Search finds no record that was previously saved.",
      cause:
        "The record belongs to another network, does not support the current recipient or payer role, was deleted, or was removed by browser cleanup.",
      action: [
        "Confirm whether the Bill is on Mainnet or Testnet.",
        "Open the saved-wallet manager and edit the record role to recipient, payer, or both as needed.",
        "Search by a distinctive part of the label or Classic Address.",
        "Re-enter and save the wallet again if browser data was cleared.",
      ],
    },
    {
      id: "saved-wallet-storage",
      title: "Saved wallets are unavailable or cannot be saved",
      symptom: "The panel reports unavailable storage or a quota problem.",
      cause:
        "IndexedDB is disabled, private browsing restricts storage, the browser quota is full, or another tab is blocking a database upgrade.",
      action: [
        "Continue with direct address entry; Bill creation and payment do not depend on saved wallets.",
        "Close other Group Pay tabs and reopen the panel.",
        "Delete unneeded local records or export them before clearing browser storage.",
        "Try a normal browser profile when private browsing blocks persistent storage.",
      ],
    },
    {
      id: "saved-wallet-import",
      title: "A saved-wallet JSON import is rejected",
      symptom: "The import reports an invalid, duplicate, too-large, or unsupported file.",
      cause:
        "The file is not a Group Pay saved-wallet export, has been edited into an invalid schema, exceeds size or record limits, or repeats the same network and address.",
      action: [
        "Use a JSON file exported by Group Pay.",
        "Review the file before importing and do not add Bill, capability, transaction, or proof data.",
        "Remove duplicate network-and-address pairs and retry.",
        "Split an excessive contact set into smaller reviewed files.",
      ],
      warning:
        "Import updates an existing record with the same network and Classic Address after confirmation.",
    },
    {
      id: "payer-wallet-mismatch",
      title: "Xaman opens with a different account",
      symptom:
        "The selected Xaman account does not match the expected payer shown by Group Pay.",
      cause:
        "Another account is active in Xaman, or the Bill was created with a different expected payer address.",
      action: [
        "Do not approve the transaction with the wrong account.",
        "Switch to the exact expected payer account in Xaman and review again.",
        "When the Bill contains the wrong frozen payer, copy the Bill to a new draft and create a separate corrected Bill.",
      ],
      warning:
        "A transaction from another sender may move funds but will not settle the intended PaymentSlot.",
    },
    {
      id: "exchange-manual-transfer",
      title: "An exchange withdrawal or manual transfer was used",
      symptom:
        "Funds may have moved, but the PaymentSlot remains unpaid or requires review.",
      cause:
        "The sender, amount, Asset, tags, InvoiceID, Source Tag, or timing may not match the frozen Payment Intent.",
      action: [
        "Do not repeat the payment automatically.",
        "Wait for validated-ledger reconciliation and use the status-specific action shown by Group Pay.",
        "Provide the transaction hash only through the intended private review process, without exposing capability links publicly.",
      ],
      warning:
        "Exchange withdrawals and ordinary manual transfers are not supported PaymentSlot settlement paths.",
    },
    {
      id: "rlusd-readiness",
      title: "RLUSD readiness is blocked or unavailable",
      symptom:
        "The payer cannot continue to the RLUSD payment request.",
      cause:
        "The official trust line is missing or restricted, RLUSD balance is insufficient, spendable XRP cannot cover reserve and fee needs, the recipient cannot receive, or ledger data could not be confirmed.",
      action: [
        "Use the official RLUSD setup flow when a TrustSet is required.",
        "Confirm sufficient usable RLUSD and spendable XRP after reserve requirements.",
        "Recheck after the setup transaction is validated.",
        "When the result is unavailable, wait and recheck instead of creating a manual transfer.",
      ],
    },
  ],
};

const ja: WalletHelpContent = {
  eyebrow: "ウォレットヘルプ",
  title: "アドレス入力・保存済みウォレット・トラブル対処",
  description:
    "請求作成、受取先や支払者の再利用、アドレス、Xaman、ブラウザ保存、読み込み、RLUSD準備の問題が起きたときに確認するページです。",
  backToGuide: "ガイドへ戻る",
  changelogLabel: "変更内容を見る",
  contentsLabel: "このページの内容",
  quickStartTitle: "ウォレットを安全に入力する",
  quickStartSteps: [
    "アドレス入力前に、正しいネットワークと精算資産を選びます。",
    "Classic Addressを直接入力するか、通常の貼り付けまたは貼り付けボタンを使います。X-addressは変換内容を確認して明示的に適用します。",
    "受取先では変換されたDestination Tagを確認します。支払者にはタグを含まないClassic Addressを使用します。",
    "請求を確定する前に、受取先、支払者、金額、資産、発行者、ネットワーク、Destination Tagをすべて確認します。",
    "支払い時にXamanで選ぶアカウントは、固定済みの予定支払者アドレスと一致させます。",
  ],
  savedWalletTitle: "保存済みウォレットを使う",
  savedWalletSteps: [
    "有効なClassic Addressと任意のラベルを入力し、「このウォレットを保存」を選びます。",
    "用途を受取先、支払者、両方から選びます。受取先にはDestination Tagを保存できますが、支払者専用記録には保存できません。",
    "次回は「保存済みから選ぶ」を開き、ラベルまたはアドレスで検索します。現在のネットワークと入力欄の用途に合う記録だけが表示されます。",
    "記録を選んでも、アドレス検証、readiness、最終確認、請求確定、Xaman署名、検証済み台帳確認は省略されません。",
    "住所録パネルから編集、お気に入り、削除、全削除、JSON書き出し、検証付きJSON読み込みを行えます。",
  ],
  localOnlyTitle: "保存する情報と保存しない情報",
  localOnlyBullets: [
    "保存済みウォレットは、このアプリのオリジンと現在のブラウザプロファイルのIndexedDBにだけ保存します。",
    "Group PayのサーバーやD1へ送信せず、端末間同期や本人確認にも使用しません。",
    "請求リンク、Capability、金額、InvoiceID、Xaman要求、取引ハッシュ、Receipt、Proof、残高、readiness結果は保存しません。",
    "プライベートブラウズ、ブラウザデータ削除、保存領域の自動整理、プロファイル削除により消える場合があります。",
    "同じブラウザプロファイルを使う別の人から、ローカルのラベルとアドレスが見える場合があります。",
  ],
  troubleshootingTitle: "症状別トラブルシューティング",
  symptomLabel: "表示される状態",
  causeLabel: "考えられる原因",
  actionLabel: "対処方法",
  warningLabel: "重要",
  items: [
    {
      id: "wallet-addresses",
      title: "アドレスが拒否される",
      symptom: "無効なXRPLアドレスと表示されるか、請求の確認へ進めません。",
      cause:
        "入力が途中、文字が変化している、Classic Addressのチェックサムが一致しない、またはX-addressをまだ適用していません。",
      action: [
        "ウォレットからアドレスを再コピーし、先頭と末尾の文字を比較します。",
        "前後の空白は除けますが、大文字小文字や途中の文字を変更しないでください。",
        "X-addressの変換カードが表示された場合は、Classic Addressを確認してから適用します。",
      ],
    },
    {
      id: "x-address",
      title: "X-addressのネットワークまたはタグが一致しない",
      symptom:
        "ネットワーク不一致、支払者タグ、Destination Tag競合のエラーが表示されます。",
      cause:
        "別ネットワーク用のX-address、支払者欄のタグ付きX-address、または入力済み受取先タグと異なるタグを使用しています。",
      action: [
        "現在のMainnetまたはTestnetに対応するアドレスを使用します。",
        "支払者にはDestination Tagを含まないClassic Addressを使用します。",
        "受取先では、X-address内のタグと別欄のDestination Tagを比較し、正しい値だけを残します。",
      ],
    },
    {
      id: "clipboard",
      title: "貼り付けボタンがクリップボードを読めない",
      symptom: "クリップボード権限または利用不可のメッセージが表示されます。",
      cause:
        "ブラウザが権限を拒否した、ページ環境がClipboard APIに未対応、またはOSがアクセスを制限しています。",
      action: [
        "ブラウザの通常の貼り付け操作か直接入力を使用します。",
        "貼り付けボタンを使う場合だけ、ブラウザのサイト権限を確認します。",
        "保存または請求確定前に、入力されたアドレスを検証します。",
      ],
    },
    {
      id: "saved-wallets",
      title: "「このウォレットを保存」が押せない",
      symptom: "アドレス欄の保存操作が無効になっています。",
      cause:
        "保存できるのは有効なClassic Addressだけです。空欄、無効な値、未確定のX-addressは保存しません。",
      action: [
        "有効なClassic Addressの入力を完了します。",
        "X-addressを使う場合は、先に変換したアドレスを適用します。",
        "その後「このウォレットを保存」を選び、ラベルと用途を指定します。",
      ],
    },
    {
      id: "saved-wallet-not-shown",
      title: "保存したウォレットが一覧に出ない",
      symptom: "以前保存した記録を検索しても表示されません。",
      cause:
        "別ネットワーク用、現在の受取先・支払者用途に非対応、削除済み、またはブラウザデータ削除で消えた可能性があります。",
      action: [
        "請求がMainnetとTestnetのどちらか確認します。",
        "住所録管理で用途を受取先、支払者、両方の適切なものへ編集します。",
        "ラベルまたはClassic Addressの特徴的な一部で検索します。",
        "ブラウザデータを削除した場合は、再入力して保存します。",
      ],
    },
    {
      id: "saved-wallet-storage",
      title: "保存済みウォレットを利用または保存できない",
      symptom: "保存領域を利用できない、または容量不足と表示されます。",
      cause:
        "IndexedDBが無効、プライベートブラウズの制限、保存容量不足、または別タブがデータベース更新を妨げています。",
      action: [
        "直接入力で続行できます。請求作成と支払いは住所録に依存しません。",
        "他のGroup Payタブを閉じて住所録を開き直します。",
        "不要な記録を削除するか、書き出してからブラウザ保存領域を整理します。",
        "プライベートブラウズで保存できない場合は通常のブラウザプロファイルを使います。",
      ],
    },
    {
      id: "saved-wallet-import",
      title: "住所録JSONの読み込みが拒否される",
      symptom: "無効、重複、容量超過、未対応ファイルと表示されます。",
      cause:
        "Group Payの書き出しではない、編集でスキーマが壊れた、容量・件数上限を超えた、または同一ネットワークとアドレスが重複しています。",
      action: [
        "Group Payから書き出したJSONファイルを使用します。",
        "読み込み前に内容を確認し、請求、Capability、取引、Proofの情報を追加しないでください。",
        "同じネットワークとアドレスの重複を除いて再試行します。",
        "件数が多すぎる場合は、確認可能な小さいファイルへ分けます。",
      ],
      warning:
        "同じネットワークとClassic Addressの既存記録は、確認後に更新されます。",
    },
    {
      id: "payer-wallet-mismatch",
      title: "Xamanで別のアカウントが選ばれている",
      symptom: "Xamanの選択アカウントがGroup Payの予定支払者と一致しません。",
      cause:
        "Xamanで別アカウントが有効、または請求作成時に別の予定支払者アドレスを固定しています。",
      action: [
        "異なるアカウントのまま承認しないでください。",
        "Xamanで予定支払者と完全に一致するアカウントへ切り替え、再確認します。",
        "請求側の固定済み支払者が間違っている場合は、請求を新しい下書きへコピーし、修正版を別の請求として作成します。",
      ],
      warning:
        "別送信者の取引は資金が移動しても、対象PaymentSlotを精算できない場合があります。",
    },
    {
      id: "exchange-manual-transfer",
      title: "取引所出金または通常の手動送金を使った",
      symptom: "資金が動いたように見えても、PaymentSlotが未払いまたは要確認のままです。",
      cause:
        "送信者、金額、資産、タグ、InvoiceID、Source Tag、時刻が固定済みPayment Intentと一致しない可能性があります。",
      action: [
        "自動的にもう一度支払わないでください。",
        "検証済み台帳の照合を待ち、Group Payに表示されたステータス別の操作だけを使用します。",
        "取引ハッシュは所定の非公開確認手順でだけ共有し、Capabilityリンクを公開しないでください。",
      ],
      warning:
        "取引所出金と通常の手動送金は、対応済みPaymentSlot精算経路ではありません。",
    },
    {
      id: "rlusd-readiness",
      title: "RLUSDのreadinessがブロックまたは取得不能",
      symptom: "RLUSDの支払い要求へ進めません。",
      cause:
        "公式トラストライン不足・制限、RLUSD残高不足、リザーブと手数料用XRP不足、受取先の受取不能、または台帳情報を確認できません。",
      action: [
        "TrustSetが必要な場合は公式RLUSD準備フローを使用します。",
        "利用可能RLUSDと、リザーブ差引後の利用可能XRPを確認します。",
        "設定取引が検証済みになった後で再確認します。",
        "取得不能時は手動送金を作らず、待ってから再確認します。",
      ],
    },
  ],
};

const ko: WalletHelpContent = {
  eyebrow: "지갑 도움말",
  title: "주소 입력, 저장된 지갑 및 문제 해결",
  description:
    "청구 생성, 수취인 또는 결제자 재사용, 주소, Xaman, 브라우저 저장소, 가져오기 또는 RLUSD 준비 문제를 해결할 때 사용하는 페이지입니다.",
  backToGuide: "가이드로 돌아가기",
  changelogLabel: "변경 사항 보기",
  contentsLabel: "이 페이지의 내용",
  quickStartTitle: "지갑 주소를 안전하게 입력하기",
  quickStartSteps: [
    "주소를 입력하기 전에 올바른 네트워크와 정산 자산을 선택합니다.",
    "Classic Address를 직접 입력하거나 일반 붙여넣기 또는 붙여넣기 버튼을 사용합니다. X-address는 디코딩 내용을 확인한 뒤 명시적으로 적용해야 합니다.",
    "수취인에서는 디코딩된 Destination Tag를 확인합니다. 결제자에는 태그가 없는 Classic Address를 사용합니다.",
    "청구를 고정하기 전에 수취인, 결제자, 금액, 자산, 발행자, 네트워크 및 Destination Tag를 모두 검토합니다.",
    "결제 시 Xaman에서 선택한 계정은 고정된 예상 결제자 주소와 일치해야 합니다.",
  ],
  savedWalletTitle: "저장된 지갑 사용하기",
  savedWalletSteps: [
    "유효한 Classic Address와 선택적 레이블을 입력하고 이 지갑 저장을 선택합니다.",
    "수취인, 결제자 또는 둘 다 역할을 선택합니다. 수취인 기록은 Destination Tag를 포함할 수 있지만 결제자 전용 기록은 포함할 수 없습니다.",
    "다음 청구에서 저장된 지갑 선택을 열고 레이블이나 주소로 검색합니다. 현재 네트워크와 필드 역할에 맞는 기록만 표시됩니다.",
    "기록을 선택해도 주소 검증, readiness, 검토, 청구 고정, Xaman 서명 및 검증 원장 확인은 생략되지 않습니다.",
    "저장된 지갑 패널에서 편집, 즐겨찾기, 삭제, 모두 삭제, JSON 내보내기 및 검증된 JSON 가져오기를 사용할 수 있습니다.",
  ],
  localOnlyTitle: "저장되는 정보와 저장되지 않는 정보",
  localOnlyBullets: [
    "저장된 지갑은 현재 브라우저 프로필과 애플리케이션 오리진의 IndexedDB에만 저장됩니다.",
    "Group Pay 서버나 D1에 업로드되지 않으며 기기 간 동기화 또는 신원 증명에 사용되지 않습니다.",
    "청구 링크, Capability, 금액, InvoiceID, Xaman 요청, 거래 해시, Receipt, Proof, 잔액 또는 readiness 결과를 저장하지 않습니다.",
    "비공개 브라우징, 브라우저 데이터 삭제, 저장소 정리 또는 프로필 제거로 삭제될 수 있습니다.",
    "같은 브라우저 프로필을 사용하는 다른 사람이 로컬 레이블과 주소를 볼 수 있습니다.",
  ],
  troubleshootingTitle: "증상별 문제 해결",
  symptomLabel: "표시되는 상태",
  causeLabel: "가능한 원인",
  actionLabel: "해결 방법",
  warningLabel: "중요",
  items: [
    {
      id: "wallet-addresses",
      title: "주소가 거부됨",
      symptom: "유효하지 않은 XRPL 주소가 표시되거나 청구 검토로 진행할 수 없습니다.",
      cause:
        "입력이 불완전하거나 문자가 변경되었거나 Classic Address 체크섬이 맞지 않거나 X-address를 아직 적용하지 않았습니다.",
      action: [
        "지갑에서 주소를 다시 복사하고 첫 글자와 마지막 글자를 비교합니다.",
        "앞뒤 공백은 제거할 수 있지만 대소문자나 내부 문자를 변경하지 마십시오.",
        "X-address 디코딩 카드가 표시되면 Classic Address를 확인한 뒤 적용합니다.",
      ],
    },
    {
      id: "x-address",
      title: "X-address 네트워크 또는 태그 불일치",
      symptom: "네트워크 불일치, 결제자 태그 또는 Destination Tag 충돌이 표시됩니다.",
      cause:
        "다른 네트워크용 X-address, 결제자 필드의 태그 포함 X-address 또는 기존 수취인 태그와 다른 태그를 사용했습니다.",
      action: [
        "현재 Mainnet 또는 Testnet에 맞는 주소를 사용합니다.",
        "결제자에는 Destination Tag가 없는 Classic Address를 사용합니다.",
        "수취인에서는 X-address 태그와 별도 Destination Tag를 비교하고 올바른 값만 유지합니다.",
      ],
    },
    {
      id: "clipboard",
      title: "붙여넣기 버튼이 클립보드를 읽지 못함",
      symptom: "클립보드 권한 또는 사용 불가 메시지가 표시됩니다.",
      cause:
        "브라우저가 권한을 거부했거나 페이지 환경이 Clipboard API를 지원하지 않거나 운영체제가 접근을 제한합니다.",
      action: [
        "브라우저의 일반 붙여넣기나 직접 입력을 사용합니다.",
        "붙여넣기 버튼을 사용할 때만 사이트 권한을 확인합니다.",
        "저장하거나 청구를 고정하기 전에 결과 주소를 검증합니다.",
      ],
    },
    {
      id: "saved-wallets",
      title: "이 지갑 저장 버튼이 비활성화됨",
      symptom: "주소 필드 옆 저장 작업을 사용할 수 없습니다.",
      cause:
        "유효한 정규 Classic Address만 저장할 수 있습니다. 빈 값, 잘못된 값 또는 확인되지 않은 X-address는 저장되지 않습니다.",
      action: [
        "유효한 Classic Address 입력을 완료합니다.",
        "X-address를 사용하는 경우 먼저 디코딩된 주소를 적용합니다.",
        "그런 다음 이 지갑 저장을 선택하고 레이블과 역할을 지정합니다.",
      ],
    },
    {
      id: "saved-wallet-not-shown",
      title: "저장한 지갑이 선택기에 표시되지 않음",
      symptom: "이전에 저장한 기록을 검색해도 나타나지 않습니다.",
      cause:
        "다른 네트워크, 현재 수취인 또는 결제자 역할 미지원, 삭제 또는 브라우저 정리로 제거되었을 수 있습니다.",
      action: [
        "청구가 Mainnet인지 Testnet인지 확인합니다.",
        "관리 화면에서 기록 역할을 수취인, 결제자 또는 둘 다로 편집합니다.",
        "레이블이나 Classic Address의 구별되는 일부로 검색합니다.",
        "브라우저 데이터가 삭제되었다면 다시 입력하고 저장합니다.",
      ],
    },
    {
      id: "saved-wallet-storage",
      title: "저장된 지갑을 사용할 수 없거나 저장 실패",
      symptom: "저장소 사용 불가 또는 용량 문제가 표시됩니다.",
      cause:
        "IndexedDB 비활성화, 비공개 브라우징 제한, 저장소 용량 부족 또는 다른 탭의 데이터베이스 업그레이드 차단일 수 있습니다.",
      action: [
        "직접 주소 입력으로 계속할 수 있습니다. 청구 생성과 결제는 저장된 지갑에 의존하지 않습니다.",
        "다른 Group Pay 탭을 닫고 패널을 다시 엽니다.",
        "불필요한 기록을 삭제하거나 브라우저 저장소를 정리하기 전에 내보냅니다.",
        "비공개 브라우징에서 저장이 차단되면 일반 브라우저 프로필을 사용합니다.",
      ],
    },
    {
      id: "saved-wallet-import",
      title: "저장된 지갑 JSON 가져오기가 거부됨",
      symptom: "유효하지 않음, 중복, 너무 큼 또는 지원하지 않는 파일이 표시됩니다.",
      cause:
        "Group Pay 내보내기가 아니거나 편집으로 스키마가 손상되었거나 크기·개수 제한 초과 또는 동일 네트워크와 주소가 중복되었습니다.",
      action: [
        "Group Pay에서 내보낸 JSON 파일을 사용합니다.",
        "가져오기 전에 내용을 검토하고 청구, Capability, 거래 또는 Proof 데이터를 추가하지 마십시오.",
        "중복 네트워크와 주소 쌍을 제거하고 다시 시도합니다.",
        "기록이 너무 많으면 검토 가능한 작은 파일로 나눕니다.",
      ],
      warning:
        "같은 네트워크와 Classic Address의 기존 기록은 확인 후 업데이트됩니다.",
    },
    {
      id: "payer-wallet-mismatch",
      title: "Xaman에서 다른 계정이 선택됨",
      symptom: "선택된 Xaman 계정이 Group Pay의 예상 결제자와 일치하지 않습니다.",
      cause:
        "Xaman에서 다른 계정이 활성화되었거나 청구가 다른 예상 결제자 주소로 생성되었습니다.",
      action: [
        "잘못된 계정으로 거래를 승인하지 마십시오.",
        "Xaman에서 예상 결제자와 정확히 일치하는 계정으로 전환하고 다시 검토합니다.",
        "청구의 고정 결제자가 잘못된 경우 청구를 새 초안으로 복사하고 수정된 별도 청구를 생성합니다.",
      ],
      warning:
        "다른 발신자의 거래는 자금이 이동해도 의도한 PaymentSlot을 정산하지 못할 수 있습니다.",
    },
    {
      id: "exchange-manual-transfer",
      title: "거래소 출금 또는 일반 수동 전송을 사용함",
      symptom: "자금이 이동한 것처럼 보여도 PaymentSlot이 미결제 또는 검토 필요 상태입니다.",
      cause:
        "발신자, 금액, 자산, 태그, InvoiceID, Source Tag 또는 시간이 고정 Payment Intent와 일치하지 않을 수 있습니다.",
      action: [
        "자동으로 다시 결제하지 마십시오.",
        "검증 원장 대조를 기다리고 Group Pay가 표시하는 상태별 작업만 사용합니다.",
        "거래 해시는 의도된 비공개 검토 절차에서만 공유하고 Capability 링크를 공개하지 마십시오.",
      ],
      warning:
        "거래소 출금과 일반 수동 전송은 지원되는 PaymentSlot 정산 경로가 아닙니다.",
    },
    {
      id: "rlusd-readiness",
      title: "RLUSD readiness 차단 또는 사용 불가",
      symptom: "RLUSD 결제 요청으로 진행할 수 없습니다.",
      cause:
        "공식 트러스트라인 누락·제한, RLUSD 잔액 부족, 준비금과 수수료용 사용 가능 XRP 부족, 수취 불가 또는 원장 정보 확인 실패입니다.",
      action: [
        "TrustSet이 필요하면 공식 RLUSD 설정 흐름을 사용합니다.",
        "사용 가능한 RLUSD와 준비금 이후 사용 가능한 XRP를 확인합니다.",
        "설정 거래가 검증된 뒤 다시 확인합니다.",
        "결과를 확인할 수 없으면 수동 전송을 만들지 말고 기다린 뒤 다시 확인합니다.",
      ],
    },
  ],
};

const contentByLocale: Record<Locale, WalletHelpContent> = { en, ja, ko };

export function getWalletHelpContent(locale: Locale): WalletHelpContent {
  return contentByLocale[locale] ?? en;
}
