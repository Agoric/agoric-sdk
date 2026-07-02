# ymax1-multisig-control

This proposal hands `ymax1` contract control to the multisig-controlled smart
wallet that will operate it.

- The core eval generation is wired in `package.json` as usual.
- The local tests cover the multisig handoff.
- `scripts/` includes code used to build signature fixtures

To align with mainnet state, it runs after `n:upgrade-next`
and it starts the `ymax1` contract in the `eval` phase.

See also `packages/portfolio-deploy/test/ymax-multisign-agd.test.ts` for agd multisign transaction testing.
