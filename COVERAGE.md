# Coverage reports

## Caveat

Lines from bundled code cannot be detected until we implement source maps in all of our
source-to-source transforms (such as `@endo/bundle-source`,
`@agoric/transform-metering`, and `@agoric/static-module-record`).

## Reports

### Whole repo
Coverage reports for the current main branch are
published by CI to: https://agoric-sdk-coverage.netlify.app

See `scripts/ci/generate-test-coverage-report.sh`

## Per package
You can create a report in any package:

```sh
yarn test:c8
```

For more flexibility:
```sh
# Get options available for coverage:
yarn c8 --help
# Run a particular test
yarn c8 -a ava test/foo.test.js
# Generate a nice, detailed HTML report:
yarn c8 report --reporter=html-spa
open coverage/html/index.html
```

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
