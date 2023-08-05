**NOTE: unsupported**

# Usage

This package contains code that is required by agoric-sdk and not meant to be imported anywhere else.

Like all `@agoric` packages it follows Semantic Versioning. Unlike the others, it will never have a stable API. In terms of [SemVer spec item 4](https://semver.org/#spec-item-4), it will never reach 1.0:
> Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable.


# Design

It is meant to be a home for modules that have no Agoric-specific dependencies themselves. It does depend on a these other @agoric packages but they are all destined to migrate out of the repo,

- base-zone
- store
- assert

This package may not take dependencies on any others in this repository.

It must never export ambient types.

It should not be imported by deep imports. Eventually this will be enforced by [`exports`](https://nodejs.org/api/packages.html#exports) but the tooling isn't ready:
    - https://github.com/import-js/eslint-plugin-import/issues/1810
    - https://github.com/microsoft/TypeScript/issues/33079 (or some related problem with JSdoc types)
