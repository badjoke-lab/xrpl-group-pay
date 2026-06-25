import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const statusSchema = z.enum(["pending", "accepted"]);
const recordedAtSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/)
  .nullable();
const uuidSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  .nullable();
const transactionHashSchema = z.string().regex(/^[A-F0-9]{64}$/).nullable();
const digestSchema = z.string().regex(/^[A-Fa-f0-9]{64}$/).nullable();
const receiptIdSchema = z
  .string()
  .regex(/^mainnet:[A-F0-9]{64}$/)
  .nullable();
const uint32Schema = z.number().int().min(0).max(4_294_967_295).nullable();
const positiveIntegerTextSchema = z.string().regex(/^[1-9]\d*$/).nullable();
const positiveIssuedValueSchema = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/)
  .nullable();

const commonRecord = {
  status: statusSchema,
  recorded_at: recordedAtSchema,
};

function requireAccepted(record, context, checks) {
  if (record.status !== "accepted") return;

  if (record.recorded_at === null) {
    context.addIssue({
      code: "custom",
      message: `${record.id} requires recorded_at when accepted.`,
    });
  }

  for (const [condition, message] of checks) {
    if (!condition) {
      context.addIssue({ code: "custom", message });
    }
  }
}

const d1RecordSchema = z
  .object({
    id: z.literal("production-d1-provisioning"),
    ...commonRecord,
    database_name: z.literal("xrpl-group-pay-mainnet"),
    database_id: uuidSchema,
    preview_database_id: uuidSchema,
    migration_count: z.number().int().min(1).nullable(),
    migrations_applied: z.boolean(),
    receipt_schema_checked: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    const zero = "00000000-0000-0000-0000-000000000000";
    requireAccepted(record, context, [
      [record.database_id !== null && record.database_id !== zero, "Accepted D1 evidence requires a non-placeholder database_id."],
      [record.preview_database_id !== null && record.preview_database_id !== zero, "Accepted D1 evidence requires a non-placeholder preview_database_id."],
      [record.migration_count !== null, "Accepted D1 evidence requires migration_count."],
      [record.migrations_applied, "Accepted D1 evidence requires migrations_applied=true."],
      [record.receipt_schema_checked, "Accepted D1 evidence requires receipt_schema_checked=true."],
    ]);
  });

const releaseConfigurationRecordSchema = z
  .object({
    id: z.literal("production-release-configuration"),
    ...commonRecord,
    public_url: z.string().nullable(),
    app_network: z.literal("mainnet"),
    public_network: z.literal("mainnet"),
    database_binding: z.literal("PAYMENTS_DB_MAINNET"),
    runtime_allowed: z.boolean(),
    gate_approved: z.boolean(),
    source_tag_approved: z.boolean(),
    release_mode: z.enum(["disabled", "internal", "limited", "public"]),
    operations_mode: z.enum(["halted", "verify-only", "enabled"]),
  })
  .strict()
  .superRefine((record, context) => {
    let publicUrlAccepted = false;
    if (record.public_url !== null) {
      try {
        const url = new URL(record.public_url);
        publicUrlAccepted =
          url.protocol === "https:" &&
          url.hostname !== "localhost" &&
          url.hostname !== "127.0.0.1";
      } catch {
        publicUrlAccepted = false;
      }
    }

    requireAccepted(record, context, [
      [publicUrlAccepted, "Accepted release configuration requires a non-local HTTPS public_url."],
      [record.runtime_allowed, "Accepted release configuration requires runtime_allowed=true."],
      [record.gate_approved, "Accepted release configuration requires gate_approved=true."],
      [record.source_tag_approved, "Accepted release configuration requires source_tag_approved=true."],
      [record.release_mode !== "disabled", "Accepted release configuration cannot use release_mode=disabled."],
    ]);
  });

