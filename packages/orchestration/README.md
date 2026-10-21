# Orchestration

Build feature-rich applications that can orchestrate assets and services across the interchain.

Usage examples can be found under [src/examples](https://github.com/Agoric/agoric-sdk/tree/master/packages/orchestration/src/examples). They are exported for integration testing with other packages.

## Orchestration flows

Flows to orchestrate are regular Javascript functions but have some constraints to fulfill the requirements of resumability after termination of the enclosing vat. Some requirements for each orchestration flow:
- must not close over any values that could change between invocations
- must satisfy the `OrchestrationFlow` interface
- must be hardened
- must not use `E()` (eventual send)

The call to `orchestrate` using a flow function in reincarnations of the vat must have the same `durableName` as before. To help enforce these constraints, we recommend:

- keeping flows in a `.flows.js` module
- importing them all with `import * as flows` to get a single object keyed by the export name
- using `orchestrateAll` to treat each export name as the `durableName` of the flow
- adopting `@agoric/eslint-config` that has rules to help detect problems

## Chain info

`src/fetched-chain-info.js` holds the minimal chain and IBC connection data that
`agoricNames` needs. `scripts/fetch-chain-info.ts` generates it from the cosmos
[chain-registry](https://github.com/cosmos/chain-registry), fetching over the
network but **pinned to a specific chain-registry commit** (the
`CHAIN_REGISTRY_COMMIT` constant in that script).

Pinning is what keeps this deterministic: `yarn codegen` fetches the same
immutable commit every time, so its output never changes on its own and is
verified idempotent in CI (`scripts/verify-codegen-idempotence.mjs`). Upstream
changes to chain-registry `master` therefore can't break CI — you adopt them
deliberately by refreshing.

So there are two distinct operations:

- **`yarn codegen`** — regenerate `src/fetched-chain-info.js` from the pinned
  commit. Run this after editing the conversion logic in `src/utils/registry.js`;
  it will not pick up upstream chain-registry changes.
- **`yarn codegen --refresh`** — re-pin to the latest chain-registry commit, then
  regenerate. This is how you pull in new chains or updated IBC connections.

### Refreshing chain info

One command re-pins and regenerates; then commit both changed files together:

```sh
# from packages/orchestration
yarn codegen --refresh
git add scripts/fetch-chain-info.ts src/fetched-chain-info.js
git commit -m 'chore(orchestration): refresh chain info from chain-registry'
```

`--refresh` rewrites the `CHAIN_REGISTRY_COMMIT` constant in
`scripts/fetch-chain-info.ts` to the latest chain-registry commit, so a refresh
shows up as a one-line bump to that constant plus the regenerated output, making
the change to the pinned source easy to review.

To add a chain, append its registry name to `chainNames` in
`scripts/fetch-chain-info.ts`, then refresh. To pin to a specific commit instead
of the latest, edit `CHAIN_REGISTRY_COMMIT` directly and run `yarn codegen`
(without `--refresh`).

> [!NOTE]
> A refresh reflects whatever the registry publishes at the new commit, so the
> diff to `fetched-chain-info.js` may include unrelated chains that changed since
> the last refresh. Review it before committing.
