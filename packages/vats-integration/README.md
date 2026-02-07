# @aglocal/vats-integration

This unpublished workspace holds integration tests for `@agoric/vats` that need
bootstrap powers, runtime wiring, or boot behaviors.

The package exists to make these dependencies explicit in the workspace graph,
so integration edges are not hidden inside the leaf package test tree.

Run tests:

```bash
yarn workspace @aglocal/vats-integration test
```
