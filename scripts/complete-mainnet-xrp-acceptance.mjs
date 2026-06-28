import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ORIGIN = "https://xgp.badjoke-lab.com";

function required(environment, name) {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function postVerification(state, paymentToken) {
  const response = await fetch(`${ORIGIN}/api/payments/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-XRPL-Mainnet-Acceptance": state.acceptanceToken,
    },
    body: JSON.stringify({ paymentToken, payloadId: state.payloadId }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const body = await response.json().catch(() => null);
  return { statusCode: response.status, body };
}

export async function completeMainnetXrpAcceptance({
  environment = process.env,
  wait = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)),
} = {}) {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new Error("Mainnet XRP acceptance may run only in GitHub Actions.");
  }
  const statePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_STATE_PATH"));
  const outcomePath = resolve(required(environment, "MAINNET_XRP_ACCEPTANCE_OUTCOME_PATH"));
  const state = JSON.parse(await readFile(statePath, "utf8"));
  for (const value of [state.acceptanceToken, state.primaryPaymentToken, state.replayPaymentToken, state.payloadId]) {
    if (value) console.log(`::add-mask::${value}`);
  }

  let verified;
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const response = await postVerification(state, state.primaryPaymentToken);
    if (response.statusCode === 200 && response.body?.status === "verified") {
      verified = response.body;
      break;
    }
    if (response.statusCode === 202 && response.body?.status === "pending") {
      await wait(10_000);
      continue;
    }
    throw new Error(`Mainnet XRP verification failed with ${response.statusCode}: ${JSON.stringify(response.body)}`);
  }
  if (!verified) {
    throw new Error("The participant-controlled Mainnet XRP signature timed out.");
  }

  const duplicate = await postVerification(state, state.primaryPaymentToken);
  const duplicateRejected =
    duplicate.statusCode === 409 ||
    duplicate.body?.error?.code === "PAYMENT_SLOT_ALREADY_PAID" ||
    duplicate.body?.error?.code === "PAYMENT_SLOT_SETTLEMENT_CONFLICT";
  if (!duplicateRejected) {
    throw new Error(`Duplicate verification was not rejected: ${JSON.stringify(duplicate)}`);
  }

  const replay = await postVerification(state, state.replayPaymentToken);
  const replayRejected =
    replay.statusCode === 409 ||
    (replay.statusCode === 422 && replay.body?.status === "failed");
  if (!replayRejected) {
    throw new Error(`Cross-slot replay was not rejected: ${JSON.stringify(replay)}`);
  }

  const proof = verified.proof;
  const receipt = verified.receipt;
  if (
    proof?.network !== "mainnet" ||
    proof?.amountDrops !== state.amountDrops ||
    proof?.deliveredAmountDrops !== state.amountDrops ||
    proof?.sender !== state.payer ||
    proof?.destination !== state.destination ||
    receipt?.network !== "mainnet" ||
    receipt?.transactionId !== proof?.transactionId
  ) {
    throw new Error("The verified Mainnet XRP outcome does not match the controlled request.");
  }

  await writeFile(
    outcomePath,
    `${JSON.stringify({ schema_version: 1, network: "mainnet", asset_id: "xrpl:mainnet:xrp", verified_at: proof.verifiedAt, transaction_hash: proof.transactionId, ledger_index: proof.ledgerIndex, sender: proof.sender, destination: proof.destination, amount_drops: proof.amountDrops, delivered_amount_drops: proof.deliveredAmountDrops, source_tag: proof.sourceTag, destination_tag: proof.destinationTag, invoice_id: proof.invoiceId, receipt_id: receipt.receiptId, proof_digest: receipt.proofDigest, duplicate_rejected: true, replay_rejected: true, bill_public_id: state.billPublicId }, null, 2)}\n`,
    { mode: 0o600 },
  );
  return verified;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  completeMainnetXrpAcceptance()
    .then(() => console.log("Verified and recorded the controlled Mainnet XRP payment."))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
