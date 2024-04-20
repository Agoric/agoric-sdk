#! /bin/bash
set -ueo pipefail

cat << 'EOF' 1>&2
------------------------------------------------------------------------
This script shows a command for a software upgrade proposal which is
compatible with the Cosmovisor found at:
https://github.com/agoric-labs/cosmos-sdk/tree/Agoric/cosmovisor#readme
------------------------------------------------------------------------
EOF

COMMIT_ID=$(git rev-parse HEAD)
ZIP_URL="https://github.com/Agoric/agoric-sdk/archive/${COMMIT_ID}.zip"

echo "Verifying archive is at $ZIP_URL..." 1>&2
zipfile=$(mktemp)
trap 'rm -f "$zipfile"' EXIT
curl -L "$ZIP_URL" -o "$zipfile"

echo "Generating SHA-256 checksum..." 1>&2
CHECKSUM=sha256:$(shasum -a 256 "$zipfile" | cut -d' ' -f1)

UPGRADE_INFO="{\"binaries\":{\"any\":\"$ZIP_URL//agoric-sdk-${COMMIT_ID}?checksum=$CHECKSUM\"},\"source\":\"$ZIP_URL?checksum=$CHECKSUM\"}"

cat << 'EOF' 1>&2
------------------------------------------------------------------------
Here is the skeleton of the recomended upgrade proposal command.
You'll need to fill in the details and add arguments such as
`--chain-id=<chain id>` and `--from=<wallet>`.

Try `agd tx submit-proposal software-upgrade --help` for more info.

Also, take a look at existing on-chain software upgrade proposals for
examples: https://ping.pub/agoric/gov
------------------------------------------------------------------------
EOF

cat << EOF
agd tx submit-proposal software-upgrade <UPGRADE-NAME> \\
  --upgrade-info='$UPGRADE_INFO' \\
  --upgrade-height <HEIGHT> \\
  --title '<TITLE>' \\
  --description '<DESCRIPTION>' \\
  <TXOPTS>...
EOF
