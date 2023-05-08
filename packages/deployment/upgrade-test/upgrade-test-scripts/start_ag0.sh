#!/bin/bash

set -e
. ./upgrade-test-scripts/env_setup.sh
ag0 init localnet --home "$STATEDIR" --chain-id "$CHAINID"


govaccounts=( "gov1" "gov2" "gov3" "validator ")

for i in "${govaccounts[@]}"
do
  ag0 keys add $i --keyring-backend=test --home "$STATEDIR"  2>&1 | tee "$STATEDIR/$i.out"
  cat "$STATEDIR/$i.out" | tail -n1 | tee "$STATEDIR/$i.key"
done


sed -i.bak "s/^timeout_commit =.*/timeout_commit = \"1s\"/" "$STATEDIR/config/config.toml"


contents="$(jq ".app_state.crisis.constant_fee.denom = \"ubld\"" "$STATEDIR/config/genesis.json")" && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
contents="$(jq ".app_state.mint.params.mint_denom = \"ubld\"" "$STATEDIR/config/genesis.json")" && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
contents="$(jq ".app_state.gov.deposit_params.min_deposit[0].denom = \"ubld\"" "$STATEDIR/config/genesis.json")" && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
contents="$(jq ".app_state.staking.params.bond_denom = \"ubld\"" "$STATEDIR/config/genesis.json")" && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
contents="$(jq ".app_state.slashing.params.signed_blocks_window = \"20000\"" "$STATEDIR/config/genesis.json")" && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
contents=$(jq '. * { app_state: { gov: { voting_params: { voting_period: "10s" } } } }' "$STATEDIR/config/genesis.json") && echo -E "${contents}" > "$STATEDIR/config/genesis.json"
export GENACCT=$(ag0 keys show validator -a --keyring-backend="test" --home "$STATEDIR")
echo "Genesis Account $GENACCT"
coins="10000000000000000ubld,1000000000000000000ibc/toyusdc"
ag0 add-genesis-account "$GENACCT" $coins --home "$STATEDIR"

ag0 gentx validator 5000000000ubld --keyring-backend="test" --chain-id "$CHAINID"  --home "$STATEDIR"
ag0 collect-gentxs --home "$STATEDIR"
ag0 start --home "$STATEDIR" --log_level warn &
ag0_PID=$!
wait_for_bootstrap
waitForBlock 2

voting_period_s=10
latest_height=$(ag0 status | jq -r .SyncInfo.latest_block_height)
height=$(( $latest_height + $voting_period_s + 10 ))
ag0 tx gov submit-proposal software-upgrade "$UPGRADE_TO" --upgrade-height="$height" --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" --from=validator --chain-id="$CHAINID" --yes --keyring-backend=test --home "$STATEDIR"
waitForBlock

voteLatestProposalAndWait

echo "Chain in to be upgraded state for $UPGRADE_TO"

while true; do
  latest_height=$(ag0 status | jq -r .SyncInfo.latest_block_height)
  if [ "$latest_height" != "$height" ]; then
    echo "Waiting for upgrade to happen (need $height, have $latest_height)"
    sleep 1
  else
    echo "Upgrade height for $UPGRADE_TO reached. Killing ag0"
    break
  fi
done

kill $ag0_PID
echo "state directory $STATEDIR ready for upgrade to $UPGRADE_TO"
