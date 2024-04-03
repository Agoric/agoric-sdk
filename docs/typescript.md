# usage of TypeScript

Our use of TypeScript has to accomodate both .js development in agoric-sdk (which could not import types until TS 5.5) and .ts development of consumers of agoric-sdk packages (which could always import types). For .js development, we have many ambient (global) types so that we don't have to precede each type reference by an import. For .ts development, we want exports from modules so we don't pollute a global namespace. We are slowly transitioning away from ambient types.

## Best practices

- package entrypoint(s) exports explicit types
- for packages upon which other packages expect ambient types:
  - `exported.d.ts` exports the explicit types and ambient re-exports

## Generating API docs

We use [TypeDoc](https://typedoc.org/) to render API docs in HTML.

```sh
yarn docs
open api-docs/index.html
```

