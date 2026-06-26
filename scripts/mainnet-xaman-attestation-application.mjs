import { readCallbackDetails, readGitHubContext, requireText } from "./mainnet-xaman-attestation-context.mjs";
import { xamanAuthHeaders } from "./mainnet-xaman-attestation-http.mjs";

export function assertMainnetXamanAttestationConfig(config) {
  if (
    config?.schema_version !== 1 ||
    config?.network !== "mainnet" ||
    config?.api_base_url !== "https://xumm.app/api/v1/platform" ||
    config?.payload?.transaction_type !== "SignIn" ||
    config?.payload?.force_network !== "MAINNET" ||
    config?.payload?.submit !== false ||
    config?.payload?.expire_minutes !== 1
  ) {
    throw new Error("Mainnet Xaman attestation configuration is invalid.");
  }
}
