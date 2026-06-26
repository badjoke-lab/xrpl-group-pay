import { buildMainnetSignInAttestation } from "./mainnet-xaman-attestation-core.mjs";
import {
  assertSafeSignInStatus,
  assertSafelyCancelled,
  readCreatedPayloadId,
  requestXamanJson,
} from "./mainnet-xaman-attestation-http.mjs";

function buildSafeRequest(runId, instruction) {
  const request = buildMainnetSignInAttestation(
    `xrpl-group-pay-mainnet-attestation-${runId}`,
    instruction,
  );
  if (
    request.txjson.TransactionType !== "SignIn" ||
    request.options.force_network !== "MAINNET" ||
    request.options.submit !== false ||
    request.options.expire !== 1
  ) {
    throw new Error("The Mainnet Xaman SignIn request is unsafe.");
  }
  return request;
}

export async function probeMainnetXamanPayload({
  baseUrl,
  headers,
  runId,
  instruction,
  fetcher,
}) {
  const request = buildSafeRequest(runId, instruction);
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

    await requestXamanJson(
      fetcher,
      `${baseUrl}/payload/${encodeURIComponent(payloadId)}`,
      { method: "DELETE", headers },
      "Xaman cancellation",
    );
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
