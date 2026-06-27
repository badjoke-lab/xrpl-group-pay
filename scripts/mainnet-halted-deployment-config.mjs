import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const EXPECTED = {
  workerName: "xrpl-group-pay-mainnet",
  publicOrigin: "https://xgp.badjoke-lab.com",
  customDomain: "xgp.badjoke-lab.com",
  callbackPath: "/api/xaman/callback",
  databaseBinding: "PAYMENTS_DB_MAINNET",
  sourceTag: 2171267705,
  confirmation: "DEPLOY XRPL GROUP PAY MAINNET HALTED",
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

export function assertHaltedDeploymentContract(contract) {
  if (
    contract?.schema_version !== 1 ||
    contract?.network !== "mainnet" ||
    contract?.stage !== "halted-deployment-review" ||
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
    contract?.release_mode !== "internal" ||
    contract?.operations_mode !== "halted"
  ) {
    throw new Error("The halted Mainnet deployment contract is invalid.");
  }

  const origin = new URL(contract.public_origin);
  if (
    origin.protocol !== "https:" ||
    origin.hostname !== contract.custom_domain ||
    origin.pathname !== "/"
  ) {
    throw new Error("The halted Mainnet public origin is invalid.");
  }
  return contract;
}

export function buildHaltedMainnetWrangler({
  contract,
  wrangler,
  releasePlan,
  evidence,
}) {
  assertHaltedDeploymentContract(contract);
  if (
    releasePlan?.current_stage !== "halted-deployment-review" ||
    releasePlan?.release_decision !== "blocked"
  ) {
    throw new Error("Halted deployment requires the halted-deployment-review stage.");
  }

  const provider = findOne(
    evidence.records,
    "production-provider-attestation",
    "Mainnet release evidence",
  );
  const release = findOne(
    evidence.records,
    "production-release-configuration",
    "Mainnet release evidence",
  );
  if (provider.status !== "accepted" || release.status !== "pending") {
    throw new Error("Halted deployment requires accepted provider evidence and pending release configuration.");
  }

  const source = structuredClone(wrangler);
  const mainnet = source?.env?.mainnet;
  const vars = mainnet?.vars;
  if (!mainnet || !vars) {
    throw new Error("Wrangler must define the Mainnet environment.");
  }
  if (
    mainnet.name !== contract.worker_name ||
    vars.NEXT_PUBLIC_APP_URL !== contract.public_origin ||
    vars.PAYMENTS_DATABASE_BINDING !== contract.database_binding ||
    Number(vars.XRPL_MAINNET_SOURCE_TAG) !== contract.source_tag
  ) {
    throw new Error("The committed Mainnet target does not match the halted deployment contract.");
  }
  if (
    vars.ALLOW_MAINNET_RUNTIME !== "false" ||
    vars.MAINNET_GATE_APPROVED !== "false" ||
    vars.MAINNET_SOURCE_TAG_APPROVED !== "false" ||
    vars.MAINNET_RELEASE_MODE !== "disabled" ||
    vars.MAINNET_OPERATIONS_MODE !== "halted"
  ) {
    throw new Error("The committed Mainnet configuration must remain closed before staging.");
  }

  const database = mainnet.d1_databases?.find(
    (candidate) => candidate.binding === contract.database_binding,
  );
  if (!database || database.database_id === database.preview_database_id) {
    throw new Error("The halted deployment requires isolated Mainnet D1 bindings.");
  }

  mainnet.vars = {
    ...vars,
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_URL: contract.public_origin,
    ALLOW_MAINNET_RUNTIME: "true",
    MAINNET_GATE_APPROVED: "true",
    XRPL_MAINNET_SOURCE_TAG: String(contract.source_tag),
    MAINNET_SOURCE_TAG_APPROVED: "true",
    MAINNET_RELEASE_MODE: contract.release_mode,
    MAINNET_OPERATIONS_MODE: contract.operations_mode,
    PAYMENTS_DATABASE_BINDING: contract.database_binding,
  };
  mainnet.routes = [
    {
      pattern: contract.custom_domain,
      custom_domain: true,
    },
  ];
  mainnet.workers_dev = false;

  return source;
}

function parseArguments(argv) {
  const index = argv.indexOf("--output");
  return {
    outputPath: index >= 0 ? argv[index + 1] : undefined,
  };
}

export async function writeHaltedMainnetWrangler({
  outputPath,
  root = process.cwd(),
} = {}) {
  if (!outputPath) throw new Error("--output is required.");
  const resolvedRoot = resolve(root);
  const resolvedOutput = resolve(outputPath);
  if (dirname(resolvedOutput) !== resolvedRoot) {
    throw new Error("The generated Wrangler file must be written at the repository root.");
  }

  const [contract, wranglerSource, releasePlan, evidence] = await Promise.all([
    readFile(resolve(root, "config/mainnet-halted-deployment.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "wrangler.jsonc"), "utf8"),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-evidence.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  const generated = buildHaltedMainnetWrangler({
    contract,
    wrangler: parseJsonc(wranglerSource),
    releasePlan,
    evidence,
  });
  await writeFile(resolvedOutput, `${JSON.stringify(generated, null, 2)}\n`, {
    mode: 0o600,
  });
  return {
    outputPath: resolvedOutput,
    workerName: contract.worker_name,
    publicOrigin: contract.public_origin,
    operationsMode: contract.operations_mode,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeHaltedMainnetWrangler(parseArguments(process.argv.slice(2)))
    .then((summary) => {
      console.log(
        `Prepared halted Mainnet Wrangler config for ${summary.workerName} at ${summary.outputPath}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
