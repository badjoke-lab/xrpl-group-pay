# Mainnet Xaman Provider Attestation

The production Xaman Provider must be attested separately from the repository-level provider implementation. Repository tests prove request construction and network isolation; production attestation proves that the configured backend credentials and Xaman application behave as expected.

## What the attestation must prove

A valid attestation report must show all of the following:

- backend credentials successfully authenticated against the fixed Xaman Platform API origin;
- the Xaman application was enabled;
- the configured production webhook URL matched the expected non-local HTTPS callback URL;
- a short-lived `SignIn` payload was accepted with `force_network: MAINNET`;
- the payload could not submit a transaction to the XRP Ledger;
- the payload status could be retrieved;
- the unresolved payload was cancelled and its safe terminal status was retrieved;
- no API credential, callback path, payload UUID, QR image, deeplink, or WebSocket URL entered the public artifact.

Xaman documents `SignIn` as a pseudo transaction type that can never be submitted to the XRP Ledger. Payload options, including a forced network, are valid for `SignIn` requests. The production probe therefore tests provider access and lifecycle behavior without creating a payment.

## Public-safe report contract

The report imported by this repository contains only:

- the checked source commit;
- the canonical GitHub Actions run URL;
- the fixed Xaman Platform API origin;
- SHA-256 fingerprints for the Xaman application, callback path, and temporary payload reference;
- the public callback origin;
- explicit boolean results for credential, application, forced-network, callback, status, cancellation, and non-submission checks;
- the candidate `production-provider-attestation` evidence patch.

The importer rejects reports containing raw credential fields, a callback URL, payload UUID, QR data, deeplink data, or WebSocket status data.

## Import procedure

Create a branch from the exact commit recorded by the verified report, then run:

```bash
pnpm import:mainnet-xaman-evidence -- \
  --report /path/to/mainnet-xaman-attestation-report.json
```

The importer validates the report and updates only:

- the `production-provider-attestation` record in `config/mainnet-release-evidence.json`;
- the matching acceptance control in `config/mainnet-acceptance.json`;
- the matching `production-provider-not-attested` finding.

It leaves the overall release decision blocked and does not alter D1, release configuration, Source Tag, live XRP, live RLUSD, or operational-stop evidence.

## Current execution boundary

This repository change adds the safe request shape, report contract, and fail-closed importer. It does not authenticate to Xaman, create a remote payload, receive a webhook, deploy the application, or accept production provider evidence.

The real attestation run requires a reachable production callback endpoint and production Xaman credentials stored outside the repository. Until that run succeeds and its public-safe report is imported, `production-provider-attestation` remains pending.
