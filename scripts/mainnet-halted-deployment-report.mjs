import { z } from "zod";

import { validateMainnetHaltedDeploymentReport } from "./verify-mainnet-halted-deployment.mjs";

const FORBIDDEN_KEYS = new Set([
  "cloudflare_api_token",
  "cloudflare_account_id",
  "xaman_api_key",
  "xaman_api_secret",
  "api_key",
  "api_secret",
  "secret_value",
  "wrangler_source",
]);

function assertNoSensitiveKeys(value) {
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveKeys(item);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      throw new Error(`Halted deployment report contains forbidden field: ${key}.`);
    }
    assertNoSensitiveKeys(nested);
  }
}

function findOne(items, id, context) {
  const matches = items.filter((item) => item.id === id);
  if (matches.length !== 1) {
    throw new Error(`${context} must contain exactly one ${id}.`);
  }
  return matches[0];
}

function assertEvidencePatch(report) {
  const patch = z
    .object({
      id: z.literal("production-release-configuration"),
      status: z.literal("accepted"),
      recorded_at: z.string().datetime({ offset: false }),
      public_url: z.literal("https://xgp.badjoke-lab.com"),
      app_network: z.literal("mainnet"),
      public_network: z.literal("mainnet"),
      database_binding: z.literal("PAYMENTS_DB_MAINNET"),
      runtime_allowed: z.literal(true),
      gate_approved: z.literal(true),
      source_tag_approved: z.literal(true),
      release_mode: z.literal("internal"),
      operations_mode: z.literal("halted"),
    })
    .strict()
    .parse(report.evidence_patch);

  if (patch.recorded_at !== report.generated_at) {
    throw new Error("Halted deployment evidence timestamp does not match the report.");
  }
  return patch;
}

function updateReleasePlan(plan, evidence) {
  const accepted = new Set(
    evidence.records
      .filter((record) => record.status === "accepted")
      .map((record) => record.id),
  );
  const remainingOrder = [
    "production-provider-attestation",
    "production-release-configuration",
    "live-mainnet-xrp-acceptance",
    "live-mainnet-rlusd-acceptance",
  ];
  const stageOrder = [
    "foundations",
    "provider-attestation",
    "halted-deployment-review",
    "live-xrp-acceptance",
    "live-rlusd-acceptance",
    "final-release-audit",
  ];
  const stageByEvidence = {
    "production-provider-attestation": "provider-attestation",
    "production-release-configuration": "halted-deployment-review",
    "live-mainnet-xrp-acceptance": "live-xrp-acceptance",
    "live-mainnet-rlusd-acceptance": "live-rlusd-acceptance",
  };
  const remaining = remainingOrder.filter((id) => !accepted.has(id));
  const currentStage = remaining.length
    ? stageByEvidence[remaining[0]]
    : "final-release-audit";
  const currentIndex = stageOrder.indexOf(currentStage);

  plan.current_stage = currentStage;
  plan.remaining_evidence = remaining;
  plan.staged_target.committed = true;
  plan.stages.forEach((stage, index) => {
    stage.status =
      index < currentIndex
        ? "complete"
        : index === currentIndex && currentStage !== "final-release-audit"
          ? "blocked"
          : "pending";
  });
}

function updateWrangler(wrangler, patch) {
  const mainnet = wrangler?.env?.mainnet;
  if (!mainnet?.vars) {
    throw new Error("Wrangler Mainnet configuration is missing.");
  }
  const vars = mainnet.vars;
  const pending =
    vars.ALLOW_MAINNET_RUNTIME === "false" &&
    vars.MAINNET_GATE_APPROVED === "false" &&
    vars.MAINNET_SOURCE_TAG_APPROVED === "false" &&
    vars.MAINNET_RELEASE_MODE === "disabled" &&
    vars.MAINNET_OPERATIONS_MODE === "halted";
  const replay =
    vars.ALLOW_MAINNET_RUNTIME === "true" &&
    vars.MAINNET_GATE_APPROVED === "true" &&
    vars.MAINNET_SOURCE_TAG_APPROVED === "true" &&
    vars.MAINNET_RELEASE_MODE === "internal" &&
    vars.MAINNET_OPERATIONS_MODE === "halted";
  if (!pending && !replay) {
    throw new Error("Committed Mainnet configuration is not import-compatible.");
  }

  Object.assign(vars, {
    APP_NETWORK: patch.app_network,
    NEXT_PUBLIC_APP_NETWORK: patch.public_network,
    NEXT_PUBLIC_APP_URL: patch.public_url,
    ALLOW_MAINNET_RUNTIME: String(patch.runtime_allowed),
    MAINNET_GATE_APPROVED: String(patch.gate_approved),
    MAINNET_SOURCE_TAG_APPROVED: String(patch.source_tag_approved),
    MAINNET_RELEASE_MODE: patch.release_mode,
    MAINNET_OPERATIONS_MODE: patch.operations_mode,
    PAYMENTS_DATABASE_BINDING: patch.database_binding,
  });
  mainnet.routes = [
    { pattern: "xgp.badjoke-lab.com", custom_domain: true },
  ];
  mainnet.workers_dev = false;
}

