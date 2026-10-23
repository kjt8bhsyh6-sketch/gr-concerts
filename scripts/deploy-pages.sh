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
WRAP=$(mktemp -d)
trap 'rm -rf "$WRAP"' EXIT
echo '{"name":"cf-pages-deploy"}' > "$WRAP/package.json"
mkdir -p "$WRAP/node_modules/.cache/wrangler" "$WRAP/dist"
DIST="$WRAP/dist"
git archive "$REF" | tar -x -C "$DIST"
rm -rf "$DIST/worker" "$DIST/scripts" "$DIST/.github" "$DIST/docs" "$DIST/EDITING.md"
WR="${WRANGLER:-$REPO/worker/node_modules/.bin/wrangler}"
[ -x "$WR" ] || WR="npx -y wrangler@4"
cd "$WRAP"
$WR pages deploy "$DIST" --project-name grhappenings --branch main --commit-hash "$REF" \
  --commit-message "$(git -C "$REPO" log -1 --format=%s "$REF" | cut -c1-300)"
