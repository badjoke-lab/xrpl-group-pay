const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;
const LONG_HEX_IN_TEXT = /\b[0-9a-f]{32,}\b/gi;
const URL_IN_TEXT = /https?:\/\/\S+/gi;

export function xamanAuthHeaders(apiKey, apiSecret) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-API-Secret": apiSecret,
  };
}

function publicXamanErrorDetail(body) {
  if (!body || typeof body !== "object") return "";
  const error = body.error;
  const rawCandidates = [
    typeof error === "object" && error ? error.code : null,
    typeof error === "object" && error ? error.reference : null,
    typeof error === "object" && error ? error.message : null,
    typeof error === "string" ? error : null,
    body.message,
  ];
  const detail = rawCandidates
    .filter((value) => typeof value === "string" || typeof value === "number")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(": ")
    .slice(0, 240)
    .replace(UUID_IN_TEXT, "[redacted-id]")
    .replace(LONG_HEX_IN_TEXT, "[redacted-token]")
    .replace(URL_IN_TEXT, "[redacted-url]");
  return detail ? ` (${detail})` : "";
}

export async function requestXamanJson(fetcher, url, init, label) {
  let response;
  try {
    response = await fetcher(url, {
      ...init,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(`${label} could not reach Xaman.`);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      `${label} was rejected by Xaman with status ${response.status}${publicXamanErrorDetail(body)}.`,
    );
  }
  if (!body || typeof body !== "object") {
    throw new Error(`${label} returned invalid JSON.`);
  }
  return body;
}

export function readEnabledApplication(ping) {
  const application = ping?.auth?.application ?? ping?.application;
  if (ping?.pong !== true || !application || typeof application !== "object") {
    throw new Error("Xaman ping did not return application details.");
  }
  if (!UUID.test(String(application.uuidv4 ?? ""))) {
    throw new Error("Xaman ping returned an invalid application identity.");
  }
  if (!(application.disabled === 0 || application.disabled === false)) {
    throw new Error("The Xaman application is disabled.");
  }
  return application;
}

export function readCreatedPayloadId(created) {
  const payloadId = String(created?.uuid ?? "");
  if (!UUID.test(payloadId)) {
    throw new Error("Xaman returned an invalid payload identity.");
  }
  return payloadId;
}

function hasLedgerValue(value) {
  if (value == null || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function assertSignInIdentityAndNoLedgerData(body, phase) {
  const meta = body?.meta;
  const payload = body?.payload;
  const response = body?.response ?? {};
  if (!meta || typeof meta !== "object") {
    throw new Error(`Xaman ${phase} status is missing metadata.`);
  }
  const transactionType =
    payload?.request_json?.TransactionType ?? payload?.tx_type;
  if (transactionType !== "SignIn") {
    throw new Error(`Xaman ${phase} status is not a SignIn payload.`);
  }
  if (
    hasLedgerValue(response.txid) ||
    hasLedgerValue(response.hex) ||
    hasLedgerValue(response.account)
  ) {
    throw new Error(`Xaman ${phase} status contains ledger submission data.`);
  }
  return meta;
}

export function assertSafeSignInStatus(body, phase) {
  const meta = assertSignInIdentityAndNoLedgerData(body, phase);
  if (meta.submit !== false || meta.resolved !== false || meta.signed !== false) {
    throw new Error(`Xaman ${phase} status is not a safe unresolved SignIn.`);
  }
  return meta;
}

export function assertCancellationResult(body) {
  const cancelled = body?.result?.cancelled;
  const reason = body?.result?.reason;
  if (
    cancelled !== true ||
    !["OK", "ALREADY_CANCELLED", "ALREADY_EXPIRED"].includes(reason)
  ) {
    throw new Error("Xaman did not confirm payload cancellation.");
  }
}
