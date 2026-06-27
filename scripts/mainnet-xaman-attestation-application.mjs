import { readCallbackDetails, readGitHubContext, requireText } from "./mainnet-xaman-attestation-context.mjs";

export function assertMainnetXamanAttestationConfig(config) {
  if (
    config?.schema_version !== 1 ||
    config?.network !== "mainnet" ||
    config?.api_base_url !== "https://xumm.app/api/v1/platform" ||
    config?.payload?.transaction_type !== "SignIn" ||
    config?.payload?.force_network !== "MAINNET" ||
    config?.payload?.submit !== false ||
    config?.payload?.expire_minutes !== 5
  ) {
    throw new Error("Mainnet Xaman attestation configuration is invalid.");
  }
}

export function readMainnetXamanInputs(config, environment) {
  assertMainnetXamanAttestationConfig(config);
  const confirmationName = "MAINNET_XAMAN_ATTESTATION_CONFIRMATION";
  const confirmation = requireText(environment[confirmationName], confirmationName);
  if (confirmation !== config.confirmation) {
    throw new Error("Mainnet Xaman attestation confirmation does not match.");
  }
  return {
    callback: readCallbackDetails(environment.MAINNET_XAMAN_CALLBACK_URL),
    context: readGitHubContext(environment),
  };
}
