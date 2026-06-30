#!/usr/bin/env bash
set -euo pipefail

rm -rf .audit-official
mkdir -p .audit-official

git clone --depth 1 https://github.com/XRPLF/xrpl-dev-portal.git .audit-official/dev-portal
cd .audit-official/dev-portal/_code-samples/lending-protocol/js

cat > package.json <<'JSON'
{
  "type": "module",
  "dependencies": {
    "xrpl": "latest"
  }
}
JSON
npm install --no-audit --no-fund

node lendingSetup.js
node coverDepositAndWithdraw.js
node coverClawback.js
node loanPay.js

cp lendingSetup.json "$GITHUB_WORKSPACE/audit-output/official-lending-setup.json"
