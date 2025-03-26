#!/bin/bash
# Simple startup script without curl dependency

# Use fixed values for the faucet
CREDIT_COINS="20000000000uelys"
FEES="2000000uelys"

# Wait a reasonable time for the validator to start
echo "Waiting for validator to start... (60 seconds)"
sleep 60

# Start the faucet with fixed parameters
echo "Starting faucet with credit coins: $CREDIT_COINS and fees: $FEES"
/faucet/faucet --credit-coins="$CREDIT_COINS" --chain-fees="$FEES"
