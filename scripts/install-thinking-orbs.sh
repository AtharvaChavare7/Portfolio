#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Installing thinking-orbs via npm..."

if npm install thinking-orbs; then
  echo "Installed to node_modules/thinking-orbs"
  exit 0
fi

echo
echo "npm failed. If you see UNABLE_TO_GET_ISSUER_CERT_LOCALLY, your network is"
echo "likely using a corporate TLS proxy. Try one of these, then re-run this script:"
echo
echo "  export NODE_EXTRA_CA_CERTS=\"/path/to/your-company-root-ca.pem\""
echo "  npm config set cafile \"/path/to/your-company-root-ca.pem\""
echo
echo "On macOS you can export system roots with:"
echo "  security find-certificate -a -p /System/Library/Keychains/SystemRootCertificates.keychain > .tmp-npm/system-cas.pem"
echo "  npm install thinking-orbs --cafile=.tmp-npm/system-cas.pem"
echo
echo "A vendored copy is already available at vendor/thinking-orbs/ for local use."
exit 1
