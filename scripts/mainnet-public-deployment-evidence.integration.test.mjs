import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { validateMainnetPublicDeploymentReport } from "./verify-mainnet-public-deployment.mjs";

const EXPECTED_SHA = "2ff0c192276ebcbbdde1e98a02cb7bbe7ba6253c";
const EXPECTED_RUN_URL =
  "https://github.com/badjoke-lab/xrpl-group-pay/actions/runs/28460115824";

async function loadEvidence() {
  return JSON.parse(
    await readFile(
      resolve("evidence/mainnet-public-deployment-2026-06-30.json"),
      "utf8",
    ),
  );
}

describe("committed Mainnet public deployment evidence", () => {
  it("matches the verified public deployment report contract", async () => {
    const evidence = await loadEvidence();
    const deployment = evidence.deployment;

    const report = validateMainnetPublicDeploymentReport(
      {
        schema_version: evidence.schema_version,
        network: evidence.network,
        generated_at: evidence.recorded_at,
        git_sha: evidence.git_sha,
        state: "verified",
        workflow_run_url: evidence.workflow.run_url,
        public_url: deployment.public_url,
        worker_name: deployment.worker_name,
        configuration_digest: evidence.artifact.configuration_digest,
        release_mode: deployment.release_mode,
        operations_mode: deployment.operations_mode,
        checks: {
          deployment_reachable: deployment.deployment_reachable,
          custom_domain_https_checked:
            deployment.custom_domain_https_checked,
          runtime_configuration_checked:
            deployment.runtime_configuration_checked,
          release_mode_public: deployment.release_mode === "public",
          operations_enabled: deployment.operations_mode === "enabled",
          payment_creation_enabled: deployment.payment_creation_enabled,
          payment_verification_enabled: deployment.payment_verification_enabled,
          callback_route_checked: deployment.callback_route_checked,
          callback_verification_ready:
            deployment.callback_verification_ready,
          sensitive_values_excluded:
            evidence.safety.sensitive_values_excluded,
        },
      },
      EXPECTED_SHA,
    );

    expect(report.workflow_run_url).toBe(EXPECTED_RUN_URL);
    expect(evidence.workflow).toMatchObject({
      run_id: 28460115824,
      result: "success",
    });
    expect(evidence.artifact).toMatchObject({
      id: 7987167172,
      name: "mainnet-public-deployment-28460115824",
    });
    expect(evidence.safety).toEqual({
      committed_rollback_baseline_release_mode: "internal",
      committed_rollback_baseline_operations_mode: "halted",
      automatic_halted_rollback_armed: true,
      new_transaction_performed: false,
      new_handoff_created: false,
      production_d1_write_performed: false,
      sensitive_values_excluded: true,
    });
  });

  it("keeps the public runtime distinct from the committed rollback baseline", async () => {
    const evidence = await loadEvidence();

    expect(evidence.deployment.release_mode).toBe("public");
    expect(evidence.deployment.operations_mode).toBe("enabled");
    expect(evidence.safety.committed_rollback_baseline_release_mode).toBe(
      "internal",
    );
    expect(evidence.safety.committed_rollback_baseline_operations_mode).toBe(
      "halted",
    );
  });
});
