#!/bin/bash

set -e
. ./upgrade-test-scripts/env_setup.sh

agd start --home "$STATEDIR" --log_level warn &
AGD_PID=$!
wait_for_bootstrap
waitForBlock 2

runActions "pre_test"

runActions "actions"

runActions "test"

if [[ "$DEST" != "1" ]]; then
  #Destined for an upgrade
  if [[ -z "${UPGRADE_TO}" ]]; then
    echo "no upgrade set.  running for a few blocks and exiting"
    waitForBlock 5
    exit 0
  fi

  voting_period_s=10
  latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
  height=$(( $latest_height + $voting_period_s + 10 ))
  agd tx gov submit-proposal software-upgrade "$UPGRADE_TO" --upgrade-height="$height" --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" --from=validator --chain-id="$CHAINID" --yes --keyring-backend=test --home "$STATEDIR"
  waitForBlock

  voteLatestProposalAndWait

  echo "Chain in to be upgraded state for $UPGRADE_TO"

  while true; do
    latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
    if [ "$latest_height" != "$height" ]; then
      echo "Waiting for upgrade $UPGRADE_TO to happen (need $height, have $latest_height)"
      sleep 1
    else
      echo "Upgrade height for $UPGRADE_TO reached. Killing agd"
      break
    fi
  done

  sleep 2
  kill $AGD_PID
  echo "state directory $STATEDIR ready for upgrade to $UPGRADE_TO"
else

  wait $AGD_PID
fi