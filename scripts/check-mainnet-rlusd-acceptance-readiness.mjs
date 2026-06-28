import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isValidClassicAddress } from "xrpl";

const EXPECTED = Object.freeze({
  confirmation: "CHECK XRPL GROUP PAY MAINNET RLUSD ACCEPTANCE",
  origin: "https://xgp.badjoke-lab.com",
  domain: "xgp.badjoke-lab.com",
  worker: "xrpl-group-pay-mainnet",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  sourceTag: 2171267705,
  assetId: "xrpl:mainnet:rlusd",
  currency: "524C555344000000000000000000000000000000",
  issuer: "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  precision: 6,
});

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

function parseCanonicalUnits(value, minimum, maximum) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    throw new Error("The controlled RLUSD amount must be canonical positive integer units.");
  }
  const units = BigInt(value);
  if (units < BigInt(minimum) || units > BigInt(maximum)) {
    throw new Error(
      `The controlled RLUSD amount must be between ${minimum} and ${maximum} units.`,
    );
  }
  return units;
}

function parseDestinationTag(value) {
  if (value === undefined || value === null || value === "") return null;
  const text = String(value);
  if (!/^\d+$/.test(text)) {
    throw new Error("Destination Tag must be a UInt32 value or omitted.");
  }
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 4_294_967_295) {
    throw new Error("Destination Tag must be a UInt32 value or omitted.");
  }
  return parsed;
}

function formatUnits(units, precision) {
  const negative = units < 0n;
  const absolute = negative ? -units : units;
  const divisor = 10n ** BigInt(precision);
  const whole = absolute / divisor;
  const fraction = String(absolute % divisor).padStart(precision, "0");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

export function assertMainnetRlusdAcceptanceReadiness({
  contract,
  releasePlan,
  evidence,
  acceptance,
  productionTarget,
  wrangler,
  assetRegistry,
  destinationAddress,
  expectedPayerAddress,
  amountUnits,
  destinationTag,
  confirmation,
}) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "live-rlusd-acceptance" ||
    contract?.confirmation !== EXPECTED.confirmation ||
    contract?.worker_name !== EXPECTED.worker ||
    contract?.public_origin !== EXPECTED.origin ||
    contract?.custom_domain !== EXPECTED.domain ||
    contract?.database_binding !== EXPECTED.databaseBinding ||
    contract?.source_tag !== EXPECTED.sourceTag ||
    contract?.asset_id !== EXPECTED.assetId ||
    contract?.currency !== EXPECTED.currency ||
    contract?.issuer !== EXPECTED.issuer ||
    contract?.precision !== EXPECTED.precision ||
    contract?.minimum_amount_units !== 1 ||
    contract?.maximum_amount_units !== 1_000_000 ||
    contract?.participant_slots !== 2 ||
    contract?.recipient_readiness_required !== true ||
    contract?.payer_balance_required !== true ||
    contract?.release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.required_restore_operations_mode !== "halted" ||
    contract?.signature_timeout_minutes !== 20 ||
    contract?.poll_interval_seconds !== 10
  ) {
    throw new Error("The Mainnet RLUSD acceptance contract is invalid.");
  }

  if (confirmation !== EXPECTED.confirmation) {
    throw new Error("The Mainnet RLUSD readiness confirmation is invalid.");
  }

  if (
    !isValidClassicAddress(destinationAddress) ||
    !isValidClassicAddress(expectedPayerAddress)
  ) {
    throw new Error("Both controlled accounts must be classic XRPL addresses.");
  }
  if (destinationAddress === expectedPayerAddress) {
    throw new Error("The controlled destination and payer accounts must be different.");
  }

  const primaryUnits = parseCanonicalUnits(
    amountUnits,
    contract.minimum_amount_units,
    contract.maximum_amount_units,
  );
  const normalizedDestinationTag = parseDestinationTag(destinationTag);
  const billTotalUnits = primaryUnits * BigInt(contract.participant_slots);

  if (
    releasePlan?.network !== "mainnet" ||
    releasePlan?.current_stage !== "live-rlusd-acceptance" ||
    releasePlan?.release_decision !== "blocked" ||
    JSON.stringify(releasePlan.remaining_evidence) !==
      JSON.stringify(["live-mainnet-rlusd-acceptance"])
  ) {
    throw new Error("The release plan is not at controlled Mainnet RLUSD acceptance.");
  }

  const release = findOne(
    evidence.records,
    "production-release-configuration",
    "Mainnet release evidence",
  );
  const xrp = findOne(
    evidence.records,
    "live-mainnet-xrp-acceptance",
    "Mainnet release evidence",
  );
  const rlusd = findOne(
    evidence.records,
    "live-mainnet-rlusd-acceptance",
    "Mainnet release evidence",
  );
  if (
    release.status !== "accepted" ||
    release.release_mode !== "internal" ||
    release.operations_mode !== "halted" ||
    xrp.status !== "accepted" ||
    xrp.validated !== true ||
    xrp.transaction_result !== "tesSUCCESS" ||
    rlusd.status !== "pending"
  ) {
    throw new Error("The Mainnet evidence state is not ready for RLUSD acceptance.");
  }

  const openFindings = acceptance.blocking_findings
    .filter((finding) => finding.status === "open")
    .map((finding) => finding.id)
    .sort();
  if (
    JSON.stringify(openFindings) !==
    JSON.stringify(["live-rlusd-acceptance-not-recorded"])
  ) {
    throw new Error("The open Mainnet findings do not match the RLUSD stage.");
  }

  if (
    assetRegistry?.schema_version !== 1 ||
    assetRegistry?.network !== "mainnet" ||
    assetRegistry?.state !== "identity_verified"
  ) {
    throw new Error("The Mainnet Asset registry is not identity-verified.");
  }
  const asset = findOne(assetRegistry.assets, EXPECTED.assetId, "Mainnet Asset registry");
  if (
    asset.payment_rail !== "xrpl" ||
    asset.asset_type !== "issued" ||
    asset.symbol !== "RLUSD" ||
    asset.currency !== EXPECTED.currency ||
    asset.issuer !== EXPECTED.issuer ||
    asset.precision !== EXPECTED.precision ||
    asset.verification_strategy !== "xrpl-issued-asset-v1" ||
    asset.receipt_contract !== "xrpl-issued-payment-v1"
  ) {
    throw new Error("The official Mainnet RLUSD identity is not canonical.");
  }

  if (
    productionTarget?.network !== "mainnet" ||
    productionTarget?.public_origin !== EXPECTED.origin ||
    productionTarget?.domain_connection !== "connected" ||
    productionTarget?.deployment !== "deployed" ||
    productionTarget?.release_mode !== "internal" ||
    productionTarget?.operations_mode !== "halted"
  ) {
    throw new Error("The production target is not the reviewed halted target.");
  }

  const mainnet = wrangler?.env?.mainnet;
  const vars = mainnet?.vars;
  const database = mainnet?.d1_databases?.find(
    (candidate) => candidate.binding === EXPECTED.databaseBinding,
  );
  const route = mainnet?.routes?.find(
    (candidate) =>
      candidate.pattern === EXPECTED.domain && candidate.custom_domain === true,
  );
  if (
    mainnet?.name !== EXPECTED.worker ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== EXPECTED.origin ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== String(EXPECTED.sourceTag) ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== EXPECTED.databaseBinding ||
    !database ||
    database.database_id === database.preview_database_id ||
    !route ||
    mainnet?.workers_dev !== false
  ) {
    throw new Error("The committed Mainnet runtime is not safely halted and isolated.");
  }

  return {
    network: "mainnet",
    stage: releasePlan.current_stage,
    destinationAddress,
    destinationTag: normalizedDestinationTag,
    expectedPayerAddress,
    primaryAmountUnits: primaryUnits.toString(),
    primaryAmountValue: formatUnits(primaryUnits, EXPECTED.precision),
    billTotalUnits: billTotalUnits.toString(),
    billTotalValue: formatUnits(billTotalUnits, EXPECTED.precision),
    assetId: EXPECTED.assetId,
    currency: EXPECTED.currency,
    issuer: EXPECTED.issuer,
    sourceTag: EXPECTED.sourceTag,
    recipientReadinessRequired: true,
    payerBalanceRequired: true,
    baselineOperationsMode: "halted",
    releaseDecision: "blocked",
  };
}

