# XRPL Group Pay — Pre-deployment finalization

**Status:** Mainnet acceptance approved; public operating deployment pending
**Scope:** Remaining work after merged application development and before public Mainnet release

## Work that can be completed without Cloudflare or a local terminal

The repository-side implementation, safety design, multilingual critical flow, public product surface, release documentation, and incident remediation are complete in merged code.

No additional feature implementation is required before the production deployment sequence unless CI or the final browser review exposes a defect.

## Work that requires a local terminal, Cloudflare access, Xaman, or a real browser

1. Check out the latest `main` and run the complete validation suite.
2. Build the Next.js application and Cloudflare Worker from the exact release commit.
3. Deploy the latest code to the production Worker in `halted` mode.
4. Apply production D1 migration `0014_payment_reconciliation_findings.sql`.
5. Verify the production D1 binding and Mainnet runtime configuration.
6. Run desktop and mobile browser smoke tests against the deployed production origin.
7. Perform a fresh controlled Mainnet RLUSD ceremony using a new Bill and new InvoiceIDs.
8. Confirm one-shot handoff reuse protection, duplicate settlement prevention, cross-slot replay rejection, and replacement reconciliation.
9. Restore `halted`, record public-safe evidence, and complete the final release audit.
10. Deploy the reviewed public operating configuration and repeat post-deployment smoke tests.

## Release decision

All acceptance items above passed. The repository gate is ready, while the deployed production Worker remains `internal + halted` until the separately reviewed public operating configuration is applied.

## Completion boundary

Pitch video capture, final deck export, and Source Tag metrics depend on the approved production release and final ledger range. Their content structure can be prepared in advance, but their final evidence values cannot be completed before production acceptance.
