# usage of TypeScript

Our use of TypeScript has to accomodate both .js development in agoric-sdk (which could not import types until TS 5.5) and .ts development of consumers of agoric-sdk packages (which could always import types). For .js development, we have many ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace. We are slowly transitioning away from ambient types.

## Best practices

- package entrypoint(s) exports explicit types
- for packages upon which other packages expect ambient types:
  - `exported.js` exports the explicit types and ambient re-exports

## exported.js

The `exported.js` re-exports types into global namespace, for consumers that expect these to
be ambient. This could be called "ambient.js" but we retain the filename for backwards compatibility.

The pattern is to make these two files like this at package root:


`exported.js`

```ts
// Dummy file for .d.ts twin to declare ambients
export {};
```

`exported.d.ts`

```ts
/** @file Ambient exports until https://github.com/Agoric/agoric-sdk/issues/6512 */
/** @see {@link /docs/typescript.md} */
/* eslint-disable -- doesn't understand .d.ts */
import {
  SomeType as _SomeType,
} from './src/types.js';

declare global {
  export {
    _SomeType as SomeType,
  };
}
```

Why the _ prefix? Because without it TS gets confused between the
import and export symbols. ([h/t](https://stackoverflow.com/a/66588974))
Note one downside vs ambients is that these types will appear to be on `globalThis`.


## Generating API docs

We use [TypeDoc](https://typedoc.org/) to render API docs in HTML.

```sh
yarn docs
open api-docs/index.html
```