const providerRecordSchema = z
  .object({
    id: z.literal("production-provider-attestation"),
    ...commonRecord,
    attestation_reference: z.string().min(8).max(200).nullable(),
    credentials_configured: z.boolean(),
    forced_mainnet_request_checked: z.boolean(),
    callback_behavior_checked: z.boolean(),
    status_lookup_checked: z.boolean(),
    secrets_committed: z.literal(false),
  })
  .strict()
  .superRefine((record, context) => {
    requireAccepted(record, context, [
      [record.attestation_reference !== null, "Accepted provider evidence requires attestation_reference."],
      [record.credentials_configured, "Accepted provider evidence requires credentials_configured=true."],
      [record.forced_mainnet_request_checked, "Accepted provider evidence requires forced_mainnet_request_checked=true."],
      [record.callback_behavior_checked, "Accepted provider evidence requires callback_behavior_checked=true."],
      [record.status_lookup_checked, "Accepted provider evidence requires status_lookup_checked=true."],
    ]);
  });

const sourceTagRecordSchema = z
  .object({
    id: z.literal("assigned-mainnet-source-tag"),
    ...commonRecord,
    source_tag: uint32Schema,
    assignment_reference: z.string().min(8).max(200).nullable(),
    no_testnet_fallback: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    requireAccepted(record, context, [
      [record.source_tag !== null, "Accepted Source Tag evidence requires source_tag."],
      [record.assignment_reference !== null, "Accepted Source Tag evidence requires assignment_reference."],
      [record.no_testnet_fallback, "Accepted Source Tag evidence requires no_testnet_fallback=true."],
    ]);
  });

const xrpRecordSchema = z
  .object({
    id: z.literal("live-mainnet-xrp-acceptance"),
    ...commonRecord,
    transaction_hash: transactionHashSchema,
    ledger_index: z.number().int().positive().nullable(),
    validated: z.boolean(),
    transaction_result: z.literal("tesSUCCESS").nullable(),
    amount_drops: positiveIntegerTextSchema,
    receipt_id: receiptIdSchema,
    proof_digest: digestSchema,
    duplicate_rejected: z.boolean(),
    replay_rejected: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    requireAccepted(record, context, [
      [record.transaction_hash !== null, "Accepted XRP evidence requires transaction_hash."],
      [record.ledger_index !== null, "Accepted XRP evidence requires ledger_index."],
      [record.validated, "Accepted XRP evidence requires validated=true."],
      [record.transaction_result === "tesSUCCESS", "Accepted XRP evidence requires tesSUCCESS."],
      [record.amount_drops !== null, "Accepted XRP evidence requires amount_drops."],
      [record.receipt_id === `mainnet:${record.transaction_hash}`, "Accepted XRP evidence requires a matching Mainnet receipt_id."],
      [record.proof_digest !== null, "Accepted XRP evidence requires proof_digest."],
      [record.duplicate_rejected, "Accepted XRP evidence requires duplicate_rejected=true."],
      [record.replay_rejected, "Accepted XRP evidence requires replay_rejected=true."],
    ]);
  });

const rlusdRecordSchema = z
  .object({
    id: z.literal("live-mainnet-rlusd-acceptance"),
    ...commonRecord,
    transaction_hash: transactionHashSchema,
    ledger_index: z.number().int().positive().nullable(),
    validated: z.boolean(),
    transaction_result: z.literal("tesSUCCESS").nullable(),
    currency: z.literal("524C555344000000000000000000000000000000"),
    issuer: z.literal("rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De"),
    amount_value: positiveIssuedValueSchema,
    receipt_id: receiptIdSchema,
    proof_digest: digestSchema,
    recipient_readiness_checked: z.boolean(),
    duplicate_rejected: z.boolean(),
    replay_rejected: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    const positiveAmount =
      record.amount_value !== null && Number(record.amount_value) > 0;
    requireAccepted(record, context, [
      [record.transaction_hash !== null, "Accepted RLUSD evidence requires transaction_hash."],
      [record.ledger_index !== null, "Accepted RLUSD evidence requires ledger_index."],
      [record.validated, "Accepted RLUSD evidence requires validated=true."],
      [record.transaction_result === "tesSUCCESS", "Accepted RLUSD evidence requires tesSUCCESS."],
      [positiveAmount, "Accepted RLUSD evidence requires a positive amount_value."],
      [record.receipt_id === `mainnet:${record.transaction_hash}`, "Accepted RLUSD evidence requires a matching Mainnet receipt_id."],
      [record.proof_digest !== null, "Accepted RLUSD evidence requires proof_digest."],
      [record.recipient_readiness_checked, "Accepted RLUSD evidence requires recipient_readiness_checked=true."],
      [record.duplicate_rejected, "Accepted RLUSD evidence requires duplicate_rejected=true."],
      [record.replay_rejected, "Accepted RLUSD evidence requires replay_rejected=true."],
    ]);
  });

