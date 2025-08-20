#!/bin/bash
echo == provision a smartWallet for ymaxControl for use in ymax-alpha3

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

echo === how much does validator have?
agd query bank balances $(agd keys show -a validator --keyring-backend=test)

echo === Fund the provision pool with enough BLD to fund several new wallets.
poolAddr=agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346
amount=500000000ubld
agd tx bank send validator "$poolAddr" "$amount" $SIGN_BROADCAST_OPTS

# WARNING: For any mnemonic phrase you use to secure your own assets,
# take care to keep it strictly confidential!
# The mnemonic here is only for testing.
mnemonic="repair wink afraid minimum little decline brain embody scan repair shell helmet acid sign swift busy profit uncover average useless inhale grass oblige cruel"
addr="agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh"

echo "$mnemonic" | agd keys add ymaxControl --recover --keyring-backend=test

provisionSmartWallet "$addr" "200000000ubld"
