#!/bin/bash
source /usr/src/upgrade-test-scripts/env_setup.sh

# XXX correct misnaming
DELEGATOR_ADDRRESS=$VALIDATORADDR
VALIDATOR_ADDRESS=$(agd query staking delegations "$DELEGATOR_ADDRRESS" --output json | jq -r ".delegation_responses[0].delegation.validator_address")
export VALIDATOR_ADDRESS
echo "VALIDATOR_ADDRESS: $VALIDATOR_ADDRESS from delegator $DELEGATOR_ADDRRESS (named 'VALIDATORADDR' in env)"

yarn ava
