import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { z } from "zod";

const root = process.cwd();

const entrySchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    status: z.literal("passed"),
    evidence: z.array(z.string().min(1)).min(1),
  })
  .strict();

const auditSchema = z
  .object({
    schema_version: z.literal(1),
    status: z.literal("passed"),
    audited_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    revision_prs: z.array(
      z
        .object({
          number: z.number().int().min(132).max(148),
          status: z.literal("merged"),
        })
        .strict(),
    ),
    dimensions: z
      .object({
        payment_modes: z.array(z.string()),
        settlement_assets: z.array(z.string()),
        lifecycle_states: z.array(z.string()),
        recovery_dispositions: z.array(z.string()),
        capability_surfaces: z.array(z.string()),
        locales: z.array(z.string()),
        viewports: z.array(z.number().int()),
      })
      .strict(),
    controls: z.array(entrySchema).min(1),
    findings: z.array(
      z
        .object({
          id: z.string().min(1),
          severity: z.enum(["low", "medium", "high", "critical"]),
          status: z.enum(["open", "resolved"]),
        })
        .strict(),
    ),
    public_availability: z
      .object({
        readme: z.literal("aligned"),
        roadmap: z.literal("aligned"),
        changelog: z.literal("aligned"),
      })
      .strict(),
  })
  .strict();

const requiredControls = [
  "domain-and-persistence",
  "two-mode-creation-and-sharing",
  "xrp-and-rlusd-readiness",
  "trustset-and-xaman-lifecycle",
  "verification-reconciliation-and-duplicates",
  "failure-retry-and-review",
  "progress-partial-completion-and-closure",
  "copy-to-revise-and-immutability",
  "multilingual-guide-help-and-accessibility",
  "visual-and-responsive-production-ui",
  "testnet-lifecycle-evidence",
  "mainnet-safe-acceptance",
  "privacy-and-public-surface",
  "build-and-runtime-suite",
];

function assertExactSet(actual, expected, label) {
  const actualSet = new Set(actual);
  if (actualSet.size !== actual.length) {
    throw new Error(`${label} contains duplicates.`);
  }
  const missing = expected.filter((value) => !actualSet.has(value));
  const unknown = actual.filter((value) => !expected.includes(value));
  if (missing.length || unknown.length) {
    throw new Error(
      `${label} mismatch. Missing: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}.`,
    );
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(root, path), "utf8"));
}

const audit = auditSchema.parse(
  await readJson("config/payment-lifecycle-release-audit.json"),
);

assertExactSet(
  audit.revision_prs.map((entry) => entry.number),
  Array.from({ length: 17 }, (_, index) => 132 + index),
  "Revision PR range",
);
assertExactSet(
  audit.controls.map((entry) => entry.id),
  requiredControls,
  "Release audit controls",
);
assertExactSet(audit.dimensions.payment_modes, ["representative", "direct"], "Payment modes");
assertExactSet(
  audit.dimensions.settlement_assets,
  [
    "xrpl:testnet:xrp",
    "xrpl:testnet:rlusd",
    "xrpl:mainnet:xrp",
    "xrpl:mainnet:rlusd",
  ],
  "Settlement assets",
);
assertExactSet(audit.dimensions.locales, ["en", "ja", "ko"], "Locales");
assertExactSet(audit.dimensions.viewports, [320, 390, 1280], "Viewports");
assertExactSet(
  audit.dimensions.recovery_dispositions,
  [
    "safe_retry",
    "wait_recheck",
    "setup_required",
    "review_required",
    "already_paid",
    "terminal",
  ],
  "Recovery dispositions",
);

const unresolvedSevere = audit.findings.filter(
  (finding) =>
    finding.status === "open" &&
    (finding.severity === "high" || finding.severity === "critical"),
);
if (unresolvedSevere.length) {
  throw new Error(
    `Release audit has unresolved severe findings: ${unresolvedSevere
      .map((finding) => finding.id)
      .join(", ")}`,
  );
}

for (const control of audit.controls) {
  for (const path of control.evidence) {
    await access(resolve(root, path));
  }
}

const acceptance = await readJson("config/mainnet-acceptance.json");
if (
  acceptance.audit_status !== "completed" ||
  acceptance.release_decision !== "approved" ||
  acceptance.controls.some((control) => control.status !== "passed") ||
  acceptance.blocking_findings.some((finding) => finding.status !== "resolved")
) {
  throw new Error("Integrated release audit requires approved Mainnet acceptance with no open findings.");
}

const gate = await readJson("config/mainnet-gate.json");
if (gate.state !== "ready" || gate.checks.some((check) => check.status !== "passed")) {
  throw new Error("Integrated release audit requires a ready Mainnet gate with every check passed.");
}

const releaseEvidence = await readJson("config/mainnet-release-evidence.json");
if (releaseEvidence.records.some((record) => record.status !== "accepted")) {
  throw new Error("Integrated release audit requires every Mainnet evidence record to be accepted.");
}

const [readme, roadmap, changelog, schedule, mainnetAudit] = await Promise.all([
  readFile(resolve(root, "README.md"), "utf8"),
  readFile(resolve(root, "ROADMAP.md"), "utf8"),
  readFile(resolve(root, "CHANGELOG.md"), "utf8"),
  readFile(resolve(root, "docs/payment-lifecycle-revision-schedule.md"), "utf8"),
  readFile(resolve(root, "docs/mainnet-acceptance-audit.md"), "utf8"),
]);

for (const phrase of [
  "Pay a representative",
  "Pay a store or organizer directly",
  "official RLUSD TrustSet preparation",
  "copy-to-revise",
  "searchable Guide",
]) {
  if (!readme.includes(phrase)) {
    throw new Error(`README availability is missing: ${phrase}`);
  }
}
if (!roadmap.includes("No payment-lifecycle revision work remains in progress")) {
  throw new Error("Roadmap must close the payment-lifecycle revision In Progress section.");
}
if (!changelog.includes("Completed the PR #132–#149 payment-lifecycle revision")) {
  throw new Error("Changelog must record the completed payment-lifecycle revision.");
}
if (!schedule.includes("**Status:** Completed")) {
  throw new Error("Payment lifecycle revision schedule must be marked Completed.");
}
if (!mainnetAudit.includes("**Release decision:** Approved")) {
  throw new Error("Mainnet acceptance audit document must match the approved machine record.");
}

console.log(
  `Payment lifecycle release audit passed: ${audit.controls.length} controls, ${audit.revision_prs.length} merged implementation PRs, no unresolved severe findings.`,
);
