#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20 or newer is required. Install Node.js, then run this script again."
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$node_major" -lt 20 ]; then
  echo "Node.js 20 or newer is required. Your version is $(node --version)."
  exit 1
fi

echo "Judge the Model will open at http://localhost:8766/"
echo "Press Ctrl+C to stop the app."
exec node web/server.mjs
