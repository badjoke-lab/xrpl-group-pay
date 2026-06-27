import { buildMainnetSignInAttestation } from "./mainnet-xaman-attestation-core.mjs";
import {
  assertCancellationResult,
  assertSafeSignInStatus,
  assertSafelyCancelled,
  readCreatedPayloadId,
  requestXamanJson,
} from "./mainnet-xaman-attestation-http.mjs";

function buildSafeRequest() {
  const request = buildMainnetSignInAttestation();
  const keys = Object.keys(request).sort();
  const optionKeys = Object.keys(request.options ?? {}).sort();
  if (
    request.txjson?.TransactionType !== "SignIn" ||
    request.options?.force_network !== "MAINNET" ||
    keys.join(",") !== "options,txjson" ||
    optionKeys.join(",") !== "force_network"
  ) {
    throw new Error("The Mainnet Xaman SignIn request is unsafe.");
  }
  return request;
}

export async function probeMainnetXamanPayload({
  baseUrl,
  headers,
  fetcher,
}) {
  const request = buildSafeRequest();
  let payloadId = null;
  let cancellationCompleted = false;
  try {
    const created = await requestXamanJson(
      fetcher,
      `${baseUrl}/payload`,
      { method: "POST", headers, body: JSON.stringify(request) },
      "Xaman SignIn creation",
    );
    payloadId = readCreatedPayloadId(created);

    const initialStatus = await requestXamanJson(
      fetcher,
      `${baseUrl}/payload/${encodeURIComponent(payloadId)}`,
      { method: "GET", headers },
      "Xaman status lookup",
    );
    assertSafeSignInStatus(initialStatus, "initial");

    const cancellation = await requestXamanJson(
      fetcher,
      `${baseUrl}/payload/${encodeURIComponent(payloadId)}`,
      { method: "DELETE", headers },
      "Xaman cancellation",
    );
    assertCancellationResult(cancellation);
    cancellationCompleted = true;

    const finalStatus = await requestXamanJson(
      fetcher,
      `${baseUrl}/payload/${encodeURIComponent(payloadId)}`,
      { method: "GET", headers },
      "Xaman cancelled status lookup",
    );
    assertSafelyCancelled(finalStatus);
    return payloadId;
  } catch (error) {
    if (payloadId && !cancellationCompleted) {
      await requestXamanJson(
        fetcher,
        `${baseUrl}/payload/${encodeURIComponent(payloadId)}`,
        { method: "DELETE", headers },
        "Xaman cleanup cancellation",
      ).catch(() => null);
    }
    throw error;
  }
}
