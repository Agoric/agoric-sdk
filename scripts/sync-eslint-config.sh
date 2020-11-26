#!/bin/bash
set -ueo pipefail
DIR=$(dirname -- "${BASH_SOURCE[0]}")
cd -- "$DIR/.."

find packages -depth 1 | while read NAME; do
  HASH=$(
    jq \
      --argfile eslintConfig eslint-config-template.json \
      '. + {$eslintConfig}' \
      "$NAME/package.json" |
      git hash-object -w --stdin
  )
  git cat-file blob "$HASH" > "$NAME/package.json"
done
