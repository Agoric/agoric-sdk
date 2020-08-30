User-visible changes in @agoric/store:

## Next Release

* Moved `makeWeakStore` from `@agoric/weak-store` to here.
* Added `makeLedger`, where a ledger is like a weakStore but
  also supports a lazy `getNotifier`
* Added a `readOnlyView()` to stores, weakStores, and ledgers.
  It returns a ***shallow*** read-only facet of the stores.

## Release 0.0.1 (3-Feb-2020)

Moved out of ERTP and created new package `@agoric/store`. Now depends
on `@agoric/insist`
