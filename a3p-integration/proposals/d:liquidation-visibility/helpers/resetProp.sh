sdkRoot=/usr/src/agoric-sdk
interRoot=$sdkRoot/packages/inter-protocol
proposalRoot=/usr/src/a3p/proposals/b:liquidation-visibility

echo "SDK Root" $sdkRoot
echo "Proposal Root" $proposalRoot

rm $interRoot/src/proposals/liq-prep-proposal.js
rm $interRoot/scripts/liq-prep-script.js
rm $interRoot/src/manualTimerFaucet.js
rm $interRoot/src/vaultFactory/vaultFactoryV2.js
rm /tmp/prepare-test-liquidation*
