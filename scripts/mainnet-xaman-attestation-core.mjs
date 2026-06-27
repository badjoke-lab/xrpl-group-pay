export function buildMainnetSignInAttestation() {
  return {
    txjson: { TransactionType: "SignIn" },
    options: { force_network: "MAINNET" },
  };
}
