import { z } from "zod";

import type { XrplNetwork } from "@/features/assets/types";
import { isCanonicalClassicAddress } from "@/features/xrpl/address-input";

export const SAVED_WALLET_SCHEMA_VERSION = 1;
export const SAVED_WALLET_MAX_RECORDS = 500;
export const SAVED_WALLET_MAX_IMPORT_BYTES = 1_000_000;

export type SavedWalletRole = "recipient" | "payer" | "both";

export type SavedWalletRecord = {
  id: string;
  label: string;
  classicAddress: string;
  destinationTag: string | null;
  role: SavedWalletRole;
  network: XrplNetwork;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export type SavedWalletDraft = Pick<
  SavedWalletRecord,
  | "label"
  | "classicAddress"
  | "destinationTag"
  | "role"
  | "network"
  | "favorite"
>;

export type SavedWalletImportPayload = {
  schemaVersion: 1;
  exportedAt: string;
  wallets: SavedWalletRecord[];
};

export type SavedWalletStorageErrorCode =
  | "unavailable"
  | "quota"
  | "invalid_record"
  | "invalid_import"
  | "too_large"
  | "too_many_records"
  | "unknown";

export class SavedWalletStorageError extends Error {
  constructor(
    public readonly code: SavedWalletStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SavedWalletStorageError";
  }
}

const uint32TagSchema = z
  .string()
  .regex(/^\d+$/)
  .refine(
    (value) => BigInt(value) <= 4_294_967_295n,
    "Destination Tag exceeds UInt32",
  );

const roleSchema = z.enum(["recipient", "payer", "both"]);
const networkSchema = z.enum(["mainnet", "testnet"]);

const draftObjectSchema = z.object({
  label: z.string().trim().min(1).max(120),
  classicAddress: z
    .string()
    .trim()
    .refine(isCanonicalClassicAddress, "Invalid XRPL Classic Address"),
  destinationTag: z.union([uint32TagSchema, z.null()]),
  role: roleSchema,
  network: networkSchema,
  favorite: z.boolean(),
});

function addRoleTagIssue(
  value: { role: SavedWalletRole; destinationTag: string | null },
  context: z.RefinementCtx,
) {
  if (value.role === "payer" && value.destinationTag !== null) {
    context.addIssue({
      code: "custom",
      path: ["destinationTag"],
      message: "Payer-only records cannot store a Destination Tag",
    });
  }
}

const draftSchema = draftObjectSchema.superRefine(addRoleTagIssue);
const recordSchema = draftObjectSchema
  .extend({
    id: z.string().min(1).max(128),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    lastUsedAt: z.union([z.iso.datetime(), z.null()]),
  })
  .superRefine(addRoleTagIssue);

const importSchema = z.object({
  schemaVersion: z.literal(SAVED_WALLET_SCHEMA_VERSION),
  exportedAt: z.iso.datetime(),
  wallets: z.array(recordSchema).max(SAVED_WALLET_MAX_RECORDS),
});

const DB_NAME = "xrpl-group-pay-saved-wallets";
const DB_VERSION = 1;
const STORE_NAME = "wallets";
const NETWORK_ADDRESS_INDEX = "network-address";

function normalizeDestinationTag(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function mergeSavedWalletRoles(
  left: SavedWalletRole,
  right: SavedWalletRole,
): SavedWalletRole {
  return left === right ? left : "both";
}

export function validateSavedWalletDraft(input: SavedWalletDraft): SavedWalletDraft {
  const normalized = {
    ...input,
    label: input.label.trim(),
    classicAddress: input.classicAddress.trim(),
    destinationTag: normalizeDestinationTag(input.destinationTag),
  };
  const result = draftSchema.safeParse(normalized);
  if (!result.success) {
    throw new SavedWalletStorageError(
      "invalid_record",
      result.error.issues[0]?.message ?? "Invalid saved wallet",
    );
  }
  return result.data;
}

export function validateSavedWalletRecord(input: unknown): SavedWalletRecord {
  const result = recordSchema.safeParse(input);
  if (!result.success) {
    throw new SavedWalletStorageError(
      "invalid_record",
      result.error.issues[0]?.message ?? "Invalid saved wallet record",
    );
  }
  return result.data;
}

export function parseSavedWalletImport(text: string): SavedWalletImportPayload {
  if (new TextEncoder().encode(text).byteLength > SAVED_WALLET_MAX_IMPORT_BYTES) {
    throw new SavedWalletStorageError(
      "too_large",
      "Saved-wallet import is too large",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new SavedWalletStorageError(
      "invalid_import",
      "Saved-wallet import is not valid JSON",
      { cause: error },
    );
  }

  const result = importSchema.safeParse(parsed);
  if (!result.success) {
    const tooMany =
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as { wallets?: unknown }).wallets) &&
      (parsed as { wallets: unknown[] }).wallets.length >
        SAVED_WALLET_MAX_RECORDS;
    throw new SavedWalletStorageError(
      tooMany ? "too_many_records" : "invalid_import",
      result.error.issues[0]?.message ?? "Saved-wallet import is invalid",
    );
  }

  const identities = new Set<string>();
  for (const record of result.data.wallets) {
    const key = `${record.network}:${record.classicAddress}`;
    if (identities.has(key)) {
      throw new SavedWalletStorageError(
        "invalid_import",
        "Saved-wallet import contains duplicate network and address pairs",
      );
    }
    identities.add(key);
  }

  return result.data;
}

export function serializeSavedWalletExport(
  records: SavedWalletRecord[],
  exportedAt = new Date().toISOString(),
) {
  const payload: SavedWalletImportPayload = {
    schemaVersion: SAVED_WALLET_SCHEMA_VERSION,
    exportedAt,
    wallets: records.map(validateSavedWalletRecord),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function storageError(error: unknown): SavedWalletStorageError {
  if (error instanceof SavedWalletStorageError) return error;
  if (error instanceof DOMException && error.name === "QuotaExceededError") {
    return new SavedWalletStorageError(
      "quota",
      "Browser storage quota was exceeded",
      { cause: error },
    );
  }
  return new SavedWalletStorageError("unknown", "Saved-wallet storage failed", {
    cause: error,
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), {
      once: true,
    });
    transaction.addEventListener("error", () => reject(transaction.error), {
      once: true,
    });
  });
}

function openSavedWalletDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new SavedWalletStorageError(
        "unavailable",
        "IndexedDB is unavailable in this browser context",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.addEventListener(
      "upgradeneeded",
      () => {
        const database = request.result;
        const store = database.objectStoreNames.contains(STORE_NAME)
          ? request.transaction!.objectStore(STORE_NAME)
          : database.createObjectStore(STORE_NAME, { keyPath: "id" });
        if (!store.indexNames.contains(NETWORK_ADDRESS_INDEX)) {
          store.createIndex(
            NETWORK_ADDRESS_INDEX,
            ["network", "classicAddress"],
            { unique: true },
          );
        }
      },
      { once: true },
    );
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () =>
        reject(
          new SavedWalletStorageError(
            "unavailable",
            "Unable to open browser-local saved wallets",
            { cause: request.error },
          ),
        ),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () =>
        reject(
          new SavedWalletStorageError(
            "unavailable",
            "Saved-wallet database upgrade is blocked by another tab",
          ),
        ),
      { once: true },
    );
  });
}

