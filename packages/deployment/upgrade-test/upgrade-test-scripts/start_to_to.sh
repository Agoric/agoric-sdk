#!/bin/bash

grep -qF 'env_setup.sh' /root/.bashrc || echo ". ./upgrade-test-scripts/env_setup.sh" >> /root/.bashrc
grep -qF 'printKeys' /root/.bashrc || echo "printKeys" >> /root/.bashrc

. ./upgrade-test-scripts/env_setup.sh

export SLOGFILE=slog.slog

startAgd

if [[ -n "$THIS_NAME" ]] && ! test -f "$HOME/.agoric/runActions-${THIS_NAME}"; then
  pushd upgrade-test-scripts || exit 1
  yarn upgrade-tests || exit 1
  popd || exit 1
  runActions "legacy"
  
  touch "$HOME/.agoric/runActions-${THIS_NAME}"
fi

if [[ "$DEST" != "1" ]]; then
  #Destined for an upgrade
  if [[ -z "${UPGRADE_TO}" ]]; then
    echo "no UPGRADE_TO specified.  running for a few blocks and exiting"
    waitForBlock 5
    exit 0
  fi

  if [[ "$BOOTSTRAP_MODE" == "test" ]]; then
    UPGRADE_TO=${UPGRADE_TO//agoric-/agorictest-}
  fi


  voting_period_s=10
  latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
  height=$(( $latest_height + $voting_period_s + 10 ))
  info=${UPGRADE_INFO-"{}"}
  if echo "$info" | jq .; then :
  else
    status=$?
    echo "Upgrade info is not valid JSON: $info"
    exit $status
  fi
  agd tx gov submit-proposal software-upgrade "$UPGRADE_TO" \
    --upgrade-height="$height" --upgrade-info="$info" \
    --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" \
    --from=validator --chain-id="$CHAINID" \
    --yes --keyring-backend=test
  waitForBlock

  voteLatestProposalAndWait

  echo "Chain in to-be-upgraded state for $UPGRADE_TO"

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
  killAgd
  echo "ready for upgrade to $UPGRADE_TO"
else

  waitAgd
fi
