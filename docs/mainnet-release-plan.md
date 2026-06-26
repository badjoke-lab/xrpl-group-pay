# Mainnet Release Plan

XRPL Group Pay uses an ordered, fail-closed Mainnet release plan. The plan records the current stage, accepted foundations, remaining evidence, staged target, and safe reset values.

The machine-readable source is `config/mainnet-release-plan.json`.

## Current state

The release remains blocked. The accepted foundations are:

- production and preview D1 provisioning;
- deterministic Mainnet Source Tag assignment;
- production-equivalent operational stop drill.

The current stage is production Xaman provider attestation.

## Ordered stages

1. **Foundations** — D1, Source Tag assignment, and operational stop drill.
2. **Provider attestation** — production Xaman credentials, forced Mainnet request behavior, callback handling, status lookup, and secret exclusion.
3. **Halted deployment review** — review a non-local HTTPS public URL and the production configuration while payment operations remain halted.
4. **Live XRP acceptance** — controlled XRP payment with validated-ledger and durable receipt evidence.
5. **Live RLUSD acceptance** — controlled official RLUSD payment with recipient-readiness, validated-ledger, and durable receipt evidence.
6. **Final release audit** — require all seven release-evidence records before changing the final gate decision.

Stages cannot be skipped. The first unresolved evidence record determines the current stage.

## Staged target

The plan describes, but does not commit, the first production target:

- XRPL network: Mainnet;
- database binding: `PAYMENTS_DB_MAINNET`;
- Source Tag: `2171267705`;
- release mode: `internal`;
- payment operations: `halted`;
- public URL: required and must be non-local HTTPS.

A staged target is not permission to deploy. The current repository configuration remains closed.

## Safe reset

The plan fixes the reset state as:

```text
ALLOW_MAINNET_BUILD=false or unset
ALLOW_MAINNET_RUNTIME=false
MAINNET_GATE_APPROVED=false
MAINNET_SOURCE_TAG_APPROVED=false
MAINNET_RELEASE_MODE=disabled
MAINNET_OPERATIONS_MODE=halted
```

Any release review must preserve a direct path back to this state.

## Validation

`pnpm check:mainnet-release-plan` verifies:

- all seven release-evidence records exist;
- the current stage matches the first unresolved evidence record;
- accepted foundations and remaining evidence are current;
- stage positions and statuses are ordered correctly;
- open acceptance findings exactly match remaining evidence;
- the Mainnet gate lists every current blocker and no resolved blocker;
- committed Wrangler values remain closed;
- the staged Source Tag matches the deterministic assignment;
- the safe reset remains complete.

The validator is included in normal builds, full validation, and the Mainnet deployment command.

## Current blocker set

The current unresolved requirements are:

- production release configuration review;
- production Xaman provider attestation;
- live Mainnet XRP acceptance;
- live Mainnet RLUSD acceptance.

No Mainnet runtime, deployment, payment creation, or transaction is performed by this plan.