function updateProductionTarget(target, patch) {
  const pending =
    target?.domain_connection === "pending" &&
    target?.deployment === "not_deployed" &&
    target?.release_mode === "disabled" &&
    target?.operations_mode === "halted";
  const replay =
    target?.domain_connection === "connected" &&
    target?.deployment === "deployed" &&
    target?.release_mode === "internal" &&
    target?.operations_mode === "halted";
  if (!pending && !replay) {
    throw new Error("Production target state is not import-compatible.");
  }

  target.domain_connection = "connected";
  target.deployment = "deployed";
  target.release_mode = patch.release_mode;
  target.operations_mode = patch.operations_mode;
}

export function applyMainnetHaltedDeploymentReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
  releasePlan: rawReleasePlan,
  wrangler: rawWrangler,
  productionTarget: rawProductionTarget,
}) {
  assertNoSensitiveKeys(rawReport);
  const report = validateMainnetHaltedDeploymentReport(
    rawReport,
    expectedGitSha,
  );
  const patch = assertEvidencePatch(report);
  const evidence = structuredClone(rawEvidence);
  const acceptance = structuredClone(rawAcceptance);
  const releasePlan = structuredClone(rawReleasePlan);
  const wrangler = structuredClone(rawWrangler);
  const productionTarget = structuredClone(rawProductionTarget);

  if (
    acceptance.release_decision !== "blocked" ||
    releasePlan.release_decision !== "blocked"
  ) {
    throw new Error("Halted deployment import requires a blocked Mainnet release.");
  }

  const record = findOne(
    evidence.records,
    "production-release-configuration",
    "Mainnet release evidence",
  );
  const control = findOne(
    acceptance.controls,
    "production-release-configuration",
    "Mainnet acceptance controls",
  );
  const finding = findOne(
    acceptance.blocking_findings,
    "production-runtime-not-approved",
    "Mainnet blocking findings",
  );

  const pending =
    record.status === "pending" &&
    control.status === "pending" &&
    finding.status === "open" &&
    releasePlan.current_stage === "halted-deployment-review";
  const replay =
    record.status === "accepted" &&
    control.status === "passed" &&
    finding.status === "resolved";
  if (!pending && !replay) {
    throw new Error(
      "Release configuration evidence, control, finding, and stage are inconsistent.",
    );
  }

  if (replay) {
    for (const [key, value] of Object.entries(patch)) {
      if (record[key] !== value) {
        throw new Error(
          "Existing release configuration evidence differs from the report.",
        );
      }
    }
  }

  Object.assign(record, patch);
  evidence.updated_at = report.generated_at.slice(0, 10);

  const summary = `GitHub Actions run ${report.workflow_run_url} verified the halted Mainnet Worker at ${report.public_url}, the reviewed runtime configuration, disabled payment creation and verification, and the guarded Xaman callback route from commit ${report.git_sha}`;
  control.status = "passed";
  control.evidence = `${summary}.`;
  finding.status = "resolved";
  finding.evidence = `${summary}; the deployment remained internal and operationally halted, and no live XRP or RLUSD payment was performed.`;

  updateWrangler(wrangler, patch);
  updateProductionTarget(productionTarget, patch);
  updateReleasePlan(releasePlan, evidence);

  return {
    evidence,
    acceptance,
    releasePlan,
    wrangler,
    productionTarget,
  };
}
