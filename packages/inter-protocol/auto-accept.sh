CHAIN_ID=agoriclocal
AGORIC_HOME=/home/fraz/Projects/agoric-sdk/packages/cosmic-swingset/t1/bootstrap
ag_binary=agd


POLL_INTERVAL=2
FROM_ACCOUNT=bootstrap

while true; do
    # Query for proposals with status "PROPOSAL_STATUS_VOTING_PERIOD"
    PROPOSALS=$($ag_binary query gov proposals --status VotingPeriod --chain-id=$CHAIN_ID --home=$AGORIC_HOME --output json 2> /dev/null)

    # Extract proposal IDs
    PROPOSAL_IDS=$(echo $PROPOSALS | jq -r '.proposals[].id')

    echo $PROPOSAL_IDS

    if [ -n "$PROPOSAL_IDS" ]; then
        for PROPOSAL_ID in $PROPOSAL_IDS; do
            # Skip processing if already voted YES on the proposal with self account

            VOTES=$($ag_binary query gov votes $PROPOSAL_ID --chain-id=$CHAIN_ID --output json 2>/dev/null)
            ACCOUNT_VOTE=$( [ -n "$VOTES" ] && echo $VOTES | jq -r --arg account $($ag_binary keys show $FROM_ACCOUNT -a --home=$AGORIC_HOME --keyring-backend=test) '.votes[] | select(.voter == $account) | .options[] | .option')
            

            if [ "$ACCOUNT_VOTE" == "VOTE_OPTION_YES" ]; then
                echo "Already voted YES on proposal ID: $PROPOSAL_ID"
                continue
            fi

            # Vote YES on the proposal
            $ag_binary tx gov vote $PROPOSAL_ID yes \
                --from=$FROM_ACCOUNT --chain-id=$CHAIN_ID --home=$AGORIC_HOME --keyring-backend=test --yes > /dev/null

            echo "Voted YES on proposal ID: $PROPOSAL_ID"
        done
    else
        echo "No new proposals to vote on."
    fi

    # Wait for the next poll
    sleep $POLL_INTERVAL
done