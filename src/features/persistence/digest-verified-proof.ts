import type { LedgerVerificationProof } from "@/features/payment-verification/types";

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (value) =>
    value.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}

export async function digestVerifiedProof(proof: LedgerVerificationProof) {
  const canonical = JSON.stringify({
    network: proof.network,
    transactionId: proof.transactionId,
    ledgerIndex: proof.ledgerIndex,
    sender: proof.sender,
    destination: proof.destination,
    amountDrops: proof.amountDrops,
    deliveredAmountDrops: proof.deliveredAmountDrops,
    sourceTag: proof.sourceTag,
    destinationTag: proof.destinationTag,
    invoiceId: proof.invoiceId,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return bytesToHex(digest);
}
