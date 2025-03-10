# distributed apps

First-party dapps that we keep in the agoric-sdk for integration testing but are not part of the Agoric *Software Development Kit*.


## Structure

Each dapp has:
- `package.json`
- `worker`
- `vm-integration`
- `a3p-integration`
- `multichain-integration` (aka `e2e-testing`)

TODO what are the packages?
- contract
    - named package but private because it's used only within this repo
    - maybe a private package called `contract` that is repo-only? you should never need to import `contract` from another package?
- api
    - published to npm. the only one published so it gets the canonical name. e.g. `@agoric/fast-usdc`
    - shared constants and helpers that you might use in a contract or in a GUI
    - CLI (a sort of command-line API)
- vm-integration
    - alternatives: s/integration/testing, kernel-integration, swingset-integration
    
