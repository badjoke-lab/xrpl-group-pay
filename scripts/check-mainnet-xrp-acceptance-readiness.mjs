import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { isValidClassicAddress } from "xrpl";

const EXPECTED = {
  confirmation: "CHECK XRPL GROUP PAY MAINNET XRP ACCEPTANCE",
  origin: "https://xgp.badjoke-lab.com",
  domain: "xgp.badjoke-lab.com",
  worker: "xrpl-group-pay-mainnet",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  sourceTag: 2171267705,
  assetId: "xrpl:mainnet:xrp",
};

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

export function assertMainnetXrpAcceptanceReadiness({
  contract,
  releasePlan,
  evidence,
  acceptance,
  productionTarget,
  wrangler,
  destinationAddress,
  expectedPayerAddress,
  amountDrops,
  confirmation,
}) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "live-xrp-acceptance" ||
    contract?.confirmation !== EXPECTED.confirmation ||
    contract?.worker_name !== EXPECTED.worker ||
    contract?.public_origin !== EXPECTED.origin ||
    contract?.custom_domain !== EXPECTED.domain ||
    contract?.database_binding !== EXPECTED.databaseBinding ||
    contract?.source_tag !== EXPECTED.sourceTag ||
    contract?.asset_id !== EXPECTED.assetId ||
    contract?.minimum_amount_drops !== 1 ||
    contract?.maximum_amount_drops !== 1000 ||
    contract?.participant_slots !== 2 ||
    contract?.release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.required_restore_operations_mode !== "halted" ||
    contract?.signature_timeout_minutes !== 20 ||
    contract?.poll_interval_seconds !== 10
  ) {
    throw new Error("The Mainnet XRP acceptance contract is invalid.");
  }
  if (confirmation !== EXPECTED.confirmation) {
    throw new Error("The Mainnet XRP readiness confirmation is invalid.");
  }

  const parsedDrops = Number(amountDrops);
  if (
    !Number.isInteger(parsedDrops) ||
    parsedDrops < contract.minimum_amount_drops ||
    parsedDrops > contract.maximum_amount_drops
  ) {
    throw new Error("The controlled XRP amount must be between 1 and 1000 drops.");
  }
  if (
    !isValidClassicAddress(destinationAddress) ||
    !isValidClassicAddress(expectedPayerAddress)
  ) {
    throw new Error("Both controlled accounts must be classic XRPL addresses.");
  }

  if (
    releasePlan?.network !== "mainnet" ||
    releasePlan?.current_stage !== "live-xrp-acceptance" ||
    releasePlan?.release_decision !== "blocked"
  ) {
    throw new Error("The release plan is not at controlled Mainnet XRP acceptance.");
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
    xrp.status !== "pending" ||
    rlusd.status !== "pending"
  ) {
    throw new Error("The Mainnet evidence state is not ready for XRP acceptance.");
  }
  const openFindings = acceptance.blocking_findings
    .filter((finding) => finding.status === "open")
    .map((finding) => finding.id)
    .sort();
  const expectedFindings = [
    "live-rlusd-acceptance-not-recorded",
    "live-xrp-acceptance-not-recorded",
  ].sort();
  if (JSON.stringify(openFindings) !== JSON.stringify(expectedFindings)) {
    throw new Error("The open Mainnet findings do not match the acceptance stage.");
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
    expectedPayerAddress,
    amountDrops: String(parsedDrops),
    assetId: EXPECTED.assetId,
    sourceTag: EXPECTED.sourceTag,
    baselineOperationsMode: "halted",
    releaseDecision: "blocked",
  };
}

export async function checkMainnetXrpAcceptanceReadiness({
  root = process.cwd(),
  environment = process.env,
} = {}) {
  const paths = {
    contract: resolve(root, "config/mainnet-xrp-acceptance.json"),
    releasePlan: resolve(root, "config/mainnet-release-plan.json"),
    evidence: resolve(root, "config/mainnet-release-evidence.json"),
    acceptance: resolve(root, "config/mainnet-acceptance.json"),
    productionTarget: resolve(root, "config/production-target.json"),
    wrangler: resolve(root, "wrangler.jsonc"),
  };
  const [contract, releasePlan, evidence, acceptance, productionTarget, wranglerSource] =
    await Promise.all([
      readFile(paths.contract, "utf8").then(JSON.parse),
      readFile(paths.releasePlan, "utf8").then(JSON.parse),
      readFile(paths.evidence, "utf8").then(JSON.parse),
      readFile(paths.acceptance, "utf8").then(JSON.parse),
      readFile(paths.productionTarget, "utf8").then(JSON.parse),
      readFile(paths.wrangler, "utf8"),
    ]);
  return assertMainnetXrpAcceptanceReadiness({
    contract,
    releasePlan,
    evidence,
    acceptance,
    productionTarget,
    wrangler: parseJsonc(wranglerSource),
    destinationAddress: environment.MAINNET_XRP_ACCEPTANCE_DESTINATION,
    expectedPayerAddress: environment.MAINNET_XRP_ACCEPTANCE_PAYER,
    amountDrops: environment.MAINNET_XRP_ACCEPTANCE_AMOUNT_DROPS,
    confirmation: environment.MAINNET_XRP_ACCEPTANCE_CONFIRMATION,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkMainnetXrpAcceptanceReadiness()
    .then((summary) => {
      console.log(
        `Mainnet XRP readiness verified: stage=${summary.stage}, amount_drops=${summary.amountDrops}, baseline=${summary.baselineOperationsMode}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
