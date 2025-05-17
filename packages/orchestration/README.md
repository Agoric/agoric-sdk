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
