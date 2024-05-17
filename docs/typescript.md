# usage of TypeScript

Our use of TypeScript has to accomodate both .js development in agoric-sdk (which could not import types until TS 5.5) and .ts development of consumers of agoric-sdk packages (which could always import types). For .js development, we have many ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace. We are slowly transitioning away from ambient types.

## Best practices

- `.d.ts` for types modules
- package entrypoint(s) exports explicit types
- for packages upon which other packages expect ambient types:
  - `exported.js` exports the explicit types and ambient re-exports
- don't use runtime imports to get types ([issue](https://github.com/Agoric/agoric-sdk/issues/6512))

## .d.ts modules

We cannot use `.ts` files in any modules that are transitively imported into an Endo bundle. The reason is that the Endo bundler doesn't understand `.ts` syntax and we don't want it to until we have sufficient auditability of the transformation. Moreover we've tried to avoid a build step in order to import a module. (The one exception so far is `@agoric/cosmic-proto` because we codegen the types. Those modules are written in `.ts` syntax and build to `.js` by a build step that creates `dist`, which is the package export.)

### Benefits

- A `.d.ts` module allows defining the type in `.ts` syntax, without any risk that it will be included in runtime code. The `.js` is what actually gets imported.
- Only `.d.ts` files can be used in [triple-slash reference types](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html#-reference-types-)

The are some consequences to this approach.

### File pair

You have to create a `.js` and `.d.ts` pair for each module. Usually it's of the form,

```js
// Empty JS file to correspond with its .d.ts twin
export {};
```

### Lack of type checking

We have `"skipLibCheck": true"` in the root tsconfig.json because some libraries we depend on have their own type errors. (A massive one is the output of Telescope, used in `@agoric/cosmic-proto`.)

This means that the types you write in `.d.ts` file won't be checked by `tsc`. To gain some confidence, you can temporarily flip that setting in a package's own `tsconfig.json` and pay attention to only the relevant errors.

### Alternatives

We've experimented with having `.ts` files. It works, and gets around the skipLibCheck problem, but it complicates the build and exports. It also necessitates a build step even in package that don't currently need it.

## entrypoint

This is usually an `index.js` file which contains a wildcard export like,

```js
// eslint-disable-next-line import/export -- just types
export * from './src/types.js';
```

The `types.js` file either defines the types itself or is an empty file (described above) paired with a `.d.ts` or `.ts` twin.

One option considered is having the conditional package `"exports"` include `"types"` but that has to be a .d.ts file. That could be generated from a `.ts` but it would require a build step, which we've so far avoided.

Once we have [JSDoc export type support](https://github.com/microsoft/TypeScript/issues/48104) we'll be able instead to keep the `index.js` entrypoint and have it export the types from `.ts` files without a runtime import of the module containing them.

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
