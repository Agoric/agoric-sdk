# Proposal to upgrade Smart Wallet  to incarnation 1

This uses the smart Wallet code in https://github.com/Agoric/agoric-sdk/pull/8488

It's currently a draft proposal, built from that branch with,

```
# whatever your checkout
A3P=/opt/agoric/agoric-3-proposals
cd packages/builders
# build the proposal
agoric run scripts/vats/upgrade-wallet-factory.js | tee run-report.txt
# copy the proposal
cp upgrade-wallet-factory* $A3P/proposals/a:wallet-factory/submission
# copy the bundles built for the proposal
cat run-report.txt | grep install-bundle | sed "s/agd tx swingset install-bundle @//" |xargs -I _ cp _ $A3P/proposals/a:wallet-factory1/submission
```