export async function checkMainnetRlusdAcceptanceReadiness({
  root = process.cwd(),
  environment = process.env,
} = {}) {
  const paths = {
    contract: resolve(root, "config/mainnet-rlusd-acceptance.json"),
    releasePlan: resolve(root, "config/mainnet-release-plan.json"),
    evidence: resolve(root, "config/mainnet-release-evidence.json"),
    acceptance: resolve(root, "config/mainnet-acceptance.json"),
    productionTarget: resolve(root, "config/production-target.json"),
    wrangler: resolve(root, "wrangler.jsonc"),
    assetRegistry: resolve(root, "config/xrpl-mainnet-assets.json"),
  };
  const [
    contract,
    releasePlan,
    evidence,
    acceptance,
    productionTarget,
    wranglerSource,
    assetRegistry,
  ] = await Promise.all([
    readFile(paths.contract, "utf8").then(JSON.parse),
    readFile(paths.releasePlan, "utf8").then(JSON.parse),
    readFile(paths.evidence, "utf8").then(JSON.parse),
    readFile(paths.acceptance, "utf8").then(JSON.parse),
    readFile(paths.productionTarget, "utf8").then(JSON.parse),
    readFile(paths.wrangler, "utf8"),
    readFile(paths.assetRegistry, "utf8").then(JSON.parse),
  ]);

  return assertMainnetRlusdAcceptanceReadiness({
    contract,
    releasePlan,
    evidence,
    acceptance,
    productionTarget,
    wrangler: parseJsonc(wranglerSource),
    assetRegistry,
    destinationAddress: environment.MAINNET_RLUSD_ACCEPTANCE_DESTINATION,
    expectedPayerAddress: environment.MAINNET_RLUSD_ACCEPTANCE_PAYER,
    amountUnits: environment.MAINNET_RLUSD_ACCEPTANCE_AMOUNT_UNITS,
    destinationTag: environment.MAINNET_RLUSD_ACCEPTANCE_DESTINATION_TAG,
    confirmation: environment.MAINNET_RLUSD_ACCEPTANCE_CONFIRMATION,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkMainnetRlusdAcceptanceReadiness()
    .then((summary) => {
      console.log(
        `Mainnet RLUSD readiness verified: stage=${summary.stage}, amount=${summary.primaryAmountValue}, bill_total=${summary.billTotalValue}, baseline=${summary.baselineOperationsMode}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
