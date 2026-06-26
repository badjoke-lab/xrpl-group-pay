# Mainnet Operational Stop Drill

XRPL Group Pay requires a production or production-equivalent drill before Mainnet release approval. The drill verifies the independent `MAINNET_OPERATIONS_MODE` kill switch without changing Cloudflare, Xaman, XRPL, D1, or production configuration.

## Verified behavior

The drill uses the actual payment-operation resolver and the actual API route handlers.

### Verify-only

- new wallet handoff creation returns HTTP `503` with `PAYMENT_OPERATIONS_HALTED`;
- the blocked creation path performs no downstream side effect;
- an already-submitted payment remains verifiable and may return a durable verified result;
- the public status endpoint reports `verification-only`, with creation disabled and verification enabled.

### Halted

- new wallet handoff creation returns HTTP `503`;
- payment verification returns HTTP `503`;
- neither blocked path performs a downstream side effect;
- the public status endpoint reports `halted`, with both operations disabled.

### Restore boundary

The drill reviews the `enabled` restore path in memory and proves that it would re-enable creation and verification. It does not apply that change. The committed Mainnet Wrangler target must remain `MAINNET_OPERATIONS_MODE=halted` when the report is generated.

A real restore therefore still requires a separate reviewed configuration change.

## GitHub Actions workflow

`.github/workflows/mainnet-operational-stop-drill.yml` runs automatically after relevant changes reach the default branch. It may also be dispatched manually with this exact confirmation:

```text
RUN XRPL GROUP PAY MAINNET STOP DRILL
```

The workflow:

1. requires the default branch;
2. validates the current blocked Mainnet evidence and acceptance state;
3. runs the production-equivalent drill;
4. writes a public-safe JSON report;
5. uploads the report as a seven-day artifact.

It has read-only repository permissions and uses no secrets.

## Report boundary

A verified report records:

- the source commit and canonical GitHub Actions run URL;
- production-equivalent environment identity;
- each verify-only and halted result;
- the reviewed but unapplied restore path;
- confirmation that external services were not called;
- confirmation that production state was not changed;
- a candidate `operational-stop-drill` evidence patch.

The workflow never updates release evidence automatically. A later reviewed PR must validate the artifact and update only the matching evidence record, acceptance control, and blocking finding.

## Release state

Passing this drill does not enable Mainnet. Runtime approval, provider attestation, Source Tag approval, live XRP acceptance, and live RLUSD acceptance remain independent requirements.
