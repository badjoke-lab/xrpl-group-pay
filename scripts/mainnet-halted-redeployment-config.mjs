import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPECTED = Object.freeze({
  workerName: "xrpl-group-pay-mainnet",
  publicOrigin: "https://xgp.badjoke-lab.com",
  customDomain: "xgp.badjoke-lab.com",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  databaseName: "xrpl-group-pay-mainnet",
  sourceTag: "2171267705",
});

const ALLOWED_STAGES = new Set([
  "live-xrp-acceptance",
  "live-rlusd-acceptance",
  "final-release-audit",
]);

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

export function buildHaltedMainnetRedeploymentWrangler({
  wrangler,
  releasePlan,
  evidence,
}) {
  if (
    releasePlan?.release_decision !== "blocked" ||
    !ALLOWED_STAGES.has(releasePlan?.current_stage)
  ) {
    throw new Error(
      "Halted Mainnet redeployment requires a later blocked acceptance stage.",
    );
  }

  const provider = findOne(
    evidence?.records ?? [],
    "production-provider-attestation",
    "Mainnet release evidence",
  );
  const release = findOne(
    evidence?.records ?? [],
    "production-release-configuration",
    "Mainnet release evidence",
  );
  if (provider.status !== "accepted" || release.status !== "accepted") {
    throw new Error(
      "Halted Mainnet redeployment requires accepted provider and release configuration evidence.",
    );
  }

  const source = structuredClone(wrangler);
  const mainnet = source?.env?.mainnet;
  const vars = mainnet?.vars;
  const database = mainnet?.d1_databases?.find(
    (entry) => entry.binding === EXPECTED.databaseBinding,
  );
  const customDomain = mainnet?.routes?.some(
    (route) =>
      route.pattern === EXPECTED.customDomain && route.custom_domain === true,
  );

  if (
    mainnet?.name !== EXPECTED.workerName ||
    vars?.APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_NETWORK !== "mainnet" ||
    vars?.NEXT_PUBLIC_APP_URL !== EXPECTED.publicOrigin ||
    vars?.ALLOW_MAINNET_RUNTIME !== "true" ||
    vars?.MAINNET_GATE_APPROVED !== "true" ||
    vars?.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
    vars?.XRPL_MAINNET_SOURCE_TAG !== EXPECTED.sourceTag ||
    vars?.MAINNET_RELEASE_MODE !== "internal" ||
    vars?.MAINNET_OPERATIONS_MODE !== "halted" ||
    vars?.PAYMENTS_DATABASE_BINDING !== EXPECTED.databaseBinding ||
    database?.database_name !== EXPECTED.databaseName ||
    typeof database?.database_id !== "string" ||
    database.database_id === database.preview_database_id ||
    !customDomain ||
    mainnet?.workers_dev !== false
  ) {
    throw new Error(
      "The committed Mainnet target is not the reviewed internal halted deployment.",
    );
  }

  delete source.d1_databases;
  return source;
}

export async function writeHaltedMainnetRedeploymentWrangler({
  outputPath,
  root = process.cwd(),
} = {}) {
  if (!outputPath) throw new Error("--output is required.");

  const resolvedRoot = resolve(root);
  const resolvedOutput = resolve(outputPath);
  if (dirname(resolvedOutput) !== resolvedRoot) {
    throw new Error("The generated Wrangler file must be written at the repository root.");
  }

  const [wranglerSource, releasePlan, evidence] = await Promise.all([
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  const generated = buildHaltedMainnetRedeploymentWrangler({
    wrangler: parseJsonc(wranglerSource),
    releasePlan,
    evidence,
  });
  await writeFile(resolvedOutput, `${JSON.stringify(generated, null, 2)}\n`, {
    mode: 0o600,
  });

  return {
    outputPath: resolvedOutput,
    workerName: EXPECTED.workerName,
    publicOrigin: EXPECTED.publicOrigin,
    operationsMode: "halted",
    releaseStage: releasePlan.current_stage,
  };
}
