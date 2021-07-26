User-visible changes in @agoric/same-structure:

## Next Release

This entire package is now deprecated, with its code migrated
to `@agoric/marshal` with the exports renamed to their modern
names. This package remains for now in order to
re-export the new names from `@agoric/marshal` under the old
deprecated names that this package used to export. Please update
uses to the new names as imported from `@agoric/marshal`.
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
  sameStructure,
  isStructure,
  assertStructure,
  fulfillToStructure,
} from '@agoric/marshal';

## Release 0.0.1 (3-Feb-2020)

Moved out of ERTP and created new package `@agoric/same-structure`.
Now depends on `@agoric/insist`.
