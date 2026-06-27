import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED_ORIGIN = "https://xgp.badjoke-lab.com";
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

  if (
    target?.domain_connection !== "pending" ||
    target?.deployment !== "not_deployed" ||
    target?.release_mode !== "disabled" ||
    target?.operations_mode !== "halted"
  ) {
    throw new Error("Prepared production target must remain undeployed and halted.");
  }

  const mainnetVars = wrangler?.env?.mainnet?.vars;
  if (!mainnetVars) {
    throw new Error("Wrangler Mainnet variables are missing.");
  }
  if (mainnetVars.NEXT_PUBLIC_APP_URL !== EXPECTED_ORIGIN) {
    throw new Error("Wrangler Mainnet application origin is inconsistent.");
  }
  if (
    mainnetVars.MAINNET_RELEASE_MODE !== "disabled" ||
    mainnetVars.MAINNET_OPERATIONS_MODE !== "halted" ||
    mainnetVars.ALLOW_MAINNET_RUNTIME !== "false" ||
    mainnetVars.MAINNET_GATE_APPROVED !== "false"
  ) {
    throw new Error("Production target preparation must keep Mainnet closed.");
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
        `Production target verified: origin=${summary.origin}, callback=${summary.callbackUrl}, deployment=${summary.deployment}.`,
      );
    })
    .catch((error) => {
      console.error(
        `Production target check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    });
}
