# Controlled Mainnet acceptance authorization

XRPL Group Pay requires a temporary bearer authorization whenever the Mainnet deployment is both:

- `MAINNET_RELEASE_MODE=internal`; and
- `MAINNET_OPERATIONS_MODE=enabled` or `verify-only`.

This requirement protects the three production write paths used by the controlled XRP acceptance ceremony:

- `POST /api/bills`;
- `POST /api/payments/payload`;
- `POST /api/payments/verify`.

## Runtime contract

The operator generates a cryptographically random bearer value outside the repository and configures only its SHA-256 digest and a short deadline:

```text
MAINNET_ACCEPTANCE_AUTH_DIGEST=<64 lowercase or uppercase hexadecimal characters>
MAINNET_ACCEPTANCE_EXPIRES_AT=<ISO 8601 timestamp no more than 30 minutes ahead>
```

The raw bearer value remains only in the protected operator process. It must not be committed, printed in workflow logs, written to a public artifact, included in a pull request, or sent to the wallet provider.

Each controlled request supplies:

```text
Authorization: Bearer <raw temporary value>
```

The server hashes the supplied bearer value and compares it with the configured digest. Missing, malformed, or incorrect values return a generic HTTP 401 response. Missing, expired, oversized, or malformed runtime controls fail closed with HTTP 503.

The payment-operations layer independently enforces the same deadline. Once the deadline passes, both creation and verification are reported and treated as halted even if an interrupted operator process has not yet redeployed the normal halted target.

## Isolation

- Testnet does not require these controls and rejects temporary Mainnet values as configuration contamination.
- Halted Mainnet does not require a bearer value or deadline because the payment-operations kill switch already rejects creation and verification.
- A future `limited` or `public` Mainnet release does not inherit the temporary acceptance requirement.
- Network mismatch fails closed.

## Ordering

Authorization is checked before request bodies containing Bill details, payment capabilities, or wallet request identifiers are read. The payment-operations guard remains independent and is still checked before D1, Xaman, XRPL, or settlement access.

## Cleanup

After the acceptance attempt, the Worker must be restored to `MAINNET_OPERATIONS_MODE=halted` and redeployed without `MAINNET_ACCEPTANCE_AUTH_DIGEST` or `MAINNET_ACCEPTANCE_EXPIRES_AT`. The raw bearer value and all temporary operator files must then be destroyed.
