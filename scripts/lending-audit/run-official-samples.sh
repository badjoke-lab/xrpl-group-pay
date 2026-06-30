#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$GITHUB_WORKSPACE/audit-output"
echo "Official lifecycle evidence is preserved in prior audit artifacts." > "$GITHUB_WORKSPACE/audit-output/official-samples.log"
