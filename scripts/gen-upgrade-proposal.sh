#! /bin/bash
set -ueo pipefail

cat << 'EOF' 1>&2
------------------------------------------------------------------------
This script shows a command for a software upgrade proposal which is
compatible with the Cosmovisor found at:
https://github.com/agoric-labs/cosmos-sdk/tree/Agoric/cosmovisor#readme
------------------------------------------------------------------------
EOF

UPGRADE_TO="${1:-HEAD}"
COMMIT_ID=$(git rev-parse "$UPGRADE_TO")
ZIP_URL="https://github.com/Agoric/agoric-sdk/archive/${COMMIT_ID}.zip"

echo "Verifying archive is at $ZIP_URL..." 1>&2
curl -fLI --no-progress-meter "$ZIP_URL" -o- > /dev/null

echo "Generating SHA-256 checksum..." 1>&2
CHECKSUM=sha256:$(curl -fL "$ZIP_URL" -o- | shasum -a 256 | cut -d' ' -f1)

BINARY_URL="$ZIP_URL//agoric-sdk-${COMMIT_ID}?checksum=$CHECKSUM"
SOURCE_URL="$ZIP_URL?checksum=$CHECKSUM"
UPGRADE_INFO="{\"binaries\":{\"any\":\"$BINARY_URL\"},\"source\":\"$SOURCE_URL\"}"

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
