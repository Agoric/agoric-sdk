#!/bin/bash

set -e
. ./upgrade-test-scripts/env_setup.sh
ag0 init localnet --chain-id "$CHAINID"

govaccounts=( "gov1" "gov2" "gov3" "validator ")

for i in "${govaccounts[@]}"
do
  ag0 keys add $i --keyring-backend=test  2>&1 | tee "$HOME/.agoric/$i.out"
  cat "$HOME/.agoric/$i.out" | tail -n1 | tee "$HOME/.agoric/$i.key"
done


sed -i.bak "s/^timeout_commit =.*/timeout_commit = \"1s\"/" "$HOME/.agoric/config/config.toml"


contents="$(jq ".app_state.crisis.constant_fee.denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.mint.params.mint_denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.gov.deposit_params.min_deposit[0].denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.staking.params.bond_denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.slashing.params.signed_blocks_window = \"20000\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
contents=$(jq '. * { app_state: { gov: { voting_params: { voting_period: "10s" } } } }' "$HOME/.agoric/config/genesis.json") && echo -E "${contents}" > "$HOME/.agoric/config/genesis.json"
export GENACCT=$(ag0 keys show validator -a --keyring-backend="test")
echo "Genesis Account $GENACCT"
coins="10000000000000000ubld,1000000000000000000ibc/toyusdc"
ag0 add-genesis-account "$GENACCT" $coins

ag0 gentx validator 5000000000ubld --keyring-backend="test" --chain-id "$CHAINID" 
ag0 collect-gentxs
ag0 start --log_level warn &
ag0_PID=$!
wait_for_bootstrap
waitForBlock 2

voting_period_s=10
latest_height=$(ag0 status | jq -r .SyncInfo.latest_block_height)
height=$(( $latest_height + $voting_period_s + 10 ))
ag0 tx gov submit-proposal software-upgrade "$UPGRADE_TO" --upgrade-height="$height" --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" --from=validator --chain-id="$CHAINID" --yes --keyring-backend=test
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
echo "state directory $HOME/.agoric ready for upgrade to $UPGRADE_TO"
