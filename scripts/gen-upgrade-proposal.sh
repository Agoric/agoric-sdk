#! /bin/bash
set -ueo pipefail

cat <<EOF 1>&2
------------------------------------------------------------
This script shows a command for a software upgrade proposal which is
compatible with the Cosmovisor found at:
https://github.com/agoric-labs/cosmos-sdk/tree/Agoric/cosmovisor#readme
------------------------------------------------------------
EOF

COMMIT_ID=$(git rev-parse HEAD)
ZIPURL=https://github.com/Agoric/agoric-sdk/archive/$COMMIT_ID.zip

echo "Verifying archive is at $ZIPURL..." 1>&2
zipfile=$(mktemp)
trap 'rm -f "$zipfile"' EXIT
curl -L "$ZIPURL" -o "$zipfile"

echo "Generating SHA-256 checksum..." 1>&2
checksum=sha256:$(shasum -a 256 "$zipfile" | cut -d' ' -f1)

info="{\"binaries\":{\"any\":\"$ZIPURL//agoric-sdk-$COMMIT_ID?checksum=$checksum\"},\"source\":\"$ZIPURL?checksum=$checksum\"}"

cat <<EOF 1>&2
------------------------------------------------------------
Here is the skeleton of the recomended upgrade proposal command.
You'll need to fill in the details.

Try \`agd tx submit-proposal software-upgrade --help\` for more info.

Also, take a look at existing on-chain software upgrade proposals for
examples.
------------------------------------------------------------
EOF

cat <<EOF
agd tx submit-proposal software-upgrade <UPGRADE-NAME> \\
  --upgrade-info='$info' \\
  --upgrade-height <HEIGHT> \\
  --title '<TITLE>' --description '<DESCRIPTION>' \\
  <TXOPTS>...
EOF
