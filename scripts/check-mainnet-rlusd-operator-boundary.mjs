import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const EXPECTED_GATES = [
  "review-halted-baseline",
  "review-recipient-and-payer-readiness",
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
  "automatic_recipient_readiness_approval",
  "automatic_bill_creation",
  "automatic_xaman_request_creation",
  "automatic_signature",
  "automatic_transaction_submission",
  "automatic_evidence_import",
];

function isReviewedPostRlusdStage(releasePlan) {
  if (releasePlan?.current_stage !== "final-release-audit") return false;
  if (JSON.stringify(releasePlan.remaining_evidence) !== JSON.stringify([])) {
    return false;
  }
  const stages = new Map(
    (releasePlan.stages ?? []).map((stage) => [stage.id, stage.status]),
  );
  return (
    stages.get("live-xrp-acceptance") === "complete" &&
    stages.get("live-rlusd-acceptance") === "complete" &&
    stages.get("final-release-audit") === "pending"
  );
}

export function assertMainnetRlusdOperatorBoundary({
  boundary,
  contract,
  releasePlan,
  productionTarget,
}) {
  if (
    boundary?.schema_version !== 1 ||
    boundary?.network !== "mainnet" ||
    boundary?.stage !== "live-rlusd-acceptance" ||
    boundary?.execution_model !== "human-operated" ||
    boundary?.maximum_internal_window_minutes !== 30 ||
    boundary?.signature_timeout_minutes !== 20 ||
    boundary?.final_release_decision !== "blocked"
  ) {
    throw new Error("The Mainnet RLUSD operator boundary is invalid.");
  }

  if (
    !AUTOMATION_KEYS.every(
      (key) => boundary.automation_boundary?.[key] === false,
    )
  ) {
    throw new Error("Live Mainnet RLUSD actions must remain human-operated.");
  }

  if (
    JSON.stringify(boundary.required_manual_gates) !==
      JSON.stringify(EXPECTED_GATES) ||
    JSON.stringify(boundary.required_mode_sequence) !==
      JSON.stringify(EXPECTED_MODES)
  ) {
    throw new Error("The manual RLUSD acceptance sequence is incomplete.");
  }

  if (
    boundary.private_delivery?.public_actions_log !== false ||
    boundary.private_delivery?.public_artifact !== false ||
    boundary.private_delivery?.pull_request !== false ||
    boundary.private_delivery?.operator_controlled_channel_only !== true
  ) {
    throw new Error("Private RLUSD wallet handoff material is not isolated.");
  }

  if (
    contract?.network !== "mainnet" ||
    contract?.stage !== boundary.stage ||
    contract?.asset_id !== "xrpl:mainnet:rlusd" ||
    contract?.currency !== "524C555344000000000000000000000000000000" ||
    contract?.issuer !== "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De" ||
    contract?.precision !== 6 ||
    contract?.participant_slots !== 2 ||
    contract?.recipient_readiness_required !== true ||
    contract?.payer_balance_required !== true ||
    contract?.release_mode !== "internal" ||
    contract?.required_baseline_operations_mode !== "halted" ||
    contract?.required_restore_operations_mode !== "halted" ||
    contract?.signature_timeout_minutes !== boundary.signature_timeout_minutes
  ) {
    throw new Error("The RLUSD acceptance contract does not match the operator boundary.");
  }

  const atRlusdStage = releasePlan?.current_stage === boundary.stage;
  const afterRlusdStage = isReviewedPostRlusdStage(releasePlan);
  if (
    releasePlan?.network !== "mainnet" ||
    (!atRlusdStage && !afterRlusdStage) ||
    releasePlan?.release_decision !== boundary.final_release_decision
  ) {
    throw new Error("The release plan does not match the RLUSD operator boundary.");
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
    stage: releasePlan.current_stage,
    boundaryStage: boundary.stage,
    executionModel: boundary.execution_model,
    automaticLiveActions: false,
    recipientReadinessHumanApproved: true,
    baselineMode: "halted",
    restoreMode: "halted",
    finalReleaseDecision: "blocked",
  };
}

export async function checkMainnetRlusdOperatorBoundary({
  root = process.cwd(),
} = {}) {
  const [boundary, contract, releasePlan, productionTarget] = await Promise.all([
    readFile(
      resolve(root, "config/mainnet-rlusd-operator-boundary.json"),
      "utf8",
    ).then(JSON.parse),
    readFile(resolve(root, "config/mainnet-rlusd-acceptance.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/mainnet-release-plan.json"), "utf8").then(
      JSON.parse,
    ),
    readFile(resolve(root, "config/production-target.json"), "utf8").then(
      JSON.parse,
    ),
  ]);

  return assertMainnetRlusdOperatorBoundary({
    boundary,
    contract,
    releasePlan,
    productionTarget,
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkMainnetRlusdOperatorBoundary()
    .then((summary) => {
      console.log(
        `Mainnet RLUSD operator boundary verified: stage=${summary.stage}, execution=${summary.executionModel}, baseline=${summary.baselineMode}.`,
      );
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
