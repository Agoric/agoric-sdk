NEXT VERSION

This version introduces three changes to the virtual collections API
implementation.  These changes bring the `ScalarBigXXXStore` collection types
into compliance with the API as defined in the `store` package, but they _do_
introduce potential compatibility issues that should be considered.  The changes
are:

* Removal of the `addToSet` method from the `ScalarBigSetStore` and
  `ScalarBigWeakSetStore` types.  This was an internal implementation method
  that should never have been present.  Since it was internal method that nobody
  knew about it, we believe it highly unlikely to be in use.  Furthermore, we
  have verified by inspection that there appears to be no existing contract or
  vat code that made use of it.  However, its removal _is_ an incompatible
  change that people should be aware of.  If anyone had been using it (in, say,
  test code), they should replace calls to it with calls to `add`, which
  performs the same operation.

* Removal of the `entries` method from the `ScalarBigSetStore` type.  This was
  implemented in a mistaken attempt to be compatible with the JavaScript `Set`
  type, but stores have a slightly different API and this method should not have
  been present.  As with `addToSet`, we have inspected existing code to verify
  that it is not in actual use; however, while extreme care was taken during
  this inspection, due to the ubiquity of the method name `entries` on other
  types, we cannot be quite as confident in the inspection's correctness as we
  are with the `addToSet` method.  One source of assurance on this score is that
  it is common practice for tests of contract code to substitue the `SetStore`
  implementation from the `stores` package, which lacks the offending method
  already.  Existing uses, if any, should be replaced with calls to either the
  `keys` or `values` method (they are equivalent), with suitable alterations to
  account for the fact that these return a single value rather than a pair.

* Addition of the `addAll` method to all the virtual collection types, which was
  an omission from the original implementation.  Care should be taken to ensure
  that developmental vat or contract code using this method is not deployed
  prior to the deployment of this version of Liveslots.

PRIOR VERSIONS

Liveslots version `@agoric/swingset-liveslots@0.10.2` was deployed to the
mainnet1B chain as part of `@agoric/swingset-xsnap-supervisor@0.10.2`
