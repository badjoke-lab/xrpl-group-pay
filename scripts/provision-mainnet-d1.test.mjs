import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  assertKnownExistingTables,
  assertProvisioningRequest,
  buildProvisioningReport,
  createProvisionedWrangler,
  extractD1Rows,
  listMigrationFiles,
  normalizeD1List,
  resolveDatabasePair,
  validateSchemaSnapshot,
} from "./provision-mainnet-d1.mjs";

const directories = [];
const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const PREVIEW_ID = "22222222-2222-4222-8222-222222222222";

const policy = {
  schema_version: 1,
  network: "mainnet",
  binding: "PAYMENTS_DB_MAINNET",
  production_database_name: "xrpl-group-pay-mainnet",
  preview_database_name: "xrpl-group-pay-mainnet-preview",
  default_location: "apac",
  allowed_locations: ["apac", "weur"],
  inspect_confirmation: "INSPECT xrpl-group-pay-mainnet",
  provision_confirmation:
    "PROVISION xrpl-group-pay-mainnet AND xrpl-group-pay-mainnet-preview",
  required_tables: [
    "bills",
    "payment_slots",
    "wallet_handoffs",
    "verified_payment_receipts",
    "verified_payment_records",
    "bill_allocations",
    "bill_allocation_participants",
  ],
  required_verified_payment_columns: [
    "receipt_id",
    "network",
    "transaction_id",
    "asset_id",
    "amount_units",
  ],
};

function databasePair() {
  return {
    production: {
      name: policy.production_database_name,
      id: PRODUCTION_ID,
    },
    preview: {
      name: policy.preview_database_name,
      id: PREVIEW_ID,
    },
  };
}

function wranglerSource(overrides = {}) {
  const variables = {
    APP_NETWORK: "mainnet",
    NEXT_PUBLIC_APP_NETWORK: "mainnet",
    ALLOW_MAINNET_RUNTIME: "false",
    MAINNET_GATE_APPROVED: "false",
    MAINNET_SOURCE_TAG_APPROVED: "false",
    MAINNET_RELEASE_MODE: "disabled",
    MAINNET_OPERATIONS_MODE: "halted",
    PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB_MAINNET",
    ...overrides,
  };
  return JSON.stringify({
    vars: {
      APP_NETWORK: "testnet",
      PAYMENTS_DATABASE_BINDING: "PAYMENTS_DB",
    },
    d1_databases: [
      {
        binding: "PAYMENTS_DB",
        database_name: "xrpl-group-pay-testnet",
        database_id: "00000000-0000-0000-0000-000000000000",
      },
    ],
    env: {
      mainnet: {
        vars: variables,
        d1_databases: [
          {
            binding: "PAYMENTS_DB_MAINNET",
            database_name: "xrpl-group-pay-mainnet",
            database_id: "00000000-0000-0000-0000-000000000000",
            preview_database_id: "00000000-0000-0000-0000-000000000000",
            migrations_dir: "migrations",
          },
        ],
      },
    },
  });
}

function tables() {
  return policy.required_tables.map((name) => ({ name }));
}

function columns() {
  return policy.required_verified_payment_columns.map((name) => ({ name }));
}

