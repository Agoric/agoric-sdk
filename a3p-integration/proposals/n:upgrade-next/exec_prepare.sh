#!/bin/bash
# Prepare an upgrade

set -eo pipefail

if [[ -z "${UPGRADE_TO}" ]]; then
  fail "Requires UPGRADE_TO to be set"
fi

# Season these to taste.
summary="Software Upgrade Proposal"
metadata="https://example.net"
title="Upgrade to ${UPGRADE_TO}"

source /usr/src/upgrade-test-scripts/env_setup.sh

echo "[$PROPOSAL] Voting in the upgrade."

voting_period_s=10
latest_height=$(agd status | jq -e --raw-output '.sync_info // .SyncInfo | .latest_block_height')
height=$((latest_height + voting_period_s + 20))
info=${UPGRADE_INFO-"{}"}
if echo "$info" | jq .; then
  echo "upgrade-info: $info"
else
  status=$?
  echo "Upgrade info is not valid JSON: $info"
  exit $status
fi

min_deposit=$(agd query gov params --output json | jq -r '(.params // .deposit_params).min_deposit[0] | (.amount + .denom)')

# shellcheck disable=SC2086
agd tx upgrade software-upgrade "$UPGRADE_TO" \
  --upgrade-height "$height" --upgrade-info "$info" --no-validate \
  --deposit "$min_deposit" --metadata "$metadata" \
  --summary "$summary" --title "$title" \
  ${SIGN_BROADCAST_OPTS="--missing-env-setup"}

waitForBlock

voteLatestProposalAndWait

echo "Chain in to-be-upgraded state for $UPGRADE_TO"

while true; do
  latest_height=$(agd status | jq -e --raw-output '.sync_info // .SyncInfo | .latest_block_height')
  if [ "$latest_height" -ge "$height" ]; then
    echo "Upgrade height for $UPGRADE_TO reached. Killing agd"
    echo "(CONSENSUS FAILURE above for height $height is expected)"
    break
  fi
  echo "Waiting for upgrade height for $UPGRADE_TO to be reached (need $height, have $latest_height)"
  sleep 1
done

sleep 2
killAgd
echo "state directory $HOME/.agoric ready for upgrade to $UPGRADE_TO"
