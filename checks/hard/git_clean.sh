#!/usr/bin/env bash
set -euo pipefail

# Verifies that git working directory has no uncommitted changes
STATUS=$(git status --porcelain)
if [ -n "$STATUS" ]; then
  echo "❌ Git working directory is dirty:"
  echo "$STATUS"
  exit 1
fi

echo "✅ Git working directory is clean."
exit 0
