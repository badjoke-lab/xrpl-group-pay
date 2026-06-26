# Mainnet Xaman Provider Attestation

The production Xaman Provider must be attested separately from the repository-level provider implementation. Repository tests prove request construction and network isolation; production attestation proves that the configured backend credentials and Xaman application behave as expected.

## What the attestation must prove

A valid attestation report must show all of the following:

- backend credentials successfully authenticated against the fixed Xaman Platform API origin;
- the Xaman application was enabled;
- the webhook URL returned by Xaman application metadata exactly matched the expected non-local HTTPS callback URL;
- a short-lived `SignIn` payload was accepted with `force_network: MAINNET` and `submit: false`;
- the initial payload status was unresolved and unsigned;
- the unresolved payload was cancelled;
- the terminal payload status was cancelled, expired, unresolved, and unsigned;
- no transaction hash, signed blob, or signer account appeared;
- no API credential, callback path, payload UUID, QR image, deeplink, or WebSocket URL entered the public artifact.

`callback_behavior_checked` records callback configuration alignment returned by the authenticated Xaman application metadata. It does not claim that a webhook delivery occurred. Delivery handling remains part of the later halted production deployment review.

Xaman documents `SignIn` as an off-ledger pseudo transaction type that cannot be submitted to the XRP Ledger. The probe therefore tests provider access and payload lifecycle behavior without creating a payment.

## Guarded workflow

`.github/workflows/attest-mainnet-xaman.yml` is manual-only and uses the protected GitHub Environment `mainnet-xaman-attestation`.

Configure these Environment secrets outside the repository:

- `MAINNET_XAMAN_API_KEY`;
- `MAINNET_XAMAN_API_SECRET`;
- `MAINNET_XAMAN_CALLBACK_URL`.

The callback value must be the exact non-local HTTPS webhook URL configured in the Xaman Developer Console. The full path is never written to the public report.

Run the workflow from the default branch with this exact confirmation:

```text
ATTEST XRPL GROUP PAY XAMAN MAINNET
```

The workflow has read-only repository permissions, validates that the release plan is currently at `provider-attestation`, performs one `ping`, creates one short-lived `SignIn`, retrieves its status, cancels it, retrieves the terminal status, and uploads a seven-day public-safe artifact.

The workflow does not deploy the application, change repository files, enable Mainnet, request a payment signature, or submit an XRPL transaction.

## Public-safe report contract

The report imported by this repository contains only:

- the checked source commit;
- the canonical GitHub Actions run URL;
- the fixed Xaman Platform API origin;
- SHA-256 fingerprints for the Xaman application, callback path, and temporary payload reference;
- the public callback origin;
- explicit boolean results for credential, application, forced-network, callback configuration, status, cancellation, and non-submission checks;
- the candidate `production-provider-attestation` evidence patch.

The importer rejects reports containing raw credential fields, a callback URL, payload UUID, QR data, deeplink data, or WebSocket status data.

## Import procedure

Download the workflow artifact, create a branch from the exact commit recorded by the verified report, then run:

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

The repository now contains the request contract, guarded runner, manual workflow, public-safe report validator, and fail-closed importer. The real workflow still requires production credentials and the production callback URL to be configured in the protected GitHub Environment.

Until the workflow succeeds and its artifact is imported in a separate reviewed PR, `production-provider-attestation` remains pending.
