import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPECTED = {
  workerName: "xrpl-group-pay-mainnet",
  publicOrigin: "https://xgp.badjoke-lab.com",
  customDomain: "xgp.badjoke-lab.com",
  callbackPath: "/api/xaman/callback",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  sourceTag: 2171267705,
  confirmation: "DEPLOY XRPL GROUP PAY MAINNET PUBLIC",
};

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

function findOne(items, id, context) {
  const matches = (items ?? []).filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

export function assertMainnetPublicDeploymentContract(contract) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "public-operating-deployment" ||
    contract?.confirmation !== EXPECTED.confirmation ||
    contract?.worker_name !== EXPECTED.workerName ||
    contract?.public_origin !== EXPECTED.publicOrigin ||
    contract?.custom_domain !== EXPECTED.customDomain ||
    contract?.callback_path !== EXPECTED.callbackPath ||
    contract?.database_binding !== EXPECTED.databaseBinding ||
    contract?.source_tag !== EXPECTED.sourceTag ||
    contract?.runtime_allowed !== true ||
    contract?.gate_approved !== true ||
    contract?.source_tag_approved !== true ||
    contract?.release_mode !== "public" ||
    contract?.operations_mode !== "enabled" ||
    contract?.required_baseline_release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.require_final_audit_approved !== true ||
    contract?.automatic_rollback_mode !== "halted"
  ) {
    throw new Error("The Mainnet public deployment contract is invalid.");
  }
  return contract;
}

export function buildPublicMainnetWrangler({
  contract,
  wrangler,
  releasePlan,
  gate,
  acceptance,
  evidence,
  productionTarget,
}) {
  assertMainnetPublicDeploymentContract(contract);

  if (
    releasePlan?.state !== "ready" ||
    releasePlan?.review_status !== "approved" ||
    releasePlan?.release_decision !== "approved" ||
    releasePlan?.current_stage !== "final-release-audit" ||
    releasePlan?.stages?.some((stage) => stage.status !== "complete")
  ) {
    throw new Error("The final Mainnet release audit is not approved.");
  }
  if (
    gate?.state !== "ready" ||
    gate?.checks?.some((check) => check.status !== "passed")
  ) {
    throw new Error("The Mainnet gate is not ready.");
  }
  if (
    acceptance?.release_decision !== "approved" ||
    acceptance?.controls?.some((control) => control.status !== "passed") ||
    acceptance?.blocking_findings?.some((finding) => finding.status === "open")
  ) {
    throw new Error("The Mainnet acceptance audit is incomplete.");
  }
  if (
    !Array.isArray(evidence?.records) ||
    evidence.records.length !== 7 ||
    evidence.records.some((record) => record.status !== "accepted")
  ) {
    throw new Error("Every Mainnet release evidence record must be accepted.");
  }
  if (
    productionTarget?.network !== "mainnet" ||
    productionTarget?.public_origin !== contract.public_origin ||
    productionTarget?.deployment !== "deployed" ||
    productionTarget?.release_mode !== contract.required_baseline_release_mode ||
    productionTarget?.operations_mode !==
      contract.required_baseline_operations_mode
  ) {
    throw new Error("The deployed Mainnet baseline must remain internal and halted.");
  }

  const source = structuredClone(wrangler);
  const mainnet = source?.env?.mainnet;
  const vars = mainnet?.vars;
  const database = mainnet?.d1_databases?.find(
    (candidate) => candidate.binding === contract.database_binding,
  );
  const route = mainnet?.routes?.find(
    (candidate) =>
      candidate.pattern === contract.custom_domain &&
      candidate.custom_domain === true,
  );
  const releaseEvidence = findOne(
    evidence.records,
    "production-release-configuration",
    "Mainnet release evidence",
  );

  if (
    mainnet?.name !== contract.worker_name ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== contract.public_origin ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== String(contract.source_tag) ||
    vars?.MAINNET_RELEASE_MODE !== contract.required_baseline_release_mode ||
    vars?.MAINNET_OPERATIONS_MODE !==
      contract.required_baseline_operations_mode ||
    vars?.PAYMENTS_DATABASE_BINDING !== contract.database_binding ||
    !database ||
    database.database_id === database.preview_database_id ||
    !route ||
    mainnet?.workers_dev !== false ||
    releaseEvidence.status !== "accepted"
  ) {
    throw new Error("The reviewed halted Mainnet baseline is invalid.");
  }

  delete source.d1_databases;
  mainnet.vars = {
    ...vars,
    MAINNET_RELEASE_MODE: contract.release_mode,
    MAINNET_OPERATIONS_MODE: contract.operations_mode,
  };
  delete mainnet.vars.MAINNET_ACCEPTANCE_EXPIRES_AT;

  return source;
}

export async function writePublicMainnetWrangler({
  outputPath,
  root = process.cwd(),
} = {}) {
  if (!outputPath) throw new Error("--output is required.");
  const resolvedRoot = resolve(root);
  const resolvedOutput = resolve(outputPath);
  if (dirname(resolvedOutput) !== resolvedRoot) {
    throw new Error("The generated Wrangler file must be written at the repository root.");
  }

  const [
    contract,
    wranglerSource,
    releasePlan,
    gate,
    acceptance,
    evidence,
    productionTarget,
  ] = await Promise.all([
    readFile(resolve(root, "config/mainnet-public-deployment.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-gate.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/mainnet-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  const generated = buildPublicMainnetWrangler({
    contract,
    wrangler: parseJsonc(wranglerSource),
    releasePlan,
    gate,
    acceptance,
    evidence,
    productionTarget,
  });
  await writeFile(resolvedOutput, `${JSON.stringify(generated, null, 2)}\n`, {
    mode: 0o600,
  });
  return {
    outputPath: resolvedOutput,
    workerName: contract.worker_name,
    publicOrigin: contract.public_origin,
    releaseMode: contract.release_mode,
    operationsMode: contract.operations_mode,
  };
}
