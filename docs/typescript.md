# usage of TypeScript

Our use of TypeScript has to accomodate both .js development in agoric-sdk (which cannot import types) and .ts development of consumers of agoric-sdk packages (which can import types). For .js development, we want ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace.

This means we need two definition files. We could keep those both in SCM, but that would cause more confusion and risk them getting out of sync. We could have one be defined in terms of the other, but since there is no way to reexport to global namespace, it would have to be a secondary definition in the primary. This would typecheck because TS is structurally typed, but the secondary would lose all the documentation on the types.

So our best solution is to have one source of truth for the types and auto-generate for one case from the other. We've chosen to have the ambient types as the source of truth so the SDK development can use them. The SDK consumption can have a build step during packaging, and that's when we make the exported (non-ambient) types.

## Best practices

- `src/types-ambient.js` defines types of the package
- `src/types.d.ts` is built automatically from types-ambient
  - `prepack` copies types-ambient.js to types.js and appends 'export {};' to turn it into a module, then builds
  - `postpack` deletes the new types.js and .d.ts files
