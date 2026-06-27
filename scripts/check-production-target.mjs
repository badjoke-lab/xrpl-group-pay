import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED_ORIGIN = "https://xgp.badjoke-lab.com";
const EXPECTED_DOMAIN = "xgp.badjoke-lab.com";
const EXPECTED_CALLBACK_PATH = "/api/xaman/callback";
const EXPECTED_CALLBACK_URL = `${EXPECTED_ORIGIN}${EXPECTED_CALLBACK_PATH}`;

function parseJsonc(source) {
  return JSON.parse(
    source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1"),
  );
}

export function assertProductionTarget({ target, wrangler, routeSource }) {
  if (
    target?.schema_version !== 1 ||
    target?.network !== "mainnet" ||
    target?.public_origin !== EXPECTED_ORIGIN ||
    target?.xaman_callback_path !== EXPECTED_CALLBACK_PATH ||
    target?.xaman_callback_url !== EXPECTED_CALLBACK_URL
  ) {
    throw new Error("Production origin or Xaman callback target is invalid.");
  }

  const prepared =
    target.domain_connection === "pending" &&
    target.deployment === "not_deployed" &&
    target.release_mode === "disabled" &&
    target.operations_mode === "halted";
  const deployed =
    target.domain_connection === "connected" &&
    target.deployment === "deployed" &&
    target.release_mode === "internal" &&
    target.operations_mode === "halted";
  if (!prepared && !deployed) {
    throw new Error("Production target state is invalid.");
  }

  const mainnet = wrangler?.env?.mainnet;
  const mainnetVars = mainnet?.vars;
  if (!mainnetVars) {
    throw new Error("Wrangler Mainnet variables are missing.");
  }
  if (mainnetVars.NEXT_PUBLIC_APP_URL !== EXPECTED_ORIGIN) {
    throw new Error("Wrangler Mainnet application origin is inconsistent.");
  }

  if (prepared) {
    if (
      mainnetVars.MAINNET_RELEASE_MODE !== "disabled" ||
      mainnetVars.MAINNET_OPERATIONS_MODE !== "halted" ||
      mainnetVars.ALLOW_MAINNET_RUNTIME !== "false" ||
      mainnetVars.MAINNET_GATE_APPROVED !== "false" ||
      mainnetVars.MAINNET_SOURCE_TAG_APPROVED !== "false"
    ) {
      throw new Error("Prepared production target must keep Mainnet closed.");
    }
  } else {
    const customDomain = mainnet.routes?.some(
      (route) =>
        route.pattern === EXPECTED_DOMAIN && route.custom_domain === true,
    );
    if (
      mainnetVars.MAINNET_RELEASE_MODE !== "internal" ||
      mainnetVars.MAINNET_OPERATIONS_MODE !== "halted" ||
      mainnetVars.ALLOW_MAINNET_RUNTIME !== "true" ||
      mainnetVars.MAINNET_GATE_APPROVED !== "true" ||
      mainnetVars.MAINNET_SOURCE_TAG_APPROVED !== "true" ||
      !customDomain ||
      mainnet.workers_dev !== false
    ) {
      throw new Error(
        "Deployed production target must match the reviewed halted configuration.",
      );
    }
  }

  if (
    !routeSource.includes("handleXamanCallbackRequest") ||
    !routeSource.includes("verifyXamanWebhookSignature") ||
    !routeSource.includes("export function POST")
  ) {
    throw new Error("The guarded Xaman callback route is missing.");
  }

  return {
    origin: EXPECTED_ORIGIN,
    callbackUrl: EXPECTED_CALLBACK_URL,
    domainConnection: target.domain_connection,
    deployment: target.deployment,
    releaseMode: target.release_mode,
    operationsMode: target.operations_mode,
  };
}

export async function runProductionTargetCheck(options = {}) {
  const root = process.cwd();
  const targetPath =
    options.targetPath ?? resolve(root, "config/production-target.json");
  const wranglerPath = options.wranglerPath ?? resolve(root, "wrangler.jsonc");
  const routePath =
    options.routePath ?? resolve(root, "src/app/api/xaman/callback/route.ts");

  const [target, wranglerSource, routeSource] = await Promise.all([
    readFile(targetPath, "utf8").then((value) => JSON.parse(value)),
    readFile(wranglerPath, "utf8"),
    readFile(routePath, "utf8"),
  ]);

  return assertProductionTarget({
    target,
    wrangler: parseJsonc(wranglerSource),
    routeSource,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runProductionTargetCheck()
    .then((summary) => {
      console.log(
        `Production target verified: origin=${summary.origin}, callback=${summary.callbackUrl}, deployment=${summary.deployment}, release=${summary.releaseMode}, operations=${summary.operationsMode}.`,
      );
    })
    .catch((error) => {
      console.error(
        `Production target check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
