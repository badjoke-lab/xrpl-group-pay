import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED_GATES = [
  "review-halted-baseline",
  "approve-temporary-runtime-diff",
  "create-frozen-bill",
  "create-private-xaman-handoff",
  "inspect-and-sign-in-xaman",
  "review-validated-ledger-evidence",
  "review-negative-controls",
  "restore-and-verify-halted-mode",
  "review-public-safe-report",
];

const EXPECTED_MODES = ["halted", "enabled", "verify-only", "halted"];
const AUTOMATION_KEYS = [
  "automatic_mainnet_enablement",
  "automatic_bill_creation",
  "automatic_xaman_request_creation",
  "automatic_signature",
  "automatic_transaction_submission",
  "automatic_evidence_import",
];

export function assertMainnetXrpOperatorBoundary({
  boundary,
  contract,
  releasePlan,
  productionTarget,
}) {
  if (
    boundary?.schema_version !== 1 ||
    boundary?.network !== "mainnet" ||
    boundary?.stage !== "live-xrp-acceptance" ||
    boundary?.execution_model !== "human-operated" ||
    boundary?.maximum_internal_window_minutes !== 30 ||
    boundary?.signature_timeout_minutes !== 20 ||
    boundary?.final_release_decision !== "blocked"
  ) {
    throw new Error("The Mainnet XRP operator boundary is invalid.");
  }

  if (
    !AUTOMATION_KEYS.every(
      (key) => boundary.automation_boundary?.[key] === false,
    )
  ) {
    throw new Error("Live Mainnet XRP actions must remain human-operated.");
  }

  if (
    JSON.stringify(boundary.required_manual_gates) !==
      JSON.stringify(EXPECTED_GATES) ||
    JSON.stringify(boundary.required_mode_sequence) !==
      JSON.stringify(EXPECTED_MODES)
  ) {
    throw new Error("The manual acceptance sequence is incomplete.");
  }

  if (
    boundary.private_delivery?.public_actions_log !== false ||
    boundary.private_delivery?.public_artifact !== false ||
    boundary.private_delivery?.pull_request !== false ||
    boundary.private_delivery?.operator_controlled_channel_only !== true
  ) {
    throw new Error("Private wallet handoff material is not isolated.");
  }

  if (
    contract?.network !== "mainnet" ||
    contract?.stage !== boundary.stage ||
    contract?.release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.required_restore_operations_mode !== "halted" ||
    contract?.signature_timeout_minutes !== boundary.signature_timeout_minutes
  ) {
    throw new Error("The XRP acceptance contract does not match the operator boundary.");
  }

  if (
    releasePlan?.network !== "mainnet" ||
    releasePlan?.current_stage !== boundary.stage ||
    releasePlan?.release_decision !== boundary.final_release_decision
  ) {
    throw new Error("The release plan does not match the operator boundary.");
  }

  if (
    productionTarget?.network !== "mainnet" ||
    productionTarget?.release_mode !== "internal" ||
    productionTarget?.operations_mode !== "halted"
  ) {
    throw new Error("The production target must remain internal and halted.");
  }

  return {
    network: "mainnet",
    stage: boundary.stage,
    executionModel: boundary.execution_model,
    automaticLiveActions: false,
    baselineMode: "halted",
    restoreMode: "halted",
    finalReleaseDecision: "blocked",
  };
}

export async function checkMainnetXrpOperatorBoundary({
  root = process.cwd(),
} = {}) {
  const [boundary, contract, releasePlan, productionTarget] = await Promise.all([
    readFile(
      resolve(root, "config/mainnet-xrp-operator-boundary.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(resolve(root, "config/mainnet-xrp-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  return assertMainnetXrpOperatorBoundary({
    boundary,
    contract,
    releasePlan,
    productionTarget,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkMainnetXrpOperatorBoundary()
    .then((summary) => {
      console.log(
        `Mainnet XRP operator boundary verified: stage=${summary.stage}, execution=${summary.executionModel}, baseline=${summary.baselineMode}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
