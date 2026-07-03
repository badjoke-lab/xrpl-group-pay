import type { Locale } from "@/features/localization/catalog";

export const GUIDE_SECTION_IDS = [
  "overview",
  "roles",
  "payment-modes",
  "create-and-freeze",
  "capability-links",
  "xrp",
  "rlusd",
  "trustset",
  "readiness",
  "payment-flow",
  "verification",
  "progress",
  "status-meanings",
  "failures",
  "recovery",
  "review-required",
  "partial-completion",
  "incomplete-closure",
  "copy-to-revise",
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

export type GuideLocaleContent = {
  eyebrow: string;
  title: string;
  description: string;
  contentsLabel: string;
  homeLabel: string;
  openInNewTabLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchHint: string;
  clearSearchLabel: string;
  noResultsTitle: string;
  noResultsBody: string;
  resultLabel: string;
  sections: readonly GuideSection[];
};

const en: GuideLocaleContent = {
  eyebrow: "Product guide",
  title: "How XRPL Group Pay works",
  description:
    "A complete guide to non-custodial shared settlement, Bill creation, XRP and official RLUSD readiness, validated-ledger verification, progress, failure handling, and safe revision.",
  contentsLabel: "On this page",
  homeLabel: "Back to home",
  openInNewTabLabel: "Open full Guide",
  searchLabel: "Search the Guide",
  searchPlaceholder: "Search status, RLUSD, retry, privacy…",
  searchHint: "Searches section titles, explanations, and recovery guidance.",
  clearSearchLabel: "Clear search",
  noResultsTitle: "No Guide section matched",
  noResultsBody: "Try a broader term such as payment, status, RLUSD, retry, or link.",
  resultLabel: "matching sections",
  sections: [
    {
      id: "overview",
      title: "Purpose and non-custodial behavior",
      paragraphs: [
        "XRPL Group Pay coordinates a shared Bill without receiving, pooling, or controlling payer funds. Each payer signs an independent XRPL transaction in their own wallet and sends directly to the frozen recipient account.",
        "Creating a Bill, opening Xaman, signing, or receiving a provider callback does not by itself prove payment. Group Pay marks a PaymentSlot paid only after the validated XRP Ledger facts match the frozen obligation.",
      ],
      bullets: [
        "No seed, private key, or signing authority is requested.",
        "No application-controlled escrow or pooled balance is created.",
        "Verified transfers remain direct payer-to-recipient transfers.",
      ],
    },
    {
      id: "roles",
      title: "Bill operator, recipient, and payer roles",
      paragraphs: [
        "The Bill operator creates the Bill, distributes the correct links, observes progress, and may use management-only recovery controls. The recipient is the XRPL account that receives the transfers. Each payer reviews and signs only their own frozen PaymentSlot.",
        "One person may hold more than one role, but the application keeps the roles explicit so a management link, read-only link, and payer link are never treated as interchangeable.",
      ],
    },
    {
      id: "payment-modes",
      title: "Payment modes",
      paragraphs: [
        "Pay a representative when one person receives reimbursements, shared-purchase payments, fees, or contributions. A recipient-funded portion may be recorded as accounting with no self-transfer.",
        "Pay a store or organizer directly when every payer sends to an external recipient. Direct mode assigns the full Bill total to payer slots and has no recipient-funded amount.",
      ],
    },
    {
      id: "create-and-freeze",
      title: "Create, allocate, review, and freeze",
      paragraphs: [
        "The operator chooses the mode, recipient, network, settlement Asset, total, payer wallets, and allocation method. Equal, custom, percentage, and share-based entry all resolve to exact fixed-precision amounts before creation.",
        "The final review shows the exact recipient, Destination Tag, Asset identity, amounts, payer wallets, and allocation. Confirmation freezes those facts and creates independent PaymentSlots and capability links.",
      ],
      bullets: [
        "A recipient-funded amount is accounting only and creates no PaymentSlot.",
        "Remainder handling is resolved before the Bill is frozen.",
        "Frozen payment facts are not edited in place later.",
      ],
    },
    {
      id: "capability-links",
      title: "Capability links and access scopes",
      paragraphs: [
        "Management, read-only progress, payer payment, RLUSD setup, and public proof links expose different actions and data. Possession of a private capability link grants its defined access, so each link must be shared only with the intended audience.",
        "Capabilities are carried in URL fragments where supported so normal page requests do not send them in the path or query string. Group Pay stores capability hashes rather than reusable raw tokens.",
      ],
      bullets: [
        "Management links can expose payer labels, expected wallets, review facts, and recovery controls.",
        "Read-only progress links hide management-only payer details and actions.",
        "A payer link controls only one PaymentSlot and never grants Bill management access.",
      ],
    },
    {
      id: "xrp",
      title: "Paying with XRP",
      paragraphs: [
        "XRP is the native XRPL Asset. Group Pay freezes the amount in drops-compatible fixed precision, while the wallet and current validated ledger determine the separate network fee.",
        "The payer needs enough spendable XRP after reserve requirements for both the Bill amount and the estimated fee. A displayed account balance is not automatically the same as spendable XRP.",
      ],
    },
    {
      id: "rlusd",
      title: "Paying with official RLUSD",
      paragraphs: [
        "RLUSD is an issued XRPL Asset. Group Pay freezes and verifies the network-specific official currency code and issuer together with the amount; it never accepts an issued Asset by ticker text alone.",
        "The payer needs the official trust line, sufficient usable RLUSD balance, and enough spendable XRP for the network fee and applicable reserve requirements. The recipient must also be able to receive the frozen issued Asset.",
      ],
    },
    {
      id: "trustset",
      title: "Official RLUSD TrustSet preparation",
      paragraphs: [
        "A TrustSet configures the payer wallet to hold official RLUSD on the selected network. It is a separate XRPL transaction: it does not pay the Bill, transfer the Bill amount, or provide an RLUSD balance.",
        "The setup request freezes the official issuer, currency, account, network, and trust limit. After signing, Group Pay checks the validated ledger and requires the expected trust line before returning the payer to the payment flow.",
      ],
    },
    {
      id: "readiness",
      title: "Readiness, balances, fees, and reserves",
      paragraphs: [
        "Before a wallet handoff, Group Pay reads validated account and Asset facts for the payer and recipient. A blocked readiness result prevents creation of a payment request; an unavailable result asks the payer to recheck rather than guessing.",
        "XRP readiness considers account existence, spendable balance, estimated fee, and reserve. RLUSD readiness additionally considers trust-line presence, authorization or freeze state, issued balance, and recipient ability to receive the Asset.",
      ],
      bullets: [
        "Ready means the checked facts currently satisfy the frozen obligation.",
        "Blocked means a specific setup or balance condition must change.",
        "Unavailable means the facts could not be confirmed and no payment request is created.",
      ],
    },
    {
      id: "payment-flow",
      title: "Share, review, sign, and submit",
      paragraphs: [
        "The operator sends each payer their own private payment link. The payer checks the recipient, network, Asset, issuer when applicable, amount, and readiness result before continuing to Xaman.",
        "Xaman presents the exact transaction template for the payer to approve or reject. Group Pay cannot approve it for them. After submission, the interface waits for validated-ledger verification rather than treating a signature as settlement.",
      ],
    },
    {
      id: "verification",
      title: "Validated-ledger verification and duplicate prevention",
      paragraphs: [
        "The server re-resolves the PaymentSlot, re-fetches the Xaman payload, and compares the validated XRPL transaction with the frozen payer, destination, Asset, amount, tags, InvoiceID, and transaction rules.",
        "A successful settlement atomically stores or reuses the verified receipt, marks only the matching PaymentSlot paid, and recomputes Bill progress. Transaction and InvoiceID uniqueness prevent the same verified payment identity from settling another obligation.",
      ],
      bullets: [
        "Partial Payment and cross-currency behavior are rejected.",
        "The delivered Asset and delivered amount must match the obligation.",
        "An exact repeated verification is idempotent; conflicting facts fail closed.",
      ],
    },
    {
      id: "progress",
      title: "Bill and payer progress",
      paragraphs: [
        "The progress view derives totals from frozen PaymentSlots and verified receipts. It shows expected-from-payers, verified, remaining, paid and remaining payer counts, and mode-correct recipient-funded accounting.",
        "The management view may show payer labels, expected wallets, InvoiceIDs, review reasons, and recovery controls. The read-only view intentionally omits those private management details.",
      ],
    },
    {
      id: "status-meanings",
      title: "Status meanings",
      paragraphs: [
        "Unpaid means no matching validated Payment is recorded. Wallet request created and awaiting signature mean the payer has not yet produced a verified transfer. Submitted and validating mean the outcome is still uncertain and replacement is blocked.",
        "Paid means the complete frozen obligation was verified. Rejected or expired may become safely retryable after reconciliation. Verification failed or needs review means the system will not silently accept or replace the observed transaction.",
      ],
      bullets: [
        "Neutral: identity or information, not success or failure.",
        "In progress: waiting for a person, provider, or validated ledger.",
        "Complete: verified obligation satisfied.",
        "Action required: setup, retry, recheck, or human review is needed.",
        "Destructive: confirmed unsafe, failed, or irreversible action boundary.",
      ],
    },
    {
      id: "failures",
      title: "Supported failure patterns",
      paragraphs: [
        "Safe failures include payer rejection, an expired handoff, and some confirmed transaction failures. Temporary provider, network, or ledger-read problems use wait-and-recheck behavior. Readiness failures point to account, trust-line, reserve, fee, or balance setup.",
        "Wrong sender, recipient, amount, Asset, issuer, tag, InvoiceID, partial payment, cross-currency behavior, hash conflict, duplicate identity, or multiple validated candidates require review or terminal handling rather than automatic acceptance.",
      ],
    },
    {
      id: "recovery",
      title: "Safe retry, recheck, setup, and terminal recovery",
      paragraphs: [
        "Every supported failure maps to one recovery disposition: safe retry, wait and recheck, setup required, review required, already paid, or terminal. The interface shows only actions allowed by that disposition.",
        "Before replacing a prior wallet handoff, Group Pay reconciles validated ledger history. If value may already have moved, it blocks automatic replacement and never offers an administrator a manual mark-paid shortcut.",
      ],
    },
    {
      id: "review-required",
      title: "Review-required transactions",
      paragraphs: [
        "Management review places frozen expected facts beside observed transaction facts. A mismatch or multiple candidate transaction remains blocked until the operator understands the evidence and the product policy permits a next action.",
        "Authorizing another attempt requires explicit acknowledgement that a prior transaction may have moved value and that a repeated payment is possible. Authorization does not mark the slot paid and does not create a wallet handoff by itself.",
      ],
    },
    {
      id: "partial-completion",
      title: "One-payer failure and partial completion",
      paragraphs: [
        "PaymentSlots settle independently. One rejected, blocked, pending, or review-required payer does not reverse another payer's verified receipt, and the Bill may remain partially paid while recovery continues.",
        "There is no atomic all-or-nothing group transfer. The progress view separates verified amount from remaining amount so the operator can see exactly what has and has not settled.",
      ],
    },
    {
      id: "incomplete-closure",
      title: "Close a Bill incomplete",
      paragraphs: [
        "A management capability may close an active unsettled Bill incomplete after selecting a reason, accepting the payment-stop and no-automatic-refund disclosures, and typing the exact confirmation.",
        "Closure permanently stops new wallet handoffs for unpaid slots while preserving verified receipts, paid transaction facts, paid totals, and public proofs. It does not reverse or refund any validated transfer and the Bill cannot be reopened.",
      ],
    },
    {
      id: "copy-to-revise",
      title: "Copy a frozen Bill to revise it",
      paragraphs: [
        "Frozen recipients, payers, amounts, Assets, InvoiceIDs, and capability identities are not edited in place. Management can copy editable facts and final allocations into a new browser-local draft, modify that draft, and create a separate Bill.",
        "The new Bill generates new Bill, PaymentSlot, capability, InvoiceID, and link identities. Source transactions, receipts, proofs, review records, and capabilities are never copied, and the original Bill remains unchanged.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy and data boundaries",
      paragraphs: [
        "Private capability links, payer wallets, payer labels, management review facts, and browser-local drafts must not be placed in public posts, analytics, logs, support screenshots, or Guide URLs. Public proof exposes only the approved receipt contract.",
        "Contextual help opens fixed public Guide anchors in a protected tab and never copies the active URL fragment, query, capability, draft values, or private Bill data.",
      ],
    },
    {
      id: "security-limitations",
      title: "Security checks and limitations",
      paragraphs: [
        "Group Pay validates supported addresses, Asset identity, exact amounts, tags, InvoiceIDs, Xaman lifecycle, validated ledger state, duplicate boundaries, and D1 state transitions. It fails closed when required facts cannot be confirmed.",
        "Group Pay cannot recover seeds, sign for a user, guarantee provider or XRPL availability, reverse validated transfers, issue automatic refunds, exchange XRP and RLUSD, or guarantee that a recipient will voluntarily return an accidental payment.",
      ],
      bullets: [
        "Review the network, recipient, Destination Tag, Asset, issuer, and amount before signing.",
        "When Mainnet creation is operationally enabled, transfers use real irreversible assets.",
        "A public proof demonstrates the stored verification result; it is not custody, escrow, insurance, or a refund promise.",
      ],
    },
    {
      id: "faq",
      title: "Frequently asked questions",
      paragraphs: [
        "Does creating or copying a Bill move funds? No. It creates or edits payment instructions and capability links; only a payer-approved XRPL transaction moves value.",
        "Can Group Pay convert XRP and RLUSD? No. Every Bill freezes one settlement Asset and Group Pay performs no exchange or quote execution.",
        "Can an operator manually mark a payment complete? No. Paid requires the validated-ledger verification and atomic persistence path.",
        "Can one failed payer cancel everyone else? No. Verified slots remain paid. The Bill may continue, remain partial, or be closed incomplete.",
        "Can a frozen Bill be edited? No. Copy it into a new draft and create a separate Bill with new identities.",
      ],
    },
  ],
};

const ja: GuideLocaleContent = {
  eyebrow: "製品ガイド",
  title: "XRPL Group Payの仕組み",
  description:
    "非カストディ型の共同精算、請求作成、XRP・公式RLUSDの準備、検証済み台帳による確認、進捗、失敗対応、安全な修正版作成をまとめた完全ガイドです。",
  contentsLabel: "このページの内容",
  homeLabel: "ホームへ戻る",
  openInNewTabLabel: "完全版ガイドを開く",
  searchLabel: "ガイドを検索",
  searchPlaceholder: "ステータス、RLUSD、再試行、プライバシー…",
  searchHint: "見出し、説明、復旧方法を検索します。",
  clearSearchLabel: "検索をクリア",
  noResultsTitle: "一致するガイド項目がありません",
  noResultsBody: "支払い、ステータス、RLUSD、再試行、リンクなど、広い語句で検索してください。",
  resultLabel: "件の項目",
  sections: [
    { id: "overview", title: "目的と非カストディ型の仕組み", paragraphs: ["XRPL Group Payは支払者の資金を受け取ったり、まとめたり、操作したりせずに共同請求を調整します。各支払者は自分のウォレットで独立したXRPL取引へ署名し、固定済みの受取先へ直接送金します。", "請求作成、Xamanを開くこと、署名、プロバイダーのコールバックだけでは支払い完了になりません。固定済み条件と一致する検証済み台帳取引を確認した後だけPaymentSlotを支払済みにします。"], bullets: ["シード、秘密鍵、代理署名権限を要求しません。", "アプリ管理のエスクローや資金プールを作りません。", "検証済み送金は支払者から受取先への直接送金です。"] },
    { id: "roles", title: "操作担当・受取人・支払者の役割", paragraphs: ["請求の操作担当は請求作成、正しいリンクの配布、進捗確認、管理専用の復旧操作を行います。受取人は送金を受けるXRPLアカウントです。各支払者は自分の固定済みPaymentSlotだけを確認して署名します。", "同じ人が複数の役割を持つことはできますが、管理リンク、閲覧専用リンク、支払いリンクを同じ権限として扱いません。"] },
    { id: "payment-modes", title: "支払いモード", paragraphs: ["代表者へ支払うモードは、立替精算、共同購入、会費、分担金など、1人が受け取る場合に使います。受取人負担分は自己送金なしの会計値として記録できます。", "店舗や主催者へ直接支払うモードでは、全支払者が外部の受取先へ送金します。請求総額の全額を支払枠へ割り当て、受取人負担分はありません。"] },
    { id: "create-and-freeze", title: "作成・割り当て・確認・確定", paragraphs: ["操作担当はモード、受取先、ネットワーク、精算資産、総額、支払者ウォレット、割り当て方式を選びます。均等、個別金額、割合、比率の入力は、作成前に固定精度の正確な金額へ変換されます。", "最終確認では受取先、Destination Tag、資産識別、金額、支払者ウォレット、割り当てを表示します。確定すると条件が固定され、独立したPaymentSlotと権限リンクが作成されます。"], bullets: ["受取人負担分は会計値で、PaymentSlotを作りません。", "端数処理は確定前に解決します。", "固定済み条件を後から直接編集しません。"] },
    { id: "capability-links", title: "権限リンクとアクセス範囲", paragraphs: ["管理、閲覧専用進捗、支払い、RLUSD準備、公開証明のリンクは、それぞれ異なる操作と情報を公開します。非公開リンクを持つ人は定められた権限を使えるため、対象者だけに共有してください。", "対応するリンクでは権限をURLフラグメントへ置き、通常のページ要求のパスやクエリへ送らないようにします。保存するのは再利用可能な生トークンではなくハッシュです。"], bullets: ["管理リンクは支払者名、予定ウォレット、確認情報、復旧操作を表示する場合があります。", "閲覧専用リンクは管理専用の支払者情報と操作を隠します。", "支払いリンクは1つのPaymentSlotだけを操作し、請求管理権限を与えません。"] },
    { id: "xrp", title: "XRPで支払う", paragraphs: ["XRPはXRPLのネイティブ資産です。Group Payはdrops互換の固定精度で金額を確定し、ネットワーク手数料はウォレットと現在の検証済み台帳状態から別に決まります。", "支払者には、リザーブを差し引いた利用可能XRPとして、請求額と推定手数料を満たす残高が必要です。表示残高の全額が利用可能とは限りません。"] },
    { id: "rlusd", title: "公式RLUSDで支払う", paragraphs: ["RLUSDはXRPL上の発行資産です。Group Payはネットワークごとの公式通貨コードと発行者を金額と一緒に固定・検証し、ティッカー名だけでは受け入れません。", "支払者には公式トラストライン、十分な利用可能RLUSD、手数料とリザーブ用の利用可能XRPが必要です。受取人も固定済み資産を受け取れる必要があります。"] },
    { id: "trustset", title: "公式RLUSD TrustSetの準備", paragraphs: ["TrustSetは選択したネットワークの公式RLUSDを保有できるようにする別のXRPL取引です。請求額の支払いではなく、RLUSD残高も増やしません。", "準備要求では公式発行者、通貨、対象アカウント、ネットワーク、上限を固定します。署名後、Group Payは検証済み台帳で予定トラストラインを確認してから支払い画面へ戻します。"] },
    { id: "readiness", title: "準備状態・残高・手数料・リザーブ", paragraphs: ["ウォレット要求を作る前に、支払者と受取人の検証済みアカウント・資産情報を確認します。準備不足なら支払い要求を作らず、情報取得不能なら推測せず再確認を案内します。", "XRPではアカウント存在、利用可能残高、推定手数料、リザーブを確認します。RLUSDではさらにトラストライン、認可・凍結状態、発行資産残高、受取可能性を確認します。"], bullets: ["準備完了は、確認時点の情報が固定済み負担条件を満たす状態です。", "ブロックは、設定や残高の具体的な変更が必要な状態です。", "取得不能は情報を確認できず、支払い要求を作らない状態です。"] },
    { id: "payment-flow", title: "共有・確認・署名・送信", paragraphs: ["操作担当は各支払者へ専用の非公開支払いリンクを送ります。支払者はXamanへ進む前に受取先、ネットワーク、資産、必要な場合は発行者、金額、準備結果を確認します。", "Xamanは正確な取引テンプレートを表示し、支払者自身が承認または拒否します。送信後も署名だけで完了とせず、検証済み台帳による確認を待ちます。"] },
    { id: "verification", title: "検証済み台帳確認と重複防止", paragraphs: ["サーバーはPaymentSlotを再取得し、Xamanペイロードを再読込し、検証済みXRPL取引の支払者、受取先、資産、金額、タグ、InvoiceID、取引規則を固定済み条件と照合します。", "成功時は検証済みレシートの保存または再利用、対象PaymentSlotの支払済み化、請求進捗の再計算を原子的に行います。取引IDとInvoiceIDの一意性により、同じ支払い識別を別の負担へ使えません。"], bullets: ["Partial Paymentと異通貨経路を拒否します。", "実際の受渡資産と受渡金額が一致する必要があります。", "同一内容の再検証は冪等に成功し、矛盾する情報は拒否します。"] },
    { id: "progress", title: "請求と支払者の進捗", paragraphs: ["進捗画面は固定済みPaymentSlotと検証済みレシートから合計を算出し、支払者からの予定額、検証済み額、残額、支払済み人数、残り人数、モードに合った受取人負担分を表示します。", "管理画面は支払者名、予定ウォレット、InvoiceID、確認理由、復旧操作を表示する場合があります。閲覧専用画面ではこれらの管理専用情報を意図的に隠します。"] },
    { id: "status-meanings", title: "ステータスの意味", paragraphs: ["未払いは一致する検証済みPaymentがない状態です。要求作成済み・署名待ちはまだ検証済み送金がありません。送信済み・検証中は結果が不確かで、代替支払いを停止します。", "支払済みは固定済み負担条件全体の検証完了です。拒否・期限切れは照合後に安全な再試行へ進める場合があります。検証失敗・要確認は観測取引を黙って受理または置換しません。"], bullets: ["中立：成功・失敗ではない識別や情報。", "進行中：人、プロバイダー、検証済み台帳を待つ状態。", "完了：固定済み負担条件を検証済み。", "対応必要：設定、再試行、再確認、人による確認が必要。", "破壊的：確定した危険、失敗、不可逆操作の境界。"] },
    { id: "failures", title: "対応している失敗パターン", paragraphs: ["安全な失敗には支払者の拒否、期限切れ、一部の確定済み取引失敗があります。一時的なプロバイダー、ネットワーク、台帳読取の問題は再確認待ちにします。準備不足はアカウント、トラストライン、リザーブ、手数料、残高の対応を案内します。", "送信者、受取先、金額、資産、発行者、タグ、InvoiceIDの不一致、部分送金、異通貨、ハッシュ競合、重複識別、複数候補は、自動受理せず確認または終了扱いにします。"] },
    { id: "recovery", title: "安全な再試行・再確認・準備・終了", paragraphs: ["各失敗は、安全な再試行、再確認待ち、準備必要、確認必要、支払済み、終了のいずれかに分類されます。画面にはその分類で許可された操作だけを表示します。", "以前のウォレット要求を置き換える前に検証済み台帳履歴を照合します。すでに資金が動いた可能性がある場合は自動置換を止め、管理者が手動で支払済みにする機能も提供しません。"] },
    { id: "review-required", title: "確認が必要な取引", paragraphs: ["管理画面では固定済みの予定条件と観測取引情報を並べます。不一致や複数候補は、操作担当が証拠を理解し、ポリシー上の次の操作が許可されるまで停止します。", "別の試行を許可するには、以前の取引で資金が動いた可能性と重複支払いの危険を明示的に確認する必要があります。許可しても支払済みにはならず、ウォレット要求も自動作成しません。"] },
    { id: "partial-completion", title: "1人の失敗と部分完了", paragraphs: ["PaymentSlotは独立して精算されます。1人が拒否、準備不足、保留、要確認でも、他の支払者の検証済みレシートは取り消されず、復旧中は請求が一部支払済みのまま残る場合があります。", "全員一括の原子的な送金ではありません。進捗画面は検証済み額と残額を分け、何が完了し何が未完了かを表示します。"] },
    { id: "incomplete-closure", title: "未完了として請求を終了", paragraphs: ["管理権限では、理由を選び、新規支払い停止と自動返金なしの説明を確認し、正確な確認文字列を入力して、未精算の請求を未完了として終了できます。", "終了すると未払い枠の新しいウォレット要求を恒久的に停止し、検証済みレシート、支払取引、支払済み合計、公開証明を保持します。検証済み送金の取消や返金は行わず、請求を再開できません。"] },
    { id: "copy-to-revise", title: "固定済み請求をコピーして修正", paragraphs: ["固定済みの受取先、支払者、金額、資産、InvoiceID、権限識別は直接編集しません。管理画面から編集可能な情報と最終割り当てを新しいブラウザ内下書きへコピーし、別の請求として作成できます。", "新しい請求ではBill、PaymentSlot、権限、InvoiceID、リンクをすべて新規生成します。元の取引、レシート、証明、確認記録、権限はコピーせず、元の請求も変更しません。"] },
    { id: "privacy", title: "プライバシーとデータ境界", paragraphs: ["非公開権限リンク、支払者ウォレット、支払者名、管理用確認情報、ブラウザ内下書きを、公開投稿、解析、ログ、サポート用スクリーンショット、ガイドURLへ含めないでください。公開証明は承認済みレシート情報だけを公開します。", "コンテキストヘルプは固定された公開ガイドアンカーを保護された別タブで開き、現在のURLフラグメント、クエリ、権限、下書き、非公開請求情報をコピーしません。"] },
    { id: "security-limitations", title: "安全確認と制限", paragraphs: ["Group Payは対応アドレス、資産識別、正確な金額、タグ、InvoiceID、Xaman状態、検証済み台帳、重複境界、D1状態遷移を確認し、必要情報を確定できない場合は失敗側に倒します。", "シード復旧、代理署名、XamanやXRPLの可用性保証、検証済み送金の取消、自動返金、XRPとRLUSDの交換、誤送金を受取人が返すことの保証はできません。"], bullets: ["署名前にネットワーク、受取先、Destination Tag、資産、発行者、金額を確認してください。", "Mainnet作成が運用上有効な場合、実資産を不可逆に送金します。", "公開証明は保存済み検証結果を示しますが、カストディ、エスクロー、保険、返金保証ではありません。"] },
    { id: "faq", title: "よくある質問", paragraphs: ["請求作成やコピーで資金は動きますか？ 動きません。支払い指示と権限リンクを作成・編集するだけで、支払者が承認したXRPL取引だけが資金を動かします。", "XRPとRLUSDを交換できますか？ できません。請求ごとに1つの精算資産を固定し、交換やクオート実行は行いません。", "操作担当が手動で支払済みにできますか？ できません。検証済み台帳確認と原子的な保存処理が必要です。", "1人の失敗で全員が取り消されますか？ 取り消されません。検証済み枠は維持され、継続、一部完了、未完了終了のいずれかになります。", "固定済み請求を編集できますか？ 直接編集できません。新しい下書きへコピーし、新しい識別を持つ別の請求を作成します。"] },
  ],
};

const ko: GuideLocaleContent = {
  eyebrow: "제품 가이드",
  title: "XRPL Group Pay 작동 방식",
  description:
    "비수탁 공동 정산, 청구 생성, XRP 및 공식 RLUSD 준비, 검증 원장 확인, 진행 상태, 실패 처리와 안전한 수정 방식을 설명하는 전체 가이드입니다.",
  contentsLabel: "이 페이지의 내용",
  homeLabel: "홈으로 돌아가기",
  openInNewTabLabel: "전체 가이드 열기",
  searchLabel: "가이드 검색",
  searchPlaceholder: "상태, RLUSD, 재시도, 개인정보…",
  searchHint: "섹션 제목, 설명 및 복구 안내를 검색합니다.",
  clearSearchLabel: "검색 지우기",
  noResultsTitle: "일치하는 가이드 섹션이 없습니다",
  noResultsBody: "결제, 상태, RLUSD, 재시도 또는 링크처럼 더 넓은 검색어를 사용해 보세요.",
  resultLabel: "개 섹션",
  sections: [
    { id: "overview", title: "목적과 비수탁 작동 방식", paragraphs: ["XRPL Group Pay는 결제자 자금을 받거나 모으거나 통제하지 않고 공동 청구를 조정합니다. 각 결제자는 자신의 지갑에서 독립 XRPL 거래에 서명하고 고정된 수취인 계정으로 직접 전송합니다.", "청구 생성, Xaman 열기, 서명 또는 공급자 콜백만으로 결제가 증명되지는 않습니다. 검증된 원장 거래가 고정 의무와 일치한 뒤에만 PaymentSlot을 결제 완료로 표시합니다."], bullets: ["시드, 개인 키 또는 대리 서명 권한을 요구하지 않습니다.", "애플리케이션이 통제하는 에스크로나 공동 잔액을 만들지 않습니다.", "검증된 전송은 결제자에서 수취인으로 직접 이동합니다."] },
    { id: "roles", title: "청구 운영자, 수취인 및 결제자 역할", paragraphs: ["청구 운영자는 청구를 만들고 올바른 링크를 배포하며 진행 상황과 관리 전용 복구 제어를 사용합니다. 수취인은 전송을 받는 XRPL 계정입니다. 각 결제자는 자신의 고정 PaymentSlot만 검토하고 서명합니다.", "한 사람이 여러 역할을 맡을 수 있지만 관리 링크, 읽기 전용 링크 및 결제 링크를 같은 권한으로 취급하지 않습니다."] },
    { id: "payment-modes", title: "결제 모드", paragraphs: ["대표자에게 결제 모드는 환급, 공동 구매, 회비 또는 분담금처럼 한 사람이 받는 경우에 사용합니다. 수취인 부담분은 자기 전송 없이 회계 값으로 기록할 수 있습니다.", "상점 또는 주최자에게 직접 결제 모드에서는 모든 결제자가 외부 수취인에게 전송합니다. 전체 청구 금액을 결제 슬롯에 배정하며 수취인 부담분은 없습니다."] },
    { id: "create-and-freeze", title: "생성, 배정, 검토 및 고정", paragraphs: ["운영자는 모드, 수취인, 네트워크, 정산 자산, 총액, 결제자 지갑과 배정 방식을 선택합니다. 균등, 사용자 지정, 비율 및 지분 입력은 생성 전에 고정 정밀도의 정확한 금액으로 확정됩니다.", "최종 검토는 수취인, Destination Tag, 자산 식별, 금액, 결제자 지갑 및 배정을 표시합니다. 확인하면 사실이 고정되고 독립 PaymentSlot과 기능 링크가 생성됩니다."], bullets: ["수취인 부담분은 회계 값이며 PaymentSlot을 만들지 않습니다.", "나머지 금액 처리는 고정 전에 해결합니다.", "고정된 결제 사실은 나중에 제자리에서 수정하지 않습니다."] },
    { id: "capability-links", title: "기능 링크와 접근 범위", paragraphs: ["관리, 읽기 전용 진행, 결제, RLUSD 설정 및 공개 증명 링크는 서로 다른 작업과 데이터를 노출합니다. 비공개 기능 링크를 가진 사람은 정의된 접근을 사용할 수 있으므로 의도한 대상에게만 공유하십시오.", "지원되는 링크는 기능을 URL 조각에 넣어 일반 페이지 요청의 경로나 쿼리에 보내지 않습니다. 재사용 가능한 원시 토큰 대신 기능 해시를 저장합니다."], bullets: ["관리 링크는 결제자 이름, 예상 지갑, 검토 사실 및 복구 제어를 표시할 수 있습니다.", "읽기 전용 진행 링크는 관리 전용 결제자 정보와 작업을 숨깁니다.", "결제 링크는 하나의 PaymentSlot만 제어하고 청구 관리 권한을 주지 않습니다."] },
    { id: "xrp", title: "XRP 결제", paragraphs: ["XRP는 XRPL 네이티브 자산입니다. Group Pay는 drops 호환 고정 정밀도로 금액을 고정하며 네트워크 수수료는 지갑과 현재 검증 원장 상태가 별도로 결정합니다.", "결제자는 준비금을 제외한 사용 가능 XRP로 청구 금액과 예상 수수료를 충족해야 합니다. 표시된 계정 잔액 전체가 사용 가능한 것은 아닙니다."] },
    { id: "rlusd", title: "공식 RLUSD 결제", paragraphs: ["RLUSD는 XRPL 발행 자산입니다. Group Pay는 네트워크별 공식 통화 코드와 발행자를 금액과 함께 고정하고 검증하며 티커 텍스트만으로 허용하지 않습니다.", "결제자는 공식 트러스트라인, 충분한 사용 가능 RLUSD, 수수료와 준비금용 사용 가능 XRP가 필요합니다. 수취인도 고정 자산을 받을 수 있어야 합니다."] },
    { id: "trustset", title: "공식 RLUSD TrustSet 준비", paragraphs: ["TrustSet은 선택한 네트워크에서 공식 RLUSD를 보유하도록 구성하는 별도 XRPL 거래입니다. 청구 금액을 지불하지 않으며 RLUSD 잔액도 제공하지 않습니다.", "설정 요청은 공식 발행자, 통화, 계정, 네트워크 및 한도를 고정합니다. 서명 후 Group Pay는 검증 원장에서 예상 트러스트라인을 확인한 뒤 결제 흐름으로 돌아갑니다."] },
    { id: "readiness", title: "준비 상태, 잔액, 수수료 및 준비금", paragraphs: ["지갑 요청 전에 결제자와 수취인의 검증된 계정 및 자산 사실을 읽습니다. 차단된 준비 결과는 결제 요청 생성을 막고, 사용할 수 없는 결과는 추측 대신 재확인을 요청합니다.", "XRP 준비는 계정 존재, 사용 가능 잔액, 예상 수수료 및 준비금을 확인합니다. RLUSD는 트러스트라인, 승인 또는 동결 상태, 발행 자산 잔액과 수취 가능성도 확인합니다."], bullets: ["준비 완료는 확인된 사실이 현재 고정 의무를 충족하는 상태입니다.", "차단은 구체적인 설정 또는 잔액 변경이 필요한 상태입니다.", "사용 불가는 사실을 확인할 수 없어 결제 요청을 만들지 않는 상태입니다."] },
    { id: "payment-flow", title: "공유, 검토, 서명 및 제출", paragraphs: ["운영자는 각 결제자에게 전용 비공개 결제 링크를 보냅니다. 결제자는 Xaman으로 이동하기 전에 수취인, 네트워크, 자산, 필요한 경우 발행자, 금액 및 준비 결과를 확인합니다.", "Xaman은 정확한 거래 템플릿을 보여 주고 결제자가 직접 승인하거나 거절합니다. 제출 후에도 서명만으로 완료하지 않고 검증 원장 확인을 기다립니다."] },
    { id: "verification", title: "검증 원장 확인과 중복 방지", paragraphs: ["서버는 PaymentSlot을 다시 확인하고 Xaman 페이로드를 다시 가져와 검증 XRPL 거래의 결제자, 수취인, 자산, 금액, 태그, InvoiceID 및 거래 규칙을 고정 의무와 비교합니다.", "성공 시 검증 영수증 저장 또는 재사용, 해당 PaymentSlot 결제 완료, 청구 진행 재계산을 원자적으로 수행합니다. 거래 ID와 InvoiceID 고유성은 같은 결제 식별자가 다른 의무를 정산하지 못하게 합니다."], bullets: ["Partial Payment와 교차 통화 동작을 거부합니다.", "실제 전달 자산과 전달 금액이 의무와 일치해야 합니다.", "동일 사실의 반복 검증은 멱등 성공하고 충돌하는 사실은 닫힌 상태로 실패합니다."] },
    { id: "progress", title: "청구 및 결제자 진행", paragraphs: ["진행 화면은 고정 PaymentSlot과 검증 영수증에서 합계를 계산하여 결제자 예상 금액, 검증 금액, 남은 금액, 완료 및 남은 인원과 모드에 맞는 수취인 부담 회계를 표시합니다.", "관리 화면은 결제자 이름, 예상 지갑, InvoiceID, 검토 사유 및 복구 제어를 표시할 수 있습니다. 읽기 전용 화면은 이러한 관리 전용 세부 정보를 의도적으로 숨깁니다."] },
    { id: "status-meanings", title: "상태 의미", paragraphs: ["미결제는 일치하는 검증 Payment가 없는 상태입니다. 요청 생성 및 서명 대기는 아직 검증 전송이 없습니다. 제출 및 검증 중은 결과가 불확실하여 교체 결제를 차단합니다.", "결제 완료는 고정 의무 전체가 검증된 상태입니다. 거절 또는 만료는 대조 후 안전한 재시도가 가능할 수 있습니다. 검증 실패 또는 검토 필요는 관찰 거래를 조용히 수락하거나 교체하지 않습니다."], bullets: ["중립: 성공이나 실패가 아닌 식별 또는 정보.", "진행 중: 사람, 공급자 또는 검증 원장을 기다림.", "완료: 고정 의무가 검증됨.", "조치 필요: 설정, 재시도, 재확인 또는 사람의 검토가 필요함.", "파괴적: 확인된 위험, 실패 또는 되돌릴 수 없는 작업 경계."] },
    { id: "failures", title: "지원되는 실패 패턴", paragraphs: ["안전한 실패에는 결제자 거절, 만료된 요청 및 일부 확인된 거래 실패가 포함됩니다. 일시적 공급자, 네트워크 또는 원장 읽기 문제는 재확인 대기로 처리합니다. 준비 실패는 계정, 트러스트라인, 준비금, 수수료 또는 잔액 설정을 안내합니다.", "잘못된 발신자, 수취인, 금액, 자산, 발행자, 태그, InvoiceID, 부분 결제, 교차 통화, 해시 충돌, 중복 식별 또는 복수 후보는 자동 수락 대신 검토 또는 종료 처리가 필요합니다."] },
    { id: "recovery", title: "안전한 재시도, 재확인, 설정 및 종료", paragraphs: ["각 실패는 안전한 재시도, 재확인 대기, 설정 필요, 검토 필요, 이미 결제됨 또는 종료 중 하나로 분류됩니다. 화면은 해당 분류가 허용하는 작업만 표시합니다.", "이전 지갑 요청을 교체하기 전에 검증 원장 기록을 대조합니다. 가치가 이미 이동했을 수 있으면 자동 교체를 차단하고 관리자가 수동으로 결제 완료를 선언하는 기능도 제공하지 않습니다."] },
    { id: "review-required", title: "검토가 필요한 거래", paragraphs: ["관리 검토는 고정된 예상 사실과 관찰 거래 사실을 나란히 표시합니다. 불일치 또는 복수 후보는 운영자가 증거를 이해하고 제품 정책이 다음 작업을 허용할 때까지 차단됩니다.", "다른 시도를 허용하려면 이전 거래로 가치가 이동했을 가능성과 중복 결제 위험을 명시적으로 확인해야 합니다. 허용은 슬롯을 결제 완료로 만들거나 지갑 요청을 자동 생성하지 않습니다."] },
    { id: "partial-completion", title: "한 결제자의 실패와 부분 완료", paragraphs: ["PaymentSlot은 독립적으로 정산됩니다. 한 결제자가 거절, 차단, 보류 또는 검토 필요 상태여도 다른 결제자의 검증 영수증은 되돌아가지 않으며 복구 중 청구가 부분 결제 상태로 남을 수 있습니다.", "전체 그룹의 원자적 일괄 전송이 아닙니다. 진행 화면은 검증 금액과 남은 금액을 분리하여 무엇이 완료되고 남았는지 보여 줍니다."] },
    { id: "incomplete-closure", title: "청구를 미완료로 종료", paragraphs: ["관리 기능은 사유를 선택하고 새 결제 중지 및 자동 환불 없음 설명을 승인하고 정확한 확인 문구를 입력한 뒤 활성 미정산 청구를 미완료로 종료할 수 있습니다.", "종료는 미결제 슬롯의 새 지갑 요청을 영구 중지하면서 검증 영수증, 결제 거래, 완료 합계 및 공개 증명을 보존합니다. 검증 전송을 취소하거나 환불하지 않으며 청구를 다시 열 수 없습니다."] },
    { id: "copy-to-revise", title: "고정 청구를 복사해 수정", paragraphs: ["고정된 수취인, 결제자, 금액, 자산, InvoiceID 및 기능 식별자는 제자리에서 수정하지 않습니다. 관리 화면은 편집 가능한 사실과 최종 배정을 새 브라우저 로컬 초안으로 복사하여 별도 청구를 만들 수 있습니다.", "새 청구는 Bill, PaymentSlot, 기능, InvoiceID 및 링크 식별자를 새로 생성합니다. 원본 거래, 영수증, 증명, 검토 기록 및 기능은 복사하지 않으며 원본 청구는 변경되지 않습니다."] },
    { id: "privacy", title: "개인정보와 데이터 경계", paragraphs: ["비공개 기능 링크, 결제자 지갑, 결제자 이름, 관리 검토 사실 및 브라우저 로컬 초안을 공개 게시물, 분석, 로그, 지원 스크린샷 또는 가이드 URL에 포함하지 마십시오. 공개 증명은 승인된 영수증 계약만 노출합니다.", "상황별 도움말은 고정 공개 가이드 앵커를 보호된 새 탭에서 열며 현재 URL 조각, 쿼리, 기능, 초안 값 또는 비공개 청구 데이터를 복사하지 않습니다."] },
    { id: "security-limitations", title: "보안 확인과 제한", paragraphs: ["Group Pay는 지원 주소, 자산 식별, 정확한 금액, 태그, InvoiceID, Xaman 생명주기, 검증 원장 상태, 중복 경계 및 D1 상태 전이를 확인하고 필요한 사실을 확정할 수 없으면 닫힌 상태로 실패합니다.", "시드 복구, 사용자 대신 서명, 공급자 또는 XRPL 가용성 보장, 검증 전송 취소, 자동 환불, XRP와 RLUSD 교환 또는 수취인의 자발적 오송금 반환을 보장할 수 없습니다."], bullets: ["서명 전에 네트워크, 수취인, Destination Tag, 자산, 발행자 및 금액을 검토하십시오.", "Mainnet 생성이 운영상 활성화되면 실제 되돌릴 수 없는 자산을 전송합니다.", "공개 증명은 저장된 검증 결과이며 수탁, 에스크로, 보험 또는 환불 약속이 아닙니다."] },
    { id: "faq", title: "자주 묻는 질문", paragraphs: ["청구를 만들거나 복사하면 자금이 이동합니까? 아니요. 결제 지시와 기능 링크를 만들거나 편집할 뿐이며 결제자가 승인한 XRPL 거래만 가치를 이동합니다.", "XRP와 RLUSD를 변환할 수 있습니까? 아니요. 각 청구는 하나의 정산 자산을 고정하며 Group Pay는 교환이나 견적 실행을 하지 않습니다.", "운영자가 수동으로 결제 완료를 표시할 수 있습니까? 아니요. 검증 원장 확인과 원자적 영속화 경로가 필요합니다.", "한 결제자의 실패가 모두를 취소합니까? 아니요. 검증 슬롯은 결제 완료로 유지되며 청구는 계속되거나 부분 상태 또는 미완료 종료가 될 수 있습니다.", "고정 청구를 편집할 수 있습니까? 제자리 편집은 불가능합니다. 새 초안으로 복사하여 새 식별자를 가진 별도 청구를 만듭니다."] },
  ],
};

const contentByLocale: Record<Locale, GuideLocaleContent> = { en, ja, ko };

export function getGuideContent(locale: Locale): GuideLocaleContent {
  return contentByLocale[locale] ?? en;
}

export function guideHref(section: GuideSectionId): `/guide#${GuideSectionId}` {
  return `/guide#${section}`;
}
