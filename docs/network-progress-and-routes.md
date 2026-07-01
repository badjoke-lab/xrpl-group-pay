# XRPL Group Pay — Network-Aware Progress and Canonical Routes

**Status:** Active  
**Scope:** Current PR #134 progress and route behavior  
**Last reviewed:** 2026-07-01  
**Document class:** Public

## 1. Canonical public routes

The current capability routes are:

```text
/payment
/bill/progress
/proof
```

Newly generated payment and progress links use these routes.

The routes are not network names. The stored Bill, PaymentSlot, Asset Descriptor, Receipt Contract, and verified transaction determine the network and asset identity.

## 2. Legacy route compatibility

Previously issued routes remain accepted:

```text
/testnet/payment
/testnet/bill/progress
/testnet/proof
```

Legacy pages perform a browser-side redirect to the canonical route while preserving:

- the existing query string;
- the complete URL fragment;
- the capability token stored in the fragment.

The server cannot receive a URL fragment. Redirect construction therefore happens in the browser rather than through a server redirect that could silently drop the capability.

Legacy redirect pages are excluded from search indexing.

## 3. Progress network contract

Progress loading uses the Bill's stored network.

The server:

1. loads the Bill through the hashed management or read-only capability;
2. validates the Bill network as Testnet or Mainnet;
3. loads the Bill Settlement Asset;
4. requires the Asset Descriptor network to match the Bill network;
5. loads PaymentSlots belonging to that Bill;
6. requires every PaymentSlot asset to match the Bill asset and network;
7. joins verified receipts on the Bill network and transaction identifier;
8. fails closed on incomplete or mixed-network records.

No Testnet literal may decide Mainnet receipt lookup or Asset fallback behavior.

## 4. Progress presentation

The progress interface displays the network returned by the authorized Bill snapshot:

```text
XRPL Testnet
XRPL Mainnet
```

It does not infer the Bill network solely from the deployed hostname or a component name.

Asset amounts retain their own units:

- XRP uses XRP and compatible drops fields;
- RLUSD uses RLUSD units and never exposes those units as XRP drops.

## 5. Public proof links

Progress cards link verified XRP proof records through:

```text
/proof#token=<proof capability>
```

Proof availability still depends on the Receipt Contract and durable proof record. Route canonicalization does not broaden proof disclosure.

## 6. Capability privacy

Payment, management, read-only progress, and proof capabilities remain in URL fragments.

Rules:

- generated links never place capability values in query parameters;
- legacy redirects preserve fragments locally in the browser;
- redirect pages do not log or forward fragment values;
- canonical routes use the existing capability parsing and redaction boundaries;
- a route change does not change the capability role.

## 7. Compatibility exports

Legacy component names may remain as source-level re-exports while canonical components become network-neutral. A compatibility export does not imply Testnet-only runtime behavior.

## 8. Validation

Required coverage includes:

- Testnet XRP progress;
- Mainnet XRP progress;
- Testnet RLUSD progress;
- Mainnet RLUSD progress;
- Bill and Asset network mismatch rejection;
- receipt lookup joined on the Bill network;
- actual Mainnet and Testnet badges;
- canonical payment, progress, and proof links;
- legacy query and fragment preservation;
- read-only redaction and management-only identity fields;
- existing invalid-capability and retry behavior.