export async function listSavedWallets(): Promise<SavedWalletRecord[]> {
  let database: IDBDatabase | null = null;
  try {
    database = await openSavedWalletDatabase();
    const transaction = database.transaction(STORE_NAME, "readonly");
    const done = transactionComplete(transaction);
    const records = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<unknown[]>,
    );
    await done;
    return records
      .map(validateSavedWalletRecord)
      .sort((left, right) => {
        if (left.favorite !== right.favorite) return left.favorite ? -1 : 1;
        const leftTime = left.lastUsedAt ?? left.updatedAt;
        const rightTime = right.lastUsedAt ?? right.updatedAt;
        return rightTime.localeCompare(leftTime);
      });
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}

export async function saveSavedWallet(
  draftInput: SavedWalletDraft,
  options: { replaceRole?: boolean } = {},
): Promise<{ record: SavedWalletRecord; created: boolean }> {
  const draft = validateSavedWalletDraft(draftInput);
  let database: IDBDatabase | null = null;
  try {
    database = await openSavedWalletDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionComplete(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index(NETWORK_ADDRESS_INDEX);
    const existingRaw = await requestResult(
      index.get([draft.network, draft.classicAddress]) as IDBRequest<unknown>,
    );
    const existing = existingRaw ? validateSavedWalletRecord(existingRaw) : null;
    const now = new Date().toISOString();
    const role =
      existing && !options.replaceRole
        ? mergeSavedWalletRoles(existing.role, draft.role)
        : draft.role;
    const destinationTag =
      role === "payer"
        ? null
        : draft.role === "payer" && existing
          ? existing.destinationTag
          : draft.destinationTag;
    const record: SavedWalletRecord = existing
      ? {
          ...existing,
          ...draft,
          role,
          destinationTag,
          updatedAt: now,
        }
      : {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
          lastUsedAt: null,
        };
    store.put(record);
    await done;
    return { record, created: existing === null };
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}

export async function markSavedWalletUsed(id: string): Promise<void> {
  let database: IDBDatabase | null = null;
  try {
    database = await openSavedWalletDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionComplete(transaction);
    const store = transaction.objectStore(STORE_NAME);
    const raw = await requestResult(store.get(id) as IDBRequest<unknown>);
    if (raw) {
      const record = validateSavedWalletRecord(raw);
      store.put({
        ...record,
        lastUsedAt: new Date().toISOString(),
      } satisfies SavedWalletRecord);
    }
    await done;
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}

export async function deleteSavedWallet(id: string): Promise<void> {
  let database: IDBDatabase | null = null;
  try {
    database = await openSavedWalletDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionComplete(transaction);
    transaction.objectStore(STORE_NAME).delete(id);
    await done;
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}

export async function clearSavedWallets(): Promise<void> {
  let database: IDBDatabase | null = null;
  try {
    database = await openSavedWalletDatabase();
    const transaction = database.transaction(STORE_NAME, "readwrite");
    const done = transactionComplete(transaction);
    transaction.objectStore(STORE_NAME).clear();
    await done;
  } catch (error) {
    throw storageError(error);
  } finally {
    database?.close();
  }
}

export async function importSavedWallets(
  payload: SavedWalletImportPayload,
): Promise<{ created: number; updated: number }> {
  const validated = parseSavedWalletImport(JSON.stringify(payload));
  let created = 0;
  let updated = 0;
  for (const record of validated.wallets) {
    const result = await saveSavedWallet(
      {
        label: record.label,
        classicAddress: record.classicAddress,
        destinationTag: record.destinationTag,
        role: record.role,
        network: record.network,
        favorite: record.favorite,
      },
      { replaceRole: true },
    );
    if (result.created) created += 1;
    else updated += 1;
  }
  return { created, updated };
}

export function savedWalletSupportsRole(
  record: SavedWalletRecord,
  role: "recipient" | "payer",
) {
  return record.role === "both" || record.role === role;
}
