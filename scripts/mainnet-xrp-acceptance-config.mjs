import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

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

export function assertMainnetXrpAcceptanceContract(contract) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "live-xrp-acceptance" ||
    contract?.confirmation !== "RUN XRPL GROUP PAY MAINNET XRP ACCEPTANCE" ||
    contract?.worker_name !== "xrpl-group-pay-mainnet" ||
    contract?.public_origin !== "https://xgp.badjoke-lab.com" ||
    contract?.custom_domain !== "xgp.badjoke-lab.com" ||
    contract?.database_binding !== "PAYMENTS_DB_MAINNET" ||
    contract?.source_tag !== 2171267705 ||
    contract?.asset_id !== "xrpl:mainnet:xrp" ||
    !Number.isInteger(contract?.minimum_amount_drops) ||
    !Number.isInteger(contract?.maximum_amount_drops) ||
    contract.minimum_amount_drops < 1 ||
    contract.maximum_amount_drops > 1000 ||
    contract.minimum_amount_drops > contract.maximum_amount_drops ||
    contract?.participant_slots !== 2 ||
    contract?.release_mode !== "internal" ||
    contract?.active_operations_mode !== "enabled" ||
    contract?.restore_operations_mode !== "halted" ||
    contract?.signature_timeout_minutes !== 20 ||
    contract?.poll_interval_seconds !== 10
  ) {
    throw new Error("The controlled Mainnet XRP acceptance contract is invalid.");
  }
  return contract;
}

export function buildMainnetXrpAcceptanceWranglers({
  contract,
  wrangler,
  releasePlan,
  evidence,
  tokenDigest,
}) {
  assertMainnetXrpAcceptanceContract(contract);
  if (!/^[a-f0-9]{64}$/.test(tokenDigest)) {
    throw new Error("The Mainnet acceptance token digest is invalid.");
  }
  if (
    releasePlan?.current_stage !== "live-xrp-acceptance" ||
    releasePlan?.release_decision !== "blocked"
  ) {
    throw new Error("Mainnet XRP acceptance requires the live-xrp-acceptance stage.");
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
  if (release.status !== "accepted" || xrp.status !== "pending" || rlusd.status !== "pending") {
    throw new Error("Mainnet acceptance evidence is not in the required state.");
  }

  const source = structuredClone(wrangler);
  const mainnet = source?.env?.mainnet;
  const vars = mainnet?.vars;
  if (!mainnet || !vars) throw new Error("Wrangler must define Mainnet.");
  if (
    mainnet.name !== contract.worker_name ||
    vars.APP_NETWORK !== "mainnet" ||
    vars.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars.NEXT_PUBLIC_APP_URL !== contract.public_origin ||
    vars.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars.MAINNET_GATE_APPROVED !== "true" ||
    vars.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars.XRPL_MAINNET_SOURCE_TAG !== String(contract.source_tag) ||
    vars.MAINNET_RELEASE_MODE !== "internal" ||
    vars.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars.PAYMENTS_DATABASE_BINDING !== contract.database_binding
  ) {
    throw new Error("The committed Mainnet target is not the reviewed halted target.");
  }
  const database = mainnet.d1_databases?.find(
    (candidate) => candidate.binding === contract.database_binding,
  );
  if (!database || database.database_id === database.preview_database_id) {
    throw new Error("Mainnet XRP acceptance requires isolated production D1 bindings.");
  }

  delete source.d1_databases;
  mainnet.routes = [{ pattern: contract.custom_domain, custom_domain: true }];
  mainnet.workers_dev = false;

  const active = structuredClone(source);
  active.env.mainnet.vars = {
    ...active.env.mainnet.vars,
    MAINNET_OPERATIONS_MODE: "enabled",
    MAINNET_ACCEPTANCE_TOKEN_SHA256: tokenDigest,
  };

  const restore = structuredClone(source);
  restore.env.mainnet.vars = {
    ...restore.env.mainnet.vars,
    MAINNET_OPERATIONS_MODE: "halted",
  };
  delete restore.env.mainnet.vars.MAINNET_ACCEPTANCE_TOKEN_SHA256;

  return { active, restore };
}

export async function writeMainnetXrpAcceptanceWranglers({
  activePath,
  restorePath,
  tokenDigest,
  root = process.cwd(),
} = {}) {
  if (!activePath || !restorePath || !tokenDigest) {
    throw new Error("activePath, restorePath, and tokenDigest are required.");
  }
  const resolvedRoot = resolve(root);
  const activeOutput = resolve(activePath);
  const restoreOutput = resolve(restorePath);
  if (dirname(activeOutput) !== resolvedRoot || dirname(restoreOutput) !== resolvedRoot) {
    throw new Error("Generated Wrangler files must be written at the repository root.");
  }

  const [contract, wranglerSource, releasePlan, evidence] = await Promise.all([
    readFile(resolve(root, "config/mainnet-xrp-acceptance.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(JSON.parse),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(JSON.parse),
  ]);
  const generated = buildMainnetXrpAcceptanceWranglers({
    contract,
    wrangler: parseJsonc(wranglerSource),
    releasePlan,
    evidence,
    tokenDigest,
  });
  await Promise.all([
    writeFile(activeOutput, `${JSON.stringify(generated.active, null, 2)}\n`, { mode: 0o600 }),
    writeFile(restoreOutput, `${JSON.stringify(generated.restore, null, 2)}\n`, { mode: 0o600 }),
  ]);
  return { contract, activePath: activeOutput, restorePath: restoreOutput };
}
