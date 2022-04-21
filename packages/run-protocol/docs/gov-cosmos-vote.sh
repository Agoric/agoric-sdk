#!/bin/sh

AG_SOLO_BASEDIR=/tmp/stage20
EVAL_PERMIT=../run-protocol/gov-econ-committee-permit.json
EVAL_CLEAN=gov-econ-committee.js-clean.js
EVAL_DEPOSIT=1000000ubld
GAS_ADJUSTMENT=1.2

NODE=http://35.222.213.244:26657
CHAIN_ID=agoricstage-21

agd --node=$NODE \
    --home=$AG_SOLO_BASEDIR/ag-cosmos-helper-statedir/ --keyring-backend=test \
   tx gov vote 1 yes \
		--yes --chain-id=$CHAIN_ID --from=ag-solo -b block