const stopDrillRecordSchema = z
  .object({
    id: z.literal("operational-stop-drill"),
    ...commonRecord,
    environment: z.enum(["production-equivalent", "mainnet"]),
    verify_only_creation_blocked: z.boolean(),
    verify_only_submitted_payment_settled: z.boolean(),
    verify_only_status_checked: z.boolean(),
    halted_creation_blocked: z.boolean(),
    halted_verification_blocked: z.boolean(),
    halted_status_checked: z.boolean(),
    restore_change_reviewed: z.boolean(),
  })
  .strict()
  .superRefine((record, context) => {
    requireAccepted(record, context, [
      [record.verify_only_creation_blocked, "Accepted stop-drill evidence requires verify-only creation blocking."],
      [record.verify_only_submitted_payment_settled, "Accepted stop-drill evidence requires an existing submitted payment to settle in verify-only mode."],
      [record.verify_only_status_checked, "Accepted stop-drill evidence requires verify-only status verification."],
      [record.halted_creation_blocked, "Accepted stop-drill evidence requires halted creation blocking."],
      [record.halted_verification_blocked, "Accepted stop-drill evidence requires halted verification blocking."],
      [record.halted_status_checked, "Accepted stop-drill evidence requires halted status verification."],
      [record.restore_change_reviewed, "Accepted stop-drill evidence requires a reviewed restore change."],
    ]);
  });

const evidenceRecordSchema = z.discriminatedUnion("id", [
  d1RecordSchema,
  releaseConfigurationRecordSchema,
  providerRecordSchema,
  sourceTagRecordSchema,
  xrpRecordSchema,
  rlusdRecordSchema,
  stopDrillRecordSchema,
]);

const evidenceDocumentSchema = z
  .object({
    schema_version: z.literal(1),
    network: z.literal("mainnet"),
    updated_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    records: z.array(evidenceRecordSchema),
  })
  .strict();

const acceptanceSchema = z.object({
  release_decision: z.enum(["blocked", "approved"]),
  controls: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["passed", "pending", "failed"]),
    }),
  ),
  blocking_findings: z.array(
    z.object({
      id: z.string(),
      status: z.enum(["open", "resolved"]),
    }),
  ),
});

const assetRegistrySchema = z.object({
  network: z.literal("mainnet"),
  assets: z.array(
    z.object({
      id: z.string(),
      currency: z.string(),
      issuer: z.string().nullable(),
    }),
  ),
});

export const EVIDENCE_ACCEPTANCE_MAP = [
  ["production-d1-provisioning", "production-d1-provisioning", "production-d1-not-provisioned"],
  ["production-release-configuration", "production-release-configuration", "production-runtime-not-approved"],
  ["production-provider-attestation", "production-provider-attestation", "production-provider-not-attested"],
  ["assigned-mainnet-source-tag", "assigned-mainnet-source-tag", "mainnet-source-tag-not-assigned"],
  ["live-mainnet-xrp-acceptance", "live-mainnet-xrp-acceptance", "live-xrp-acceptance-not-recorded"],
  ["live-mainnet-rlusd-acceptance", "live-mainnet-rlusd-acceptance", "live-rlusd-acceptance-not-recorded"],
  ["operational-stop-drill", "operational-stop-drill", "operational-stop-drill-not-recorded"],
];

