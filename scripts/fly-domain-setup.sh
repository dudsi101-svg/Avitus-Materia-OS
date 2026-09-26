#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${DOMAIN:-avitus-materia.com}"
WEB_APP="${WEB_APP:-avitus-materia-web}"
API_APP="${API_APP:-avitus-materia-api}"

resolve_fly() {
  if command -v flyctl >/dev/null 2>&1; then
    FLY="flyctl"
  elif command -v fly >/dev/null 2>&1; then
    FLY="fly"
  else
    echo "ERROR: flyctl/fly is not available in PATH." >&2
    exit 1
  fi
}

ensure_cert() {
  local app="$1"
  local host="$2"

  if "$FLY" certs list -a "$app" 2>/dev/null | grep -Fq "$host"; then
    printf 'Certificate request already exists: %s -> %s\n' "$host" "$app"
  else
    printf 'Requesting certificate: %s -> %s\n' "$host" "$app"
    "$FLY" certs add "$host" -a "$app"
  fi
}

resolve_fly
WWW_DOMAIN="www.$DOMAIN"
API_DOMAIN="api.$DOMAIN"

printf '\n=== Requesting / reusing Fly certificates ===\n'
ensure_cert "$WEB_APP" "$DOMAIN"
ensure_cert "$WEB_APP" "$WWW_DOMAIN"
ensure_cert "$API_APP" "$API_DOMAIN"

printf '\n=== DNS requirements: apex web ===\n'
"$FLY" certs setup "$DOMAIN" -a "$WEB_APP"

printf '\n=== DNS requirements: www ===\n'
"$FLY" certs setup "$WWW_DOMAIN" -a "$WEB_APP"

printf '\n=== DNS requirements: API ===\n'
"$FLY" certs setup "$API_DOMAIN" -a "$API_APP"

printf '\n=== Fly ingress IPs: WEB ===\n'
"$FLY" ips list -a "$WEB_APP"

printf '\n=== Fly ingress IPs: API ===\n'
"$FLY" ips list -a "$API_APP"

printf '\nNEXT STEP:\n'
printf '1. Copy the exact DNS requirements above into home.pl.\n'
printf '2. Do NOT modify MX, SPF, DKIM or DMARC records.\n'
printf '3. After DNS propagation, run:\n'
printf '   %s certs check %s -a %s\n' "$FLY" "$DOMAIN" "$WEB_APP"
printf '   %s certs check %s -a %s\n' "$FLY" "$WWW_DOMAIN" "$WEB_APP"
printf '   %s certs check %s -a %s\n' "$FLY" "$API_DOMAIN" "$API_APP"
