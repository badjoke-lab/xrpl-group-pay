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
  plan.stages.forEach((stage, index) => {
    stage.status =
      index < currentIndex
        ? "complete"
        : index === currentIndex && currentStage !== "final-release-audit"
          ? "blocked"
          : "pending";
  });
}

export function applyMainnetHaltedDeploymentReport({
  report: rawReport,
  expectedGitSha,
  evidence: rawEvidence,
  acceptance: rawAcceptance,
  releasePlan: rawReleasePlan,
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

  updateReleasePlan(releasePlan, evidence);
  return { evidence, acceptance, releasePlan };
}
