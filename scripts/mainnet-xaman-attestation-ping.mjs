import { readCallbackDetails } from "./mainnet-xaman-attestation-context.mjs";
import { readEnabledApplication, requestXamanJson } from "./mainnet-xaman-attestation-http.mjs";

export async function inspectMainnetXamanApplication({
  baseUrl,
  callback,
  headers,
  fetcher,
}) {
  const ping = await requestXamanJson(
    fetcher,
    `${baseUrl}/ping`,
    { method: "GET", headers },
    "Xaman credential check",
  );
  const application = readEnabledApplication(ping);
  const configuredCallback = readCallbackDetails(application.webhookurl);
  if (configuredCallback.href !== callback.href) {
    throw new Error("The configured Xaman webhook does not match the expected callback.");
  }
  return String(application.uuidv4);
}
