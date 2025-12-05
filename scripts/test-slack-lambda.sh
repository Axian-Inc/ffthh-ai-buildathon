#!/usr/bin/env bash
set -euo pipefail

# Fill these before running
FUNCTION_URL="${FUNCTION_URL:-your-function-url/}"
SIGNING_SECRET="${SIGNING_SECRET:-replace-with-slack-signing-secret}"

if [[ "${FUNCTION_URL}" == *"your-function-url"* || "${SIGNING_SECRET}" == "replace-with-slack-signing-secret" ]]; then
  echo "Please set FUNCTION_URL and SIGNING_SECRET before running."
  exit 1
fi

# Payload options: url_verification (simple echo) or message event simulation.
payload_type="${1:-url_verification}"

case "${payload_type}" in
  url_verification)
    BODY='{"type":"url_verification","challenge":"test-challenge"}'
    ;;
  message)
    BODY='{"type":"event_callback","event":{"type":"message","user":"U123","text":"hello from curl","channel":"C0A10GYDQ6T","ts":"123.456"}}'
    ;;
  *)
    echo "Unknown payload type: ${payload_type}. Use url_verification or message."
    exit 1
    ;;
esac

TS=$(date +%s)
BASE="v0:${TS}:${BODY}"
SIG_HASH=$(printf '%s' "${BASE}" | openssl dgst -sha256 -hmac "${SIGNING_SECRET}" | awk '{print $2}')
SIG="v0=${SIG_HASH}"

echo "Sending ${payload_type} payload to ${FUNCTION_URL}"
curl -i -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Slack-Request-Timestamp: ${TS}" \
  -H "X-Slack-Signature: ${SIG}" \
  --data "${BODY}"
