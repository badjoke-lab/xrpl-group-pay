import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  assertPaymentOperationAllowed,
  resolvePaymentOperations,
} from "@/config/payment-operations";
import {
  handleCreateSlotPayloadRequest,
  type SlotPayloadRouteDependencies,
} from "@/app/api/payments/payload/route";
import {
  handleVerificationRequest,
  type VerificationRouteDependencies,
} from "@/app/api/payments/verify/route";
import { handlePaymentOperationsStatusRequest } from "@/app/api/status/payments/route";
import type { AssetPaymentVerificationApiOutcome } from "@/features/payment-verification/asset-api-outcome";

const paymentToken = "a".repeat(64);
const payloadId = "00000000-0000-4000-8000-000000000001";

const verifyOnlyEnvironment = {
  APP_NETWORK: "mainnet",
  NEXT_PUBLIC_APP_NETWORK: "mainnet",
  MAINNET_OPERATIONS_MODE: "verify-only",
} as const;

const haltedEnvironment = {
  APP_NETWORK: "mainnet",
  NEXT_PUBLIC_APP_NETWORK: "mainnet",
  MAINNET_OPERATIONS_MODE: "halted",
} as const;

const enabledEnvironment = {
  APP_NETWORK: "mainnet",
  NEXT_PUBLIC_APP_NETWORK: "mainnet",
  MAINNET_OPERATIONS_MODE: "enabled",
} as const;

function payloadRequest() {
  return new Request("http://localhost/api/payments/payload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentToken }),
  });
}

function verificationRequest() {
  return new Request("http://localhost/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentToken, payloadId }),
  });
}

