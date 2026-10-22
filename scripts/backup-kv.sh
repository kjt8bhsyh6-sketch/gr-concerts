#!/usr/bin/env bash
# Back up the grh-profiles KV namespace (profiles) to /home/box/business/backups/grhappenings/<YYYY-MM-DD>.json
# Output: {"namespace":..,"exported":..,"prefix":..,"count":N,"entries":[{"key":..,"value":..,"expiration":..}]}
# Default PREFIX="p:" = profiles only. Session (s:), sign-in link (t:/c:) and rate-limit (rl:) keys are short-lived
# credentials and are deliberately NOT backed up. PREFIX="" exports every key.
# File is chmod 600 in a 700 dir; only the newest KEEP (30) backups are kept.
# Env: CF_SECRETS (default /home/box/business/secrets/cloudflare.txt), BACKUP_DIR, KEEP, PREFIX, NAMESPACE_ID, WRANGLER, DATE.
# Restore one profile: wrangler kv key put --namespace-id <id> --remote "p:<email>" "<value>"
set -euo pipefail
umask 077
REPO="$(cd "$(dirname "$0")/.." && pwd)"
CF_SECRETS="${CF_SECRETS:-/home/box/business/secrets/cloudflare.txt}"
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] && [ -r "$CF_SECRETS" ]; then
  CLOUDFLARE_API_TOKEN=$(awk '/^api_token:/{print $2}' "$CF_SECRETS"); CLOUDFLARE_ACCOUNT_ID=$(awk '/^account_id:/{print $2}' "$CF_SECRETS")
  export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
fi
NS="${NAMESPACE_ID:-$(sed -nE 's/^id *= *"([0-9a-f]+)".*/\1/p' "$REPO/worker/wrangler.toml" | head -1)}"
[ -n "$NS" ] || { echo "no KV namespace id" >&2; exit 1; }
DIR="${BACKUP_DIR:-/home/box/business/backups/grhappenings}"
KEEP="${KEEP:-30}"
PREFIX="${PREFIX-p:}"
WR="${WRANGLER:-/workspace/cfdeploy/node_modules/.bin/wrangler}"
[ -x "${WR%% *}" ] || WR="npx -y wrangler@4"
STAMP="${DATE:-$(date +%F)}"
mkdir -p "$DIR"; chmod 700 "$DIR"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
$WR kv key list --namespace-id "$NS" --remote ${PREFIX:+--prefix "$PREFIX"} > "$TMP/keys.json"
node -e 'const k=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!Array.isArray(k))throw new Error("unexpected key list");for(const x of k)console.log(JSON.stringify(x))' "$TMP/keys.json" > "$TMP/keys.ndjson"
: > "$TMP/entries.ndjson"
while IFS= read -r line; do
  key=$(node -e 'console.log(JSON.parse(process.argv[1]).name)' "$line")
  $WR kv key get "$key" --namespace-id "$NS" --remote --text > "$TMP/val" 2>"$TMP/err" || { echo "failed to read one key (see wrangler error)" >&2; cat "$TMP/err" >&2; exit 1; }
  node -e 'const fs=require("fs");const m=JSON.parse(process.argv[1]);console.log(JSON.stringify({key:m.name,value:fs.readFileSync(process.argv[2],"utf8").replace(/\n$/,"") /* wrangler --text adds a newline */,expiration:m.expiration||null}))' "$line" "$TMP/val" >> "$TMP/entries.ndjson"
done < "$TMP/keys.ndjson"
OUT="$DIR/$STAMP.json"
node -e 'const fs=require("fs");const e=fs.readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean).map(JSON.parse);fs.writeFileSync(process.argv[2],JSON.stringify({namespace:process.argv[3],exported:new Date().toISOString(),prefix:process.argv[4],count:e.length,entries:e},null,1))' "$TMP/entries.ndjson" "$OUT.tmp" "$NS" "$PREFIX"
chmod 600 "$OUT.tmp"; mv -f "$OUT.tmp" "$OUT"
# keep only the newest $KEEP dated backups
ls -1 "$DIR" | grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}\.json$' | sort -r | tail -n +"$((KEEP + 1))" | while read -r f; do rm -f -- "$DIR/$f"; done
echo "backup: $(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).count)' "$OUT") keys -> $OUT"
