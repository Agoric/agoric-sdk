#!/bin/sh

export AGORIC_NET=ollinet

KEY=$1

if [ -z "$KEY" ]
  then
    echo "USAGE: $0 key"
    echo "You can reference by name: agd keys list"
    echo "Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/"
    exit 1
fi

set -x

# perf test wantMinted
OFFER=$(mktemp -t agops)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 >| "$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$KEY"

# perf test giveMinted
OFFER=$(mktemp -t agops)
bin/agops psm swap --giveMinted 0.01 --feePct 0.01 >| "$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$KEY"
