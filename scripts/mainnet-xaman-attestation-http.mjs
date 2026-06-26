const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function xamanAuthHeaders(apiKey, apiSecret) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "X-API-Secret": apiSecret,
  };
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
    throw new Error(`${label} was rejected by Xaman with status ${response.status}.`);
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

export function assertSafeSignInStatus(body, phase) {
  const meta = body?.meta;
  const payload = body?.payload;
  const response = body?.response ?? {};
  if (!meta || typeof meta !== "object") {
    throw new Error(`Xaman ${phase} status is missing metadata.`);
  }
  if (meta.submit !== false || meta.resolved !== false || meta.signed !== false) {
    throw new Error(`Xaman ${phase} status is not a safe unresolved SignIn.`);
  }
  const transactionType =
    payload?.request_json?.TransactionType ?? payload?.tx_type;
  if (transactionType !== "SignIn") {
    throw new Error(`Xaman ${phase} status is not a SignIn payload.`);
  }
  if (response.txid != null || response.hex != null || response.account != null) {
    throw new Error(`Xaman ${phase} status contains ledger submission data.`);
  }
  return meta;
}

export function assertSafelyCancelled(body) {
  const meta = assertSafeSignInStatus(body, "cancelled");
  if (meta.cancelled !== true || meta.expired !== true) {
    throw new Error("Xaman payload was not safely cancelled and expired.");
  }
}
