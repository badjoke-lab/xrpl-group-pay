import type { Locale } from "@/features/localization/catalog";
import type { CreatedBill } from "@/features/bills/types";
import { formatMoneyAmount } from "@/features/money/money";

export type SharedBillSlot = CreatedBill["slots"][number];

const copy = {
  en: {
    heading: "XRPL Group Pay payment instructions",
    bill: "Bill",
    payer: "Expected payer address",
    network: "Network",
    asset: "Asset",
    amount: "Amount",
    recipient: "Recipient",
    tag: "Destination Tag",
    link: "Payment link",
    fee: "Keep enough spendable XRP for the XRPL network fee.",
    xrpReady: "Keep enough spendable XRP for both the payment amount and network fee.",
    rlusdReady:
      "Before paying, confirm the wallet has the official RLUSD trust line, enough RLUSD balance, and enough spendable XRP for fees and reserve requirements.",
    rlusdSetup:
      "RLUSD setup does not provide RLUSD and does not pay the Bill. Open the participant payment link, complete the official TrustSet flow if Group Pay reports that the trust line is missing, then return and recheck readiness before creating the Payment request.",
    verify:
      "Review the network, recipient, asset, issuer, amount, tag, and InvoiceID in the wallet before signing. Payment is complete only after validated-ledger verification.",
    private:
      "This payment link is for the named payer. Do not replace it with a management or progress link.",
  },
  ja: {
    heading: "XRPL Group Pay 支払い案内",
    bill: "請求",
    payer: "予定支払者アドレス",
    network: "ネットワーク",
    asset: "資産",
    amount: "金額",
    recipient: "受取先",
    tag: "Destination Tag",
    link: "支払いリンク",
    fee: "XRPLネットワーク手数料用の利用可能XRPを残してください。",
    xrpReady: "支払額とネットワーク手数料の両方に十分な利用可能XRPが必要です。",
    rlusdReady:
      "支払い前に、公式RLUSDトラストライン、十分なRLUSD残高、手数料とリザーブ条件を満たす利用可能XRPを確認してください。",
    rlusdSetup:
      "RLUSDの準備ではRLUSDは付与されず、請求の支払いも行われません。参加者用支払いリンクを開き、トラストライン不足と表示された場合は公式TrustSetフローを完了し、支払いリクエスト作成前に戻って準備状態を再確認してください。",
    verify:
      "署名前にウォレット上のネットワーク、受取先、資産、発行者、金額、タグ、InvoiceIDを確認してください。検証済み台帳で確認された後だけ支払い完了になります。",
    private:
      "この支払いリンクは指定された支払者用です。管理リンクや進捗リンクへ置き換えないでください。",
  },
  ko: {
    heading: "XRPL Group Pay 결제 안내",
    bill: "청구",
    payer: "예상 결제자 주소",
    network: "네트워크",
    asset: "자산",
    amount: "금액",
    recipient: "수취인",
    tag: "Destination Tag",
    link: "결제 링크",
    fee: "XRPL 네트워크 수수료를 위한 사용 가능 XRP를 남겨 두십시오.",
    xrpReady: "결제 금액과 네트워크 수수료 모두에 충분한 사용 가능 XRP가 필요합니다.",
    rlusdReady:
      "결제 전에 공식 RLUSD 트러스트라인, 충분한 RLUSD 잔액, 수수료와 준비금 조건을 위한 사용 가능 XRP를 확인하십시오.",
    rlusdSetup:
      "RLUSD 준비는 RLUSD를 제공하지 않으며 청구를 결제하지도 않습니다. 참가자 결제 링크를 열고 트러스트라인이 없다고 표시되면 공식 TrustSet 흐름을 완료한 뒤 돌아와 Payment 요청 생성 전에 준비 상태를 다시 확인하십시오.",
    verify:
      "서명 전에 지갑에서 네트워크, 수취인, 자산, 발행자, 금액, 태그와 InvoiceID를 확인하십시오. 검증된 원장에서 확인된 뒤에만 결제가 완료됩니다.",
    private:
      "이 결제 링크는 지정된 결제자용입니다. 관리 링크나 진행 링크로 바꾸지 마십시오.",
  },
} as const;

export function participantCollectionUnits(created: CreatedBill): string {
  return created.slots
    .reduce((sum, slot) => sum + BigInt(slot.expectedAmount.units), 0n)
    .toString();
}

export function participantCollectionAmount(created: CreatedBill) {
  return {
    code: created.bill.totalAmount.code,
    scale: created.bill.totalAmount.scale,
    units: participantCollectionUnits(created),
  };
}

export function buildParticipantInstructions(input: {
  locale: Locale;
  created: CreatedBill;
  slot: SharedBillSlot;
  paymentUrl: string;
}): string {
  const { locale, created, slot, paymentUrl } = input;
  const text = copy[locale] ?? copy.en;
  const issued = created.bill.asset.assetType === "issued";
  const network = created.bill.network === "mainnet" ? "XRPL Mainnet" : "XRPL Testnet";
  const asset = issued
    ? `${created.bill.asset.symbol} (${created.bill.asset.issuer})`
    : created.bill.asset.symbol;
  const lines = [
    text.heading,
    "",
    `${text.bill}: ${created.bill.title}`,
    `${text.payer}: ${slot.expectedPayerAddress}`,
    `${text.network}: ${network}`,
    `${text.asset}: ${asset}`,
    `${text.amount}: ${formatMoneyAmount(slot.expectedAmount)} ${slot.expectedAmount.code}`,
    `${text.recipient}: ${created.bill.destinationAddress}`,
    ...(created.bill.destinationTag === null
      ? []
      : [`${text.tag}: ${created.bill.destinationTag}`]),
    `${text.link}: ${paymentUrl}`,
    "",
    issued ? text.rlusdReady : text.xrpReady,
    text.fee,
    text.verify,
    text.private,
  ];
  return lines.join("\n");
}

export function buildRlusdPreparationInstructions(input: {
  locale: Locale;
  created: CreatedBill;
  slot: SharedBillSlot;
  paymentUrl: string;
}): string {
  const text = copy[input.locale] ?? copy.en;
  return [
    text.heading,
    "",
    `${text.bill}: ${input.created.bill.title}`,
    `${text.payer}: ${input.slot.expectedPayerAddress}`,
    `${text.network}: ${input.created.bill.network === "mainnet" ? "XRPL Mainnet" : "XRPL Testnet"}`,
    `${text.asset}: ${input.created.bill.asset.symbol} (${input.created.bill.asset.issuer})`,
    `${text.link}: ${input.paymentUrl}`,
    "",
    text.rlusdReady,
    text.rlusdSetup,
    text.fee,
    text.private,
  ].join("\n");
}
