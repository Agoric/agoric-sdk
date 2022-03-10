User-visible changes in @agoric/same-structure:

## Next Release

This entire package is now deprecated, with its code migrated
to `@agoric/store` with the exports renamed to their modern
names. This package remains for now in order to
re-export the new names from `@agoric/store` under the old
deprecated names that this package used to export. Please update
uses to the new names as imported from `@agoric/store`.
```js
import {
  sameStructure,
  isComparable,
  mustBeComparable,
  allComparable,
} from '@agoric/same-structure';
```
to
```js
import {
  keyEQ,
  isKey,
  assertKey,
  fulfillToKey,
} from '@endo/marshal';

## Release 0.0.1 (3-Feb-2020)

Moved out of ERTP and created new package `@agoric/same-structure`.
Now depends on `@agoric/insist`.
