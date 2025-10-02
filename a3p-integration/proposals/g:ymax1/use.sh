#!/bin/bash
echo == provision a smartWallet for ymax1Control of the ymax1 contract

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# WARNING: For any mnemonic phrase you use to secure your own assets,
# take care to keep it strictly confidential!
# The mnemonic here is only for testing.
mnemonic="swing matrix country boring segment void similar cliff illness any pulse object quantum viable unveil carbon gap thunder merge screen combine core dog control"
addr="agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm"

echo "$mnemonic" | agd keys add ymax1Control --recover --keyring-backend=test

provisionSmartWallet "$addr" "200000000ubld"

echo "== use invitations..."
./use-invitation.js agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh # update ymax0 control
./use-invitation.js $addr                                         # accept ymax1 control
