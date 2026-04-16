#!/bin/sh
set -eu

ROOT_DIR=${1-}
if [ -z "$ROOT_DIR" ]; then
  SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
  ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
else
  ROOT_DIR="$(cd -- "$ROOT_DIR" && pwd)"
fi

VERSION="$(node -p "require('${ROOT_DIR}/package.json').packageManager.split('@')[1]")"
YARN_FILE="${ROOT_DIR}/.yarn/releases/yarn-${VERSION}.cjs"

if [ ! -f "$YARN_FILE" ]; then
  echo "Missing checked-in Yarn release: $YARN_FILE" >&2
  exit 1
fi

COREPACK_HOME="${COREPACK_HOME:-$HOME/.cache/node/corepack}"
COREPACK_YARN_DIR="${COREPACK_HOME}/v1/yarn/${VERSION}"
mkdir -p "$COREPACK_YARN_DIR"
cp "$YARN_FILE" "$COREPACK_YARN_DIR/yarn.js"

export COREPACK_YARN_DIR COREPACK_YARN_VERSION="$VERSION"
node - <<'EOF'
const fs = require('fs');
const crypto = require('crypto');

const yarnDir = process.env.COREPACK_YARN_DIR;
const version = process.env.COREPACK_YARN_VERSION;
const yarnPath = `${yarnDir}/yarn.js`;
const data = fs.readFileSync(yarnPath);
const hash = crypto.createHash('sha512').update(data).digest('base64');
const payload = {
  locator: { name: 'yarn', reference: version },
  bin: ['yarn', 'yarnpkg'],
  hash: `sha512.${hash}`,
};
fs.writeFileSync(`${yarnDir}/.corepack`, JSON.stringify(payload));
EOF

COREPACK_ENABLE_NETWORK=0 corepack enable
