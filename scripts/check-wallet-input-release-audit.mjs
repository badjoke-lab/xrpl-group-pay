import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readText = (path) => readFileSync(resolve(root, path), "utf8");
const readJson = (path) => JSON.parse(readText(path));

function fail(message) {
  throw new Error(`[wallet-input-release-audit] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertExactArray(actual, expected, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} must equal ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`,
  );
}

function assertContains(path, fragments) {
  const text = readText(path);
  for (const fragment of fragments) {
    assert(text.includes(fragment), `${path} must contain: ${fragment}`);
  }
  return text;
}

const auditPath = "config/wallet-input-release-audit.json";
assert(existsSync(resolve(root, auditPath)), `${auditPath} is missing`);
const audit = readJson(auditPath);

assert(audit.schema_version === 1, "schema_version must be 1");
assert(audit.audit_id === "wallet-input-pre-submission-release", "unexpected audit_id");
assert(audit.status === "passed", "audit status must be passed");
assert(audit.audited_at === "2026-07-03", "audited_at must be 2026-07-03");
assertExactArray(audit.audited_merged_prs, [150, 151], "audited_merged_prs");
assert(audit.release_audit_pr === 152, "release_audit_pr must be 152");

assertExactArray(audit.dimensions?.roles, ["recipient", "payer"], "roles");
assertExactArray(
  audit.dimensions?.payment_modes,
  ["representative", "direct"],
  "payment_modes",
);
assertExactArray(audit.dimensions?.networks, ["testnet", "mainnet"], "networks");
assertExactArray(audit.dimensions?.assets, ["xrp", "official_rlusd"], "assets");
assertExactArray(
  audit.dimensions?.address_inputs,
  ["classic_address", "x_address", "clipboard", "saved_wallet"],
  "address_inputs",
);
assertExactArray(
  audit.dimensions?.saved_wallet_operations,
  [
    "save",
    "select",
    "search",
    "favorite",
    "recent",
    "edit",
    "delete",
    "delete_all",
    "export",
    "import",
  ],
  "saved_wallet_operations",
);
assertExactArray(audit.dimensions?.locales, ["en", "ja", "ko"], "locales");
assertExactArray(audit.dimensions?.viewports_px, [320, 390, 1280], "viewports_px");
assertExactArray(audit.dimensions?.zoom_percent, [200], "zoom_percent");

const expectedFields = [
  "id",
  "label",
  "classicAddress",
  "destinationTag",
  "role",
  "network",
  "favorite",
  "createdAt",
  "updatedAt",
  "lastUsedAt",
];
assertExactArray(audit.approved_saved_wallet_fields, expectedFields, "approved_saved_wallet_fields");
assertExactArray(
  audit.forbidden_saved_wallet_data,
  [
    "bill_id",
    "payment_slot_id",
    "capability",
    "invoice_id",
    "provider_request_id",
    "transaction_hash",
    "receipt",
    "proof",
    "balance",
    "readiness_result",
    "claimed_identity",
  ],
  "forbidden_saved_wallet_data",
);

const storage = audit.storage_boundary ?? {};
assert(storage.technology === "indexeddb", "storage technology must be indexeddb");
for (const key of ["origin_local_only", "direct_entry_fallback_required"]) {
  assert(storage[key] === true, `storage_boundary.${key} must be true`);
}
for (const key of [
  "api_persistence",
  "d1_persistence",
  "analytics_persistence",
  "cross_device_sync",
  "identity_proof",
]) {
  assert(storage[key] === false, `storage_boundary.${key} must be false`);
}

const requiredControls = [
  "classic-address-validation",
  "x-address-network-and-tag-review",
  "recipient-payer-wallet-boundary",
  "exchange-and-manual-transfer-warning",
  "clipboard-user-action-and-fallback",
  "local-only-saved-wallet-storage",
  "saved-wallet-field-allowlist",
  "role-network-and-tag-isolation",
  "saved-wallet-management-and-portability",
  "validation-readiness-and-freeze-not-bypassed",
  "privacy-and-capability-exclusion",
  "multilingual-critical-states",
  "accessibility-responsive-and-zoom",
  "payment-lifecycle-and-mainnet-regression",
];
const controls = new Map((audit.controls ?? []).map((control) => [control.id, control]));
assert(controls.size === requiredControls.length, "audit must contain exactly 14 controls");
for (const id of requiredControls) {
  const control = controls.get(id);
  assert(control, `missing control: ${id}`);
  assert(control.status === "passed", `control ${id} must be passed`);
  assert(Array.isArray(control.evidence) && control.evidence.length > 0, `control ${id} needs evidence`);
  for (const path of control.evidence) {
    assert(existsSync(resolve(root, path)), `control ${id} evidence file is missing: ${path}`);
  }
}

