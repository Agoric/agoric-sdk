---
name: Manual Dapp Testing
about: A checklist of dapps to test manually every week, until we have
automated testing. Use this issue template once per week to record
that manual testing was done.
title: 'Weekly Manual Dapp Testing'
labels: 'Dapp & UI Support'
assignees: ''

---

We need to do some basic manual testing of the dapps and wallet. (These are unfortunately not fully covered by automated testing.)

The dapps that we need to test manually are:

- [ ] dapp-card-store (Buy a card)
- [ ] dapp-treasury (Swap on the AMM, create a vault, adjust a vault, close a vault)
- [ ] dapp-fungible-faucet (Get tokens from the faucet)
- [ ] testnet-load-generator (run the loadgen scripts)

The dapps we don't need to test because they are fully covered by automated tests and CI on agoric-sdk PRs are:
- documentation (full test coverage for snippets)
- dapp-otc (no frontend, full test coverage)
- dapp-nft-drop (TODO: add to CI https://github.com/Agoric/agoric-sdk/issues/3961)

Dapps no longer supported or known to be broken
- dapp-loan (no longer supported)
- dapp-token-economy (deleted in favor of the public dapp-treasury)
- dapp-simple-exchange (known to be broken)
- dapp-autoswap (known to be broken, see the AMM in dapp-treasury instead)
- dapp-oracle (known to be broken)
- dapp-pegasus (no ui or api yet, contract is in agoric-sdk)