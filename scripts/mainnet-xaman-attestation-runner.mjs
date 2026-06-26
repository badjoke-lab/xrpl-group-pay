import { readMainnetXamanInputs } from "./mainnet-xaman-attestation-application.mjs";
import { probeMainnetXamanPayload } from "./mainnet-xaman-attestation-payload.mjs";
import { inspectMainnetXamanApplication } from "./mainnet-xaman-attestation-ping.mjs";
import { buildPublicMainnetXamanReport } from "./mainnet-xaman-attestation-public-report.mjs";

export async function runMainnetXamanAttestation({
  config,
  environment,
  headers,
  fetcher = fetch,
  now = () => new Date(),
}) {
  if (!headers || typeof headers !== "object") {
    throw new Error("Xaman request headers are required.");
  }
  const inputs = readMainnetXamanInputs(config, environment);
  const applicationId = await inspectMainnetXamanApplication({
    baseUrl: config.api_base_url,
    callback: inputs.callback,
    headers,
    fetcher,
  });
  const payloadId = await probeMainnetXamanPayload({
    baseUrl: config.api_base_url,
    headers,
    runId: inputs.context.runId,
    instruction: config.payload.instruction,
    fetcher,
  });
  return buildPublicMainnetXamanReport({
    context: inputs.context,
    applicationId,
    callback: inputs.callback,
    payloadId,
    generatedAt: now().toISOString(),
  });
}