function parseJsonc(source) {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(
    /(^|[^:])\/\/.*$/gm,
    "$1",
  );
  return JSON.parse(withoutLineComments);
}

function assertUniqueRecords(records) {
  const seen = new Set();
  for (const record of records) {
    if (seen.has(record.id)) {
      throw new Error(`Mainnet release evidence IDs must be unique: ${record.id}`);
    }
    seen.add(record.id);
  }

  const required = EVIDENCE_ACCEPTANCE_MAP.map(([id]) => id);
  for (const id of required) {
    if (!seen.has(id)) {
      throw new Error(`Mainnet release evidence is missing: ${id}`);
    }
  }
  if (records.length !== required.length) {
    throw new Error("Mainnet release evidence contains an unknown record.");
  }
}

function assertNoSensitiveValues(value) {
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
    /\bsEd[1-9A-HJ-NP-Za-km-z]{20,}\b/,
    /\bs[1-9A-HJ-NP-Za-km-z]{28,}\b/,
  ];

  function visit(candidate) {
    if (typeof candidate === "string") {
      for (const pattern of patterns) {
        if (pattern.test(candidate)) {
          throw new Error("Mainnet release evidence contains a prohibited secret-like value.");
        }
      }
      return;
    }
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    if (candidate && typeof candidate === "object") {
      Object.values(candidate).forEach(visit);
    }
  }

  visit(value);
}

export function assertEvidenceMatchesAcceptance(evidence, acceptance) {
  const recordMap = new Map(evidence.records.map((record) => [record.id, record]));
  const controlMap = new Map(acceptance.controls.map((control) => [control.id, control]));
  const findingMap = new Map(
    acceptance.blocking_findings.map((finding) => [finding.id, finding]),
  );

  for (const [recordId, controlId, findingId] of EVIDENCE_ACCEPTANCE_MAP) {
    const record = recordMap.get(recordId);
    const control = controlMap.get(controlId);
    const finding = findingMap.get(findingId);
    if (!control || !finding) {
      throw new Error(`Acceptance mapping is incomplete for ${recordId}.`);
    }

    if (record.status === "accepted") {
      if (control.status !== "passed" || finding.status !== "resolved") {
        throw new Error(
          `Accepted evidence ${recordId} requires a passed control and resolved finding.`,
        );
      }
    } else if (control.status === "passed" || finding.status !== "open") {
      throw new Error(
        `Pending evidence ${recordId} cannot have a passed control or resolved finding.`,
      );
    }
  }

  if (
    acceptance.release_decision === "approved" &&
    evidence.records.some((record) => record.status !== "accepted")
  ) {
    throw new Error("Approved Mainnet release requires every evidence record to be accepted.");
  }
}

