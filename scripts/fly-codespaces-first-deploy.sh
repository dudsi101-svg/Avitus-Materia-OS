#!/usr/bin/env bash
set -Eeuo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-avitus-materia-db}"
API_APP="${API_APP:-avitus-materia-api}"
WEB_APP="${WEB_APP:-avitus-materia-web}"
FLY_ORG="${FLY_ORG:-personal}"
MPG_DATABASE="${MPG_DATABASE:-fly-db}"
MPG_USERNAME="${MPG_USERNAME:-fly-user}"
ORGANIZATION_ID="${ORGANIZATION_ID:-f0e990a7-e27c-4308-b4b6-d619e68c2270}"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

resolve_fly() {
  if command -v flyctl >/dev/null 2>&1; then
    FLY="flyctl"
    return
  fi
  if command -v fly >/dev/null 2>&1; then
    FLY="fly"
    return
  fi

  log "flyctl not found; installing with the official Fly.io installer"
  curl -L https://fly.io/install.sh | sh
  export FLYCTL_INSTALL="${FLYCTL_INSTALL:-$HOME/.fly}"
  export PATH="$FLYCTL_INSTALL/bin:$PATH"

  if command -v flyctl >/dev/null 2>&1; then
    FLY="flyctl"
  elif command -v fly >/dev/null 2>&1; then
    FLY="fly"
  else
    fail "flyctl installation finished but the command is still unavailable. Open a new terminal and run this script again."
  fi
}

json_find_cluster_id() {
  node -e '
let input="";
process.stdin.setEncoding("utf8");
process.stdin.on("data", d => input += d);
process.stdin.on("end", () => {
  const parsed = JSON.parse(input);
  const items = Array.isArray(parsed) ? parsed : (parsed.clusters ?? [parsed]);
  const found = items.find(x => x && x.name === process.argv[1]);
  if (!found?.id) process.exit(2);
  process.stdout.write(String(found.id));
});
' "$CLUSTER_NAME"
}

json_has_secret() {
  node -e '
let input="";
process.stdin.setEncoding("utf8");
process.stdin.on("data", d => input += d);
process.stdin.on("end", () => {
  const parsed = JSON.parse(input);
  const items = Array.isArray(parsed) ? parsed : (parsed.secrets ?? [parsed]);
  process.exit(items.some(x => x && x.name === process.argv[1]) ? 0 : 1);
});
' "$1"
}

ensure_app() {
  local app="$1"
  if "$FLY" status -a "$app" >/dev/null 2>&1; then
    log "Fly app already exists: $app"
    return
  fi

  log "Creating Fly app: $app in organization $FLY_ORG"
  "$FLY" apps create "$app" --org "$FLY_ORG" || fail "Could not create '$app'. The global Fly app name may already be taken or the organization may be inaccessible."
}

resolve_fly

log "Checking Fly authentication"
if ! "$FLY" auth whoami; then
  log "Fly login required. Complete browser authentication, then return to this terminal."
  "$FLY" auth login
  "$FLY" auth whoami >/dev/null || fail "Fly authentication did not complete."
fi

log "Using Fly organization: $FLY_ORG"
"$FLY" orgs show "$FLY_ORG" >/dev/null || fail "Fly organization '$FLY_ORG' is not available to the authenticated user."

log "Finding Managed Postgres cluster: $CLUSTER_NAME"
CLUSTERS_JSON="$($FLY mpg list --org "$FLY_ORG" --json)" || fail "Could not list Fly Managed Postgres clusters in organization '$FLY_ORG'."
CLUSTER_ID="$(printf '%s' "$CLUSTERS_JSON" | json_find_cluster_id)" || fail "Managed Postgres cluster '$CLUSTER_NAME' was not found in Fly organization '$FLY_ORG'."
printf 'Using cluster %s (%s)\n' "$CLUSTER_NAME" "$CLUSTER_ID"

ensure_app "$API_APP"
ensure_app "$WEB_APP"

log "Checking database attachment"
SECRETS_JSON="$($FLY secrets list -a "$API_APP" --json 2>/dev/null || printf '[]')"
if printf '%s' "$SECRETS_JSON" | json_has_secret "DATABASE_URL"; then
  printf 'DATABASE_URL already exists on %s; skipping database attach.\n' "$API_APP"
else
  "$FLY" mpg attach "$CLUSTER_ID" -a "$API_APP" -d "$MPG_DATABASE" -u "$MPG_USERNAME" || fail "Managed Postgres attach failed."
fi

log "Generating and storing production secrets"
INQUIRY_SECRET="$(node -e 'const c=require("crypto"); process.stdout.write(c.randomBytes(48).toString("base64url"))')"

"$FLY" secrets set \
  "PUBLIC_INQUIRY_ORGANIZATION_ID=$ORGANIZATION_ID" \
  "PUBLIC_INQUIRY_API_KEY=$INQUIRY_SECRET" \
  -a "$API_APP" >/dev/null || fail "Could not set API secrets."

"$FLY" secrets set \
  "AVITUS_API_URL=http://$API_APP.internal:4000" \
  "PUBLIC_INQUIRY_API_KEY=$INQUIRY_SECRET" \
  -a "$WEB_APP" >/dev/null || fail "Could not set web secrets."

unset INQUIRY_SECRET

log "Deploying API"
"$FLY" deploy -c fly.api.toml -a "$API_APP" || fail "API deployment failed."

log "Waiting for API readiness"
API_READY="https://$API_APP.fly.dev/ready"
ready=0
for _ in $(seq 1 20); do
  if curl --fail --silent --show-error "$API_READY" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 6
done
[[ "$ready" -eq 1 ]] || fail "API did not become ready at $API_READY"
printf 'API ready: %s\n' "$API_READY"

log "Deploying public web"
"$FLY" deploy -c fly.web.toml -a "$WEB_APP" || fail "Web deployment failed."

log "Checking public web"
WEB_URL="https://$WEB_APP.fly.dev"
web_ok=0
for _ in $(seq 1 20); do
  if curl --fail --silent --show-error "$WEB_URL" >/dev/null 2>&1; then
    web_ok=1
    break
  fi
  sleep 6
done
[[ "$web_ok" -eq 1 ]] || fail "Web did not become reachable at $WEB_URL"

printf '\nDeployment completed successfully.\n'
printf 'API: %s\n' "https://$API_APP.fly.dev"
printf 'Web: %s\n' "$WEB_URL"
printf 'Production organization UUID: %s\n' "$ORGANIZATION_ID"
printf 'The inquiry secret was generated in memory and stored directly in Fly Secrets.\n'
printf 'Next: submit one test inquiry, then configure custom domains/home.pl DNS.\n'
