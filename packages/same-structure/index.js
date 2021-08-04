// This entire package is now deprecated, with its code migrated
// to `@agoric/marshal` with the exports renamed to their modern
// names.
//
// This package remains for now in order to
// re-export the new names from `@agoric/marshal` under the old
// deprecated names that this package used to export. Please update
// uses to the new names as imported from `@agoric/marshal`.

export {
  sameStructure,
  isStructure as isComparable, // deprecated
  assertStructure as mustBeComparable, // deprecated
  fulfillToStructure as allComparable, // deprecated
} from '@agoric/marshal';
