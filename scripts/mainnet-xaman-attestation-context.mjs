import { createHash } from "node:crypto";

const SHA = /^[0-9a-f]{40}$/;
const RUN_ID = /^\d+$/;
const REPOSITORY = "badjoke-lab/xrpl-group-pay";
const SERVER_URL = "https://github.com";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function requireText(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required.`);
  }
  return value.trim();
}

export function readCallbackDetails(raw) {
  const parsed = new URL(requireText(raw, "MAINNET_XAMAN_CALLBACK_URL"));
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname === "localhost" ||
    parsed.hostname === "127.0.0.1" ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.search
  ) {
    throw new Error(
      "The Xaman callback must be a non-local HTTPS URL without credentials, query, or fragment.",
    );
  }
  return {
    href: parsed.href,
    origin: parsed.origin,
    pathDigest: sha256(parsed.pathname),
  };
}

export function readGitHubContext(environment) {
  const gitSha = requireText(environment.GITHUB_SHA, "GITHUB_SHA");
  const runId = requireText(environment.GITHUB_RUN_ID, "GITHUB_RUN_ID");
  const repository = requireText(
    environment.GITHUB_REPOSITORY,
    "GITHUB_REPOSITORY",
  );
  const serverUrl = requireText(
    environment.GITHUB_SERVER_URL,
    "GITHUB_SERVER_URL",
  );
  if (!SHA.test(gitSha)) throw new Error("GITHUB_SHA must be a commit SHA.");
  if (!RUN_ID.test(runId)) throw new Error("GITHUB_RUN_ID must be numeric.");
  if (repository !== REPOSITORY || serverUrl !== SERVER_URL) {
    throw new Error("The Xaman attestation must run in the canonical repository.");
  }
  return {
    gitSha,
    runId,
    workflowRunUrl: `${serverUrl}/${repository}/actions/runs/${runId}`,
  };
}