export function assertEvidenceMatchesConfiguration(
  evidence,
  wranglerSource,
  assetRegistry,
) {
  const wrangler = parseJsonc(wranglerSource);
  const mainnet = wrangler?.env?.mainnet;
  if (!mainnet) {
    throw new Error("Wrangler must define an explicit Mainnet environment.");
  }
  const recordMap = new Map(evidence.records.map((record) => [record.id, record]));

  const d1 = recordMap.get("production-d1-provisioning");
  if (d1.status === "accepted") {
    const database = mainnet.d1_databases?.find(
      (candidate) => candidate.binding === "PAYMENTS_DB_MAINNET",
    );
    if (
      !database ||
      database.database_name !== d1.database_name ||
      database.database_id !== d1.database_id ||
      database.preview_database_id !== d1.preview_database_id
    ) {
      throw new Error("Accepted D1 evidence must match the Mainnet Wrangler binding.");
    }
  }

  const sourceTag = recordMap.get("assigned-mainnet-source-tag");
  if (
    sourceTag.status === "accepted" &&
    String(sourceTag.source_tag) !== mainnet.vars?.XRPL_MAINNET_SOURCE_TAG
  ) {
    throw new Error("Accepted Source Tag evidence must match XRPL_MAINNET_SOURCE_TAG.");
  }

  const release = recordMap.get("production-release-configuration");
  if (release.status === "accepted") {
    const variables = mainnet.vars ?? {};
    const expected = {
      APP_NETWORK: release.app_network,
      NEXT_PUBLIC_APP_NETWORK: release.public_network,
      PAYMENTS_DATABASE_BINDING: release.database_binding,
      ALLOW_MAINNET_RUNTIME: String(release.runtime_allowed),
      MAINNET_GATE_APPROVED: String(release.gate_approved),
      MAINNET_SOURCE_TAG_APPROVED: String(release.source_tag_approved),
      MAINNET_RELEASE_MODE: release.release_mode,
      MAINNET_OPERATIONS_MODE: release.operations_mode,
    };
    for (const [name, value] of Object.entries(expected)) {
      if (variables[name] !== value) {
        throw new Error(`Accepted release evidence must match ${name}.`);
      }
    }
  }

  const rlusd = recordMap.get("live-mainnet-rlusd-acceptance");
  const canonicalRlusd = assetRegistry.assets.find(
    (asset) => asset.id === "xrpl:mainnet:rlusd",
  );
  if (
    !canonicalRlusd ||
    rlusd.currency !== canonicalRlusd.currency ||
    rlusd.issuer !== canonicalRlusd.issuer
  ) {
    throw new Error("RLUSD evidence must match the canonical Mainnet Asset Registry.");
  }
}

export async function readMainnetReleaseEvidence(
  path = resolve(process.cwd(), "config/mainnet-release-evidence.json"),
) {
  const parsed = evidenceDocumentSchema.parse(
    JSON.parse(await readFile(path, "utf8")),
  );
  assertUniqueRecords(parsed.records);
  assertNoSensitiveValues(parsed);
  return parsed;
}

export async function runMainnetReleaseEvidenceCheck({
  evidencePath = resolve(process.cwd(), "config/mainnet-release-evidence.json"),
  acceptancePath = resolve(process.cwd(), "config/mainnet-acceptance.json"),
  wranglerPath = resolve(process.cwd(), "wrangler.jsonc"),
  assetRegistryPath = resolve(process.cwd(), "config/xrpl-mainnet-assets.json"),
  requireComplete = false,
} = {}) {
  const [evidence, acceptanceRaw, wranglerSource, assetRegistryRaw] =
    await Promise.all([
      readMainnetReleaseEvidence(evidencePath),
      readFile(acceptancePath, "utf8"),
      readFile(wranglerPath, "utf8"),
      readFile(assetRegistryPath, "utf8"),
    ]);
  const acceptance = acceptanceSchema.parse(JSON.parse(acceptanceRaw));
  const assetRegistry = assetRegistrySchema.parse(JSON.parse(assetRegistryRaw));

  assertEvidenceMatchesAcceptance(evidence, acceptance);
  assertEvidenceMatchesConfiguration(evidence, wranglerSource, assetRegistry);

  if (
    requireComplete &&
    evidence.records.some((record) => record.status !== "accepted")
  ) {
    const pending = evidence.records
      .filter((record) => record.status !== "accepted")
      .map((record) => record.id)
      .join(", ");
    throw new Error(`Mainnet release evidence is incomplete (${pending}).`);
  }

  return evidence;
}

async function main() {
  const evidence = await runMainnetReleaseEvidenceCheck({
    requireComplete: process.argv.includes("--require-complete"),
  });
  const accepted = evidence.records.filter(
    (record) => record.status === "accepted",
  ).length;
  console.log(
    `Mainnet release evidence: accepted=${accepted}/${evidence.records.length}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Mainnet release evidence check failed: ${message}`);
    process.exit(1);
  });
}
