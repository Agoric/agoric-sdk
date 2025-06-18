#!/bin/bash
set -euo pipefail

# Fund the provision pool with enough BLD to fund several new wallets.
PROVISIONING_POOL_ADDR="$(node --input-type=module -e '
  import "@endo/init/debug.js";
  import { VBankAccount } from "@agoric/client-utils";
  console.log(VBankAccount.provision.address);
')"
AMOUNT="$(node -p '`${BigInt(500e6)}ubld`')"
echo "Funding provision pool $PROVISIONING_POOL_ADDR with $AMOUNT..."
agd query bank balances $PROVISIONING_POOL_ADDR
agd tx bank send validator $PROVISIONING_POOL_ADDR $AMOUNT $SIGN_BROADCAST_OPTS
sleep 5
agd query bank balances $PROVISIONING_POOL_ADDR
