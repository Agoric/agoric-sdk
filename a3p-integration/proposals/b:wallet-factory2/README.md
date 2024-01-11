# Proposal to upgrade Smart Wallet  to incarnation 2

This uses the smart Wallet code in https://github.com/Agoric/agoric-sdk/pull/8488

It's currently a draft proposal, built from that branch with,

```
A3P=../../../a3p-integration
submission=$A3P/proposals/b:wallet-factory2/submission
# whatever your checkout
cd packages/builders
# build the proposal
agoric run scripts/smart-wallet/build-wallet-factory2-upgrade.js | tee wf2-report.txt
# copy the proposal
mkdir $submission
cp upgrade-wallet-factory* $submission
# copy the bundles built for the proposal
cat run-report.txt | grep install-bundle | \
    sed "s/agd tx swingset install-bundle @//" \
    | xargs -I _ cp _ $submission
```