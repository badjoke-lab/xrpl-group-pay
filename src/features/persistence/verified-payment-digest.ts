import { verifiedPaymentSchema, type VerifiedPayment } from "@/features/payment-verification/verified-payment";

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export function canonicalVerifiedPayment(input: VerifiedPayment) {
  const payment = verifiedPaymentSchema.parse(input);
  return JSON.stringify({
    contractVersion: payment.contractVersion,
    receiptContract: payment.receiptContract,
    network: payment.network,
    transactionId: payment.transactionId,
    ledgerIndex: payment.ledgerIndex,
    sender: payment.sender,
    destination: payment.destination,
    assetId: payment.asset.id,
    assetType: payment.asset.assetType,
    currency: payment.asset.currency,
    issuer: payment.asset.issuer,
    precision: payment.asset.precision,
    requestedAmount: payment.requestedAmount,
    deliveredAmount: payment.deliveredAmount,
    sourceTag: payment.sourceTag,
    destinationTag: payment.destinationTag,
    invoiceId: payment.invoiceId,
    idempotencyKey: payment.idempotencyKey,
    verifiedAt: payment.verifiedAt,
  });
}

export async function digestVerifiedPayment(input: VerifiedPayment) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonicalVerifiedPayment(input)),
  );
  return toHex(digest);
}
