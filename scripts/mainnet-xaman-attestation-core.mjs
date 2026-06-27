export function buildMainnetSignInAttestation(identifier, instruction) {
  return {
    txjson: { TransactionType: "SignIn" },
    options: {
      submit: false,
      expire: 5,
      force_network: "MAINNET",
    },
    custom_meta: { identifier, instruction },
  };
}
