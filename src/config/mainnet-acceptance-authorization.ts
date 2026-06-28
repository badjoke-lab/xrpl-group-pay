import { z } from "zod";

const digestSchema = z.string().regex(/^[a-f0-9]{64}$/i);
const rawEnvironmentSchema = z.object({
  APP_NETWORK: z.enum(["testnet", "mainnet"]).optional(),
  NEXT_PUBLIC_APP_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  MAINNET_RELEASE_MODE: z
    .enum(["disabled", "internal", "limited", "public"])
    .default("disabled"),
  MAINNET_OPERATIONS_MODE: z
    .enum(["halted", "verify-only", "enabled"])
    .optional(),
  MAINNET_ACCEPTANCE_AUTH_DIGEST: digestSchema.optional(),
  MAINNET_ACCEPTANCE_EXPIRES_AT: z.string().datetime().optional(),
});

const bearerTokenPattern = /^[A-Za-z0-9_-]{43,128}$/;
const MAX_INTERNAL_WINDOW_MILLISECONDS = 30 * 60 * 1000;

export class MainnetAcceptanceAuthorizationError extends Error {
  readonly code = "MAINNET_ACCEPTANCE_UNAUTHORIZED" as const;

  constructor() {
    super("Controlled Mainnet acceptance authorization is required.");
    this.name = "MainnetAcceptanceAuthorizationError";
  }
}

export class MainnetAcceptanceAuthorizationConfigurationError extends Error {
  readonly code = "MAINNET_ACCEPTANCE_AUTH_UNAVAILABLE" as const;

  constructor() {
    super("Controlled Mainnet acceptance authorization is not configured safely.");
    this.name = "MainnetAcceptanceAuthorizationConfigurationError";
  }
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match || !bearerTokenPattern.test(match[1])) {
    throw new MainnetAcceptanceAuthorizationError();
  }
  return match[1];
}

export type MainnetAcceptanceAuthorizationState = {
  required: boolean;
  network: "testnet" | "mainnet";
  releaseMode: "disabled" | "internal" | "limited" | "public";
  operationsMode: "halted" | "verify-only" | "enabled";
  expiresAt: string | null;
};

export async function assertMainnetAcceptanceAuthorized(
  request: Request,
  environment: Record<string, string | undefined> = process.env,
  now = new Date(),
): Promise<MainnetAcceptanceAuthorizationState> {
  const parsed = rawEnvironmentSchema.safeParse(environment);
  if (!parsed.success || !Number.isFinite(now.getTime())) {
    throw new MainnetAcceptanceAuthorizationConfigurationError();
  }

  const network =
    parsed.data.APP_NETWORK ?? parsed.data.NEXT_PUBLIC_APP_NETWORK;
  if (network !== parsed.data.NEXT_PUBLIC_APP_NETWORK) {
    throw new MainnetAcceptanceAuthorizationConfigurationError();
  }

  const operationsMode = parsed.data.MAINNET_OPERATIONS_MODE ?? "halted";
  const controlled =
    network === "mainnet" &&
    parsed.data.MAINNET_RELEASE_MODE === "internal" &&
    operationsMode !== "halted";
  const expectedDigest = parsed.data.MAINNET_ACCEPTANCE_AUTH_DIGEST;
  const expiresAt = parsed.data.MAINNET_ACCEPTANCE_EXPIRES_AT;

  if (!controlled) {
    if (expectedDigest !== undefined || expiresAt !== undefined) {
      throw new MainnetAcceptanceAuthorizationConfigurationError();
    }
    return {
      required: false,
      network,
      releaseMode: parsed.data.MAINNET_RELEASE_MODE,
      operationsMode,
      expiresAt: null,
    };
  }

  if (!expectedDigest || !expiresAt) {
    throw new MainnetAcceptanceAuthorizationConfigurationError();
  }
  const deadline = new Date(expiresAt).getTime();
  const current = now.getTime();
  if (
    !Number.isFinite(deadline) ||
    deadline <= current ||
    deadline - current > MAX_INTERNAL_WINDOW_MILLISECONDS
  ) {
    throw new MainnetAcceptanceAuthorizationConfigurationError();
  }

  const actualDigest = await sha256Hex(bearerToken(request));
  if (!constantTimeEqual(actualDigest, expectedDigest.toLowerCase())) {
    throw new MainnetAcceptanceAuthorizationError();
  }

  return {
    required: true,
    network,
    releaseMode: parsed.data.MAINNET_RELEASE_MODE,
    operationsMode,
    expiresAt,
  };
}