function completeInspection(count = 10) {
  return {
    tables: tables(),
    columns: columns(),
    migration_count: count,
    schema: {
      required_tables_present: true,
      verified_payment_columns_present: true,
    },
  };
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("Mainnet D1 provisioning policy", () => {
  it("normalizes Wrangler D1 list formats and resolves the protected pair", () => {
    const databases = normalizeD1List({
      result: [
        { name: policy.production_database_name, uuid: PRODUCTION_ID },
        { database_name: policy.preview_database_name, id: PREVIEW_ID },
      ],
    });

    expect(resolveDatabasePair(databases, policy)).toEqual(databasePair());
  });

  it("rejects duplicate protected names and shared production/preview IDs", () => {
    expect(() =>
      resolveDatabasePair(
        [
          { name: policy.production_database_name, id: PRODUCTION_ID },
          { name: policy.production_database_name, id: PREVIEW_ID },
        ],
        policy,
        { requireBoth: false },
      ),
    ).toThrow("Multiple D1 databases");

    expect(() =>
      resolveDatabasePair(
        [
          { name: policy.production_database_name, id: PRODUCTION_ID },
          { name: policy.preview_database_name, id: PRODUCTION_ID },
        ],
        policy,
      ),
    ).toThrow("different IDs");
  });

  it("requires exact mode-specific confirmation and an allowed location", () => {
    expect(() =>
      assertProvisioningRequest(policy, {
        mode: "inspect",
        confirmation: policy.inspect_confirmation,
        location: "apac",
      }),
    ).not.toThrow();

    expect(() =>
      assertProvisioningRequest(policy, {
        mode: "provision",
        confirmation: policy.inspect_confirmation,
        location: "apac",
      }),
    ).toThrow("Confirmation text");

    expect(() =>
      assertProvisioningRequest(policy, {
        mode: "provision",
        confirmation: policy.provision_confirmation,
        location: "invalid",
      }),
    ).toThrow("Unsupported D1 location");
  });
});

describe("temporary Mainnet Wrangler configuration", () => {
  it("writes only the protected Mainnet D1 IDs and preserves safe defaults", () => {
    const configured = JSON.parse(
      createProvisionedWrangler(wranglerSource(), policy, {
        productionId: PRODUCTION_ID,
        previewId: PREVIEW_ID,
      }),
    );

    expect(configured.d1_databases[0].database_id).toBe(
      "00000000-0000-0000-0000-000000000000",
    );
    expect(configured.env.mainnet.vars).toMatchObject({
      ALLOW_MAINNET_RUNTIME: "false",
      MAINNET_GATE_APPROVED: "false",
      MAINNET_SOURCE_TAG_APPROVED: "false",
      MAINNET_RELEASE_MODE: "disabled",
      MAINNET_OPERATIONS_MODE: "halted",
    });
    expect(configured.env.mainnet.d1_databases[0]).toMatchObject({
      binding: "PAYMENTS_DB_MAINNET",
      database_name: policy.production_database_name,
      database_id: PRODUCTION_ID,
      preview_database_id: PREVIEW_ID,
    });
  });

  it("rejects a provisioning run after Mainnet runtime flags were enabled", () => {
    expect(() =>
      createProvisionedWrangler(
        wranglerSource({ ALLOW_MAINNET_RUNTIME: "true" }),
        policy,
        { productionId: PRODUCTION_ID, previewId: PREVIEW_ID },
      ),
    ).toThrow("safe default ALLOW_MAINNET_RUNTIME=false");
  });

  it("rejects placeholder or shared D1 IDs", () => {
    expect(() =>
      createProvisionedWrangler(wranglerSource(), policy, {
        productionId: "00000000-0000-0000-0000-000000000000",
        previewId: PREVIEW_ID,
      }),
    ).toThrow("non-placeholder");

    expect(() =>
      createProvisionedWrangler(wranglerSource(), policy, {
        productionId: PRODUCTION_ID,
        previewId: PRODUCTION_ID,
      }),
    ).toThrow("different");
  });
});

describe("migration and schema evidence", () => {
  it("discovers nested SQL migrations in deterministic order", async () => {
    const directory = await mkdtemp(join(tmpdir(), "group-pay-migrations-"));
    directories.push(directory);
    await mkdir(join(directory, "nested"));
    await Promise.all([
      writeFile(join(directory, "0002_second.sql"), "SELECT 2;"),
      writeFile(join(directory, "0001_first.sql"), "SELECT 1;"),
      writeFile(join(directory, "nested", "0003_third.sql"), "SELECT 3;"),
      writeFile(join(directory, "README.md"), "ignored"),
    ]);

    await expect(listMigrationFiles(directory)).resolves.toEqual([
      "0001_first.sql",
      "0002_second.sql",
      "nested/0003_third.sql",
    ]);
  });

  it("extracts D1 execute rows and validates required tables and columns", () => {
    expect(
      extractD1Rows([
        { results: [{ name: "bills" }] },
        { results: [{ name: "payment_slots" }] },
      ]),
    ).toEqual([{ name: "bills" }, { name: "payment_slots" }]);

    expect(validateSchemaSnapshot({ tables: tables(), columns: columns() }, policy))
      .toEqual({
        required_tables_present: true,
        verified_payment_columns_present: true,
      });

    expect(() =>
      validateSchemaSnapshot(
        { tables: tables().slice(1), columns: columns() },
        policy,
      ),
    ).toThrow("missing tables");

    expect(() =>
      validateSchemaSnapshot(
        { tables: tables(), columns: columns().slice(1) },
        policy,
      ),
    ).toThrow("missing columns");
  });

  it("rejects an existing protected-name database with unknown tables", () => {
    expect(() =>
      assertKnownExistingTables([...tables(), { name: "unrelated_customer_data" }], policy),
    ).toThrow("unknown tables");

    expect(() =>
      assertKnownExistingTables(
        [...tables(), { name: "d1_migrations" }, { name: "sqlite_sequence" }],
        policy,
      ),
    ).not.toThrow();
  });

  it("builds an evidence patch only for a fully verified production and preview pair", () => {
    const migrationFiles = Array.from(
      { length: 10 },
      (_, index) => `${String(index + 1).padStart(4, "0")}_migration.sql`,
    );
    const report = buildProvisioningReport({
      mode: "provision",
      gitSha: "a".repeat(40),
      location: "apac",
      policy,
      pair: databasePair(),
      migrationFiles,
      productionInspection: completeInspection(10),
      previewInspection: completeInspection(10),
      generatedAt: "2026-06-26T12:00:00Z",
    });

    expect(report).toMatchObject({
      state: "verified",
      safe_defaults_preserved: true,
      evidence_patch: {
        id: "production-d1-provisioning",
        status: "accepted",
        database_name: policy.production_database_name,
        database_id: PRODUCTION_ID,
        preview_database_id: PREVIEW_ID,
        migration_count: 10,
        migrations_applied: true,
        receipt_schema_checked: true,
      },
    });

    const incomplete = buildProvisioningReport({
      mode: "inspect",
      gitSha: "b".repeat(40),
      location: "apac",
      policy,
      pair: { production: null, preview: null },
      migrationFiles,
      productionInspection: null,
      previewInspection: null,
      generatedAt: "2026-06-26T12:00:00Z",
    });
    expect(incomplete).toMatchObject({
      state: "incomplete",
      evidence_patch: null,
    });
  });
});
