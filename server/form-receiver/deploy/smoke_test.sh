#!/bin/sh
# Sends ONE clearly marked TEST lead to contact@clarvix.net through the public endpoint.
set -eu
URL="${1:-https://forms.clarvix.net}"
curl -fsS "$URL/healthz"; echo
curl -sS -X POST "$URL/v1/contact" \
  -H 'Content-Type: application/json' -H 'Origin: https://web.clarvix.net' \
  -d '{"name":"TEST Clarvix receiver","phone":"050-000-0000","email":"contact@clarvix.net","business_type":"other","responder_count":"1","has_existing_site":"no","plan":"not_sure","message":"TEST — prueba técnica del receptor. Ignorar.","company":""}' \
  -w '\nHTTP %{http_code}\n'
echo "Expected: HTTP 200 {\"ok\": true, ...} and an e-mail in contact@clarvix.net"
echo "Negative check (must be 403):"
curl -sS -o /dev/null -w 'HTTP %{http_code}\n' -X POST "$URL/v1/contact" -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{}'
