#!/usr/bin/env bash
# Deploy origin/main to Cloudflare Pages project "grhappenings" (excludes worker/, scripts/, .github/).
# Needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in env, or reads them from $CF_SECRETS.
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
CF_SECRETS="${CF_SECRETS:-/home/box/business/secrets/cloudflare.txt}"
: "${CLOUDFLARE_API_TOKEN:=$(awk '/^api_token:/{print $2}' "$CF_SECRETS")}"
: "${CLOUDFLARE_ACCOUNT_ID:=$(awk '/^account_id:/{print $2}' "$CF_SECRETS")}"
export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
cd "$REPO"
git fetch -q origin main
REF=$(git rev-parse origin/main)
DIST=$(mktemp -d)
trap 'rm -rf "$DIST"' EXIT
git archive "$REF" | tar -x -C "$DIST"
rm -rf "$DIST/worker" "$DIST/scripts" "$DIST/.github" "$DIST/docs" "$DIST/EDITING.md"
WR="${WRANGLER:-/workspace/cfdeploy/node_modules/.bin/wrangler}"
[ -x "$WR" ] || WR="npx -y wrangler@4"
cd /workspace/cfdeploy 2>/dev/null || cd "$HOME"   # avoid read-only /node_modules cache
$WR pages deploy "$DIST" --project-name grhappenings --branch main --commit-hash "$REF" \
  --commit-message "$(git -C "$REPO" log -1 --format=%s "$REF" | cut -c1-300)"
