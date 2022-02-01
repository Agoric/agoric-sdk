# Coverage reports

## Caveat

Until each module can be migrated to support Node.js's builtin ESM
implementation (`nesm`), the coverage line numbers will be out-of-sync with
reality.

In addition, we will have to implement source maps in all of our
source-to-source transforms (such as `@endo/bundle-source`,
`@agoric/transform-metering`, and `@agoric/static-module-record`).

## Reports

Coverage reports for the current main branch (whose packages support `nesm`) are
published by CI to: https://agoric-sdk-coverage.netlify.app

You can create a report in any package (including the top-level directory):

```sh
# Get options available for coverage:
yarn c8 --help
# Run ava under Node.js coverage and display a summary:
yarn c8 -a ava
# Generate a nice, detailed HTML report:
yarn c8 report --reporter=html-spa
open coverage/html/index.html
```

## Node.js ESM Support

With the current `patches/esm+3.2.25.diff`, it is possible to migrate packages
to support both resm (`-r esm`) and nesm (Node.js ESM Support).  If an
`agoric-sdk` package has dependencies that support nesm, you can attempt to make
it also support nesm by:

1. Create `ava-nesm.config.js` removing `"require": ["esm"]`:

```sh
../../scripts/ava-nesm.cjs > ava-nesm.config.js
```

2. Make the following changes to its `package.json` (omitting comments):

```js
{
  // Enable nesm support.
  "type": "module",
  "scripts": {
    // The following line enables coverage generation from the top.
    "test:c8": "c8 $C8_OPTIONS ava --config=ava-nesm.config.js"
  }
}
```

3. Test that both `yarn test` and `yarn test:c8` run correctly.

## Planned Implementation

Our runtime source transforms can be conditional on the `$NODE_V8_COVERAGE`
environment variable, which is set by `c8`.

When that is nonempty, source transforms can implement special behaviour to
preserve source maps for transformed code.  This involves using a `//#
sourceURL=...` tag to associate a unique URL to an actual existing file during
`eval`.  The file's contents include a `//# sourceMappingURL=...`, whether a
relative URL (taken from `sourceURL`) to a `.js.map` file or inline as a `data:`
URI.


The `sourceMappingURL` source map must contain a `"sources"` property as a
relative or absolute URL to the input source file.