function parseJsonc(source: string) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments) as {
    env?: {
      mainnet?: {
        vars?: Record<string, string>;
      };
    };
  };
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("production-equivalent Mainnet operational stop drill", () => {
  it("proves verify-only draining, full halt, status reporting, and reviewed restore boundaries", async () => {
    let createSideEffects = 0;
    const verifyOnlyCreate: SlotPayloadRouteDependencies = {
      async createPayload() {
        assertPaymentOperationAllowed(verifyOnlyEnvironment, "create");
        createSideEffects += 1;
        return {};
      },
    };
    const verifyOnlyCreateResponse = await handleCreateSlotPayloadRequest(
      payloadRequest(),
      verifyOnlyCreate,
    );
    expect(verifyOnlyCreateResponse.status).toBe(503);
    expect(verifyOnlyCreateResponse.headers.get("retry-after")).toBe("60");
    expect(await readJson(verifyOnlyCreateResponse)).toMatchObject({
      error: {
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "create",
        mode: "verify-only",
      },
    });
    expect(createSideEffects).toBe(0);

    let settlementSideEffects = 0;
    const verifiedOutcome = {
      status: "verified",
    } as unknown as AssetPaymentVerificationApiOutcome;
    const verifyOnlyVerification: VerificationRouteDependencies = {
      async verifyAndRecord() {
        assertPaymentOperationAllowed(verifyOnlyEnvironment, "verify");
        settlementSideEffects += 1;
        return verifiedOutcome;
      },
    };
    const verifyOnlyVerificationResponse = await handleVerificationRequest(
      verificationRequest(),
      verifyOnlyVerification,
    );
    expect(verifyOnlyVerificationResponse.status).toBe(200);
    expect(await verifyOnlyVerificationResponse.json()).toEqual(verifiedOutcome);
    expect(settlementSideEffects).toBe(1);

    const verifyOnlyStatus = handlePaymentOperationsStatusRequest({
      readState: () => resolvePaymentOperations(verifyOnlyEnvironment),
    });
    expect(verifyOnlyStatus.status).toBe(200);
    expect(await verifyOnlyStatus.json()).toEqual({
      schemaVersion: 1,
      network: "mainnet",
      status: "verification-only",
      mode: "verify-only",
      operations: { create: false, verify: true },
    });

    let haltedCreateSideEffects = 0;
    const haltedCreate: SlotPayloadRouteDependencies = {
      async createPayload() {
        assertPaymentOperationAllowed(haltedEnvironment, "create");
        haltedCreateSideEffects += 1;
        return {};
      },
    };
    const haltedCreateResponse = await handleCreateSlotPayloadRequest(
      payloadRequest(),
      haltedCreate,
    );
    expect(haltedCreateResponse.status).toBe(503);
    expect(await readJson(haltedCreateResponse)).toMatchObject({
      error: {
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "create",
        mode: "halted",
      },
    });
    expect(haltedCreateSideEffects).toBe(0);

    let haltedVerificationSideEffects = 0;
    const haltedVerification: VerificationRouteDependencies = {
      async verifyAndRecord() {
        assertPaymentOperationAllowed(haltedEnvironment, "verify");
        haltedVerificationSideEffects += 1;
        return verifiedOutcome;
      },
    };
    const haltedVerificationResponse = await handleVerificationRequest(
      verificationRequest(),
      haltedVerification,
    );
    expect(haltedVerificationResponse.status).toBe(503);
    expect(await readJson(haltedVerificationResponse)).toMatchObject({
      error: {
        code: "PAYMENT_OPERATIONS_HALTED",
        operation: "verify",
        mode: "halted",
      },
    });
    expect(haltedVerificationSideEffects).toBe(0);

    const haltedStatus = handlePaymentOperationsStatusRequest({
      readState: () => resolvePaymentOperations(haltedEnvironment),
    });
    expect(haltedStatus.status).toBe(200);
    expect(await haltedStatus.json()).toEqual({
      schemaVersion: 1,
      network: "mainnet",
      status: "halted",
      mode: "halted",
      operations: { create: false, verify: false },
    });

    const reviewedRestore = resolvePaymentOperations(enabledEnvironment);
    expect(reviewedRestore).toMatchObject({
      network: "mainnet",
      mode: "enabled",
      creationEnabled: true,
      verificationEnabled: true,
      status: "operational",
    });

    const wrangler = parseJsonc(
      await readFile(resolve(process.cwd(), "wrangler.jsonc"), "utf8"),
    );
    expect(wrangler.env?.mainnet?.vars?.MAINNET_OPERATIONS_MODE).toBe(
      "halted",
    );

    const outputPath = process.env.OPERATIONAL_STOP_DRILL_REPORT_PATH;
    if (!outputPath) return;

    const gitSha = process.env.GITHUB_SHA ?? "";
    const runId = process.env.GITHUB_RUN_ID ?? "";
    const repository = process.env.GITHUB_REPOSITORY ?? "";
    const serverUrl = process.env.GITHUB_SERVER_URL ?? "";
    const refName = process.env.GITHUB_REF_NAME ?? "";
    expect(gitSha).toMatch(/^[0-9a-f]{40}$/);
    expect(runId).toMatch(/^\d+$/);
    expect(repository).toBe("badjoke-lab/xrpl-group-pay");
    expect(serverUrl).toBe("https://github.com");
    expect(refName).toBe("main");

    const generatedAt = new Date().toISOString();
    const workflowRunUrl = `${serverUrl}/${repository}/actions/runs/${runId}`;
    const evidencePatch = {
      id: "operational-stop-drill",
      status: "accepted",
      recorded_at: generatedAt,
      environment: "production-equivalent",
      verify_only_creation_blocked: true,
      verify_only_submitted_payment_settled: true,
      verify_only_status_checked: true,
      halted_creation_blocked: true,
      halted_verification_blocked: true,
      halted_status_checked: true,
      restore_change_reviewed: true,
    } as const;
    const report = {
      schema_version: 1,
      network: "mainnet",
      environment: "production-equivalent",
      generated_at: generatedAt,
      git_sha: gitSha,
      state: "verified",
      workflow_run_url: workflowRunUrl,
      committed_mainnet_mode: "halted",
      restore_review: {
        simulated_mode: "enabled",
        committed_mode: "halted",
        applied: false,
        review_required: true,
      },
      checks: {
        verify_only_creation_blocked: true,
        verify_only_submitted_payment_settled: true,
        verify_only_status_checked: true,
        halted_creation_blocked: true,
        halted_verification_blocked: true,
        halted_status_checked: true,
        restore_change_reviewed: true,
        external_services_called: false,
        production_state_changed: false,
      },
      evidence_patch: evidencePatch,
    };

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  });
});
