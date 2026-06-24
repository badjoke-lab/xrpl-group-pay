# Changelog Policy

**Status:** Active  
**Last reviewed:** 2026-06-24

`CHANGELOG.md` records meaningful completed changes. Planned work belongs in `ROADMAP.md`.

Use these categories:

```text
Added
Changed
Fixed
Security
Deprecated
Removed
```

Record changes to user-visible behavior, supported assets or wallets, languages, allocation, payment contracts, database compatibility, public proof, Mainnet operation, and material reliability controls.

Usually omit formatting, typo-only edits, test-only refactors, internal renames, and maintenance with no public or compatibility impact.

Every significant Pull Request states either:

```text
Changelog required
Changelog not required — reason
```

Describe merged behavior only. Do not claim planned support as available. Before a release, review Unreleased entries, assign a version and date, add required migration notes, and verify README and Roadmap claims.
