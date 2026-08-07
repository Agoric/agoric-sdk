#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

cp /usr/src/upgrade-test-scripts/eval_submission.js .
yarn node ./eval_submission.js

bundle_file=./bundle-ymax1-base.json
private_args_file=./privateArgsOverrides-ymax1-base.json

curl --fail --location --silent --show-error \
  --output "$bundle_file" \
  https://github.com/Agoric/agoric-sdk/releases/download/ymax-v0.3.2605-beta1/bundle-ymax0.json
curl --fail --location --silent --show-error \
  --output "$private_args_file" \
  https://github.com/Agoric/agoric-sdk/releases/download/ymax-v0.3.2604-beta1/privateArgsOverrides.json

sha256sum --check <<EOF
6eb97a6237622ffdc1b4bebb28c0b104ae8adba6b961b5189bd551b5002d5da6  $bundle_file
1c9643ddc5d508fc1fa8298493f9767ceaffa685eca2685096f4583c03836e61  $private_args_file
EOF

test "$(jq -r .endoZipBase64Sha512 "$bundle_file")" = \
  03d5ff17d1f29f8d1993525d0a9e82e6cd74b117a64cff64d3ca7e246bc69428d8e7d6947b69ee6bf37c024d16920490e684f83f263d6fed0c6ba875d57bf621

# shellcheck disable=SC2086
agd tx swingset install-bundle @"$bundle_file" \
  $SIGN_BROADCAST_OPTS --from validator