const unresolvedSevere = (audit.findings ?? []).filter(
  (finding) =>
    ["high", "critical"].includes(finding.severity) &&
    finding.status !== "resolved",
);
assert(unresolvedSevere.length === 0, "no unresolved high or critical findings are allowed");

assert(audit.decision?.feature_freeze === true, "feature_freeze must be true");
assert(audit.decision?.wallet_input_phase_complete === true, "wallet_input_phase_complete must be true");
assert(audit.decision?.submission_work_may_resume === true, "submission_work_may_resume must be true");
assertExactArray(
  audit.decision?.deferred_features,
  [
    "camera_qr_scanning",
    "xaman_account_discovery",
    "additional_wallet_providers",
    "manual_wallet_settlement",
    "exchange_withdrawal_settlement",
    "participant_self_registration",
    "cloud_contact_sync",
    "user_accounts",
  ],
  "deferred_features",
);

const savedWalletSource = assertContains("src/features/saved-wallets/saved-wallets.ts", [
  'const DB_NAME = "xrpl-group-pay-saved-wallets"',
  "indexedDB.open",
  "SAVED_WALLET_MAX_RECORDS",
  "SAVED_WALLET_MAX_IMPORT_BYTES",
  "Payer-only records cannot store a Destination Tag",
]);
for (const forbidden of ["fetch(", "/api/", "D1Database", "env.DB", "analytics.track"] ) {
  assert(!savedWalletSource.includes(forbidden), `saved-wallet repository must not contain ${forbidden}`);
}
for (const field of expectedFields) {
  assert(savedWalletSource.includes(field), `saved-wallet repository must define approved field ${field}`);
}

assertContains("src/components/bills/xrpl-address-field.tsx", [
  "<BillFormField",
  "<SavedWalletPicker",
  "navigator.clipboard?.readText",
  "Exchange withdrawals and ordinary manual transfers are not supported settlement paths.",
  "取引所出金や通常の手動送金は対応済みの精算経路ではありません。",
  "거래소 출금이나 일반 수동 전송은 지원되는 정산 경로가 아닙니다.",
]);
assertContains("src/components/bills/saved-wallet-picker.tsx", [
  "Browser-local only",
  "ブラウザ内のみ",
  "브라우저 로컬 전용",
  "savedWalletSupportsRole",
  "markSavedWalletUsed",
  "serializeSavedWalletExport",
  "parseSavedWalletImport",
]);
assertContains("src/features/saved-wallets/saved-wallets.test.ts", [
  'expect(text).not.toContain("capability")',
  'expect(text).not.toContain("billId")',
  'expect(text).not.toContain("invoiceId")',
  'expect(text).not.toContain("transactionHash")',
]);

assertContains("docs/wallet-input-release-audit.md", [
  "**Decision:** Passed",
  "PR #150 and PR #151 are merged",
  "feature work is frozen",
  "submission preparation may resume",
]);
assertContains("docs/wallet-input-pre-submission-schedule.md", [
  "**Status:** Completed",
  "| #150 | Completed |",
  "| #151 | Completed |",
  "| #152 | Completed |",
]);
assertContains("README.md", [
  "The PR #150–#152 wallet-input pre-submission phase passed its integrated audit.",
  "Remaining submission work consists of:",
]);
assertContains("ROADMAP.md", [
  "No wallet-input implementation work remains in progress.",
  "## Make Waves submission work",
]);
assertContains("CHANGELOG.md", [
  "Completed the PR #150–#152 wallet-input pre-submission phase.",
]);
assertContains("docs/privacy-data-map.md", [
  "Saved wallets are optional records held only in IndexedDB",
  "Saved-wallet operations do not call the Group Pay API, write D1, or enter application analytics.",
]);
assertContains("docs/guide-and-contextual-help.md", [
  "selecting a record never skips validation, readiness, review, freeze, wallet handoff, or validated-ledger verification",
]);
assertContains("package.json", [
  '"check:wallet-input-audit": "node scripts/check-wallet-input-release-audit.mjs"',
  "pnpm check:wallet-input-audit",
]);
assertContains(".github/workflows/ci.yml", [
  "Validate wallet-input release audit",
  "pnpm check:wallet-input-audit",
]);

console.log("Wallet-input release audit passed.");
