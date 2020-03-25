User-visible changes in @agoric/zoe:

## Release 0.3.0 (25-Mar-2020)

"OfferRules", or the declarative statement portion of an offer, have
been renamed to "proposal". The structure of a proposal has changed to:

```js
{
  give: { Asset: moola(4 )},
  want: { Price: simoleans(15) },
  exit: { afterDeadline: {
    timer,
    deadline: 100,
  }}
}
```

(* `moola` is an alias for `moolaAmountMath.make`, and likewise for
`simoleans`.)

There are no longer any keys such as 'payoutRules' or 'exitRule'. Most
importantly, we no longer rely on the specific order of payoutRules
arrays and payment/payout arrays to be the same. In fact, we can even
make a partial proposal that will be filled in. 

`Asset` and `Price` in the above example are called "keywords". Each
contract has its own specific keywords. For instance, an auction
might have "Asset" and "Bid". Keywords are unique identifiers per
contract, that tie together the proposal, payments to be escrowed, and
payouts to the user.

Users should submit their payments using keywords:

``` const payments = { Asset: moolaPayment }; ```

And, users will receive their payouts with keywords as the keys of a
payout object:

``` moolaPurse.deposit(payout.Asset); ```

In summary, the arrays that were part of the previous API have been
replaced with records keyed by keywords.

Below is a summary of the changes:

Changes to the Zoe Service (User-facing) API:
* `makeInstance` now takes in three arguments: `installationHandle`,
  `issuerKeywordRecord`, and `terms`. `issuerKeywordRecord` should have strings
  as keys (called `keyword`s), and issuers as values (called `args`).
  For instance, `{Asset: moolaIssuer, Price: simoleanIssuer }`. `Terms`
  no longer needs an `issuers` property. Instead, `terms` should be used for
  any contract-specific parameters, such as the number of bids an
  auction should wait for before closing.
* OfferRules (now proposal) have the new structure mentioned above
* Payments to be escrowed must be an object keyed by `keywords` rather
  than an array
* Payouts from Zoe will be in the form of a promise that resolves to a
  object keyed by keywords where the values are promises for
  payments
* We have added three new methods to the Zoe Service API: `getOffer`,
  `getOffers`, and `isOfferActive`. Note that `getOffer` and
  `getOffers` will throw if the offer is not found, whereas
  `isOfferActive` is safe to check whether an offer is still active or
  not. 

Changes to the Contract Facet API and contract helpers:
* The `userFlow` helpers have been renamed to `zoeHelpers`
* `hasValidPayoutRules` is no longer a helper function due to the
  change in the proposal structure
* Instead, we have three new helpers: `assertKeywords` which can be
  used to make sure that the keywords on instantiation match what
  the contract expects, `rejectIfNotProposal` which rejects an
  offer if the proposal have the wrong structure, and
  `checkIfProposal` which checks if the proposal match the
  expected structure and returns true or false.
* `getAmountMathForIssuers` and `getBrandsForIssuers` no longer exist
* `getAmountMaths` is added. It takes in a `issuerKeywordRecord`
  record that maps keywords to issuers.
* `getInstanceRecord` is added. It allows the contracts to get access
  to their keywords, issuers and other "instanceRecord" information from
  Zoe.
* The instanceRecord now has properties: `issuerKeywordRecord` (a record with
  `keyword` keys and issuer values) and `keywords` (an array of
  strings). The keywords in `issuerKeywordRecord` and the `keywords` array
  are the same.
* In the offerRecord, amounts are no longer an array. Instead they are
  an `amountKeywordRecord`, an object with `keywords` as keys and `amount`
  values. 
* Reallocate now takes an array of offerHandles/inviteHandles and an
  array of the above `amountKeywordRecord`s keyed on keywords.
* AddNewIssuer now requires a keyword to be provided alongside the issuer.

## Release 0.2.1 (3-Feb-2020)

Updates ERTP dependency to v0.3.0 and adds dependencies on new
packages taken from ERTP. 

## Release 0.2.0 (21-Jan-2020)

* Changes the payout rule kinds to only two kinds: offerAtMost and wantAtLeast (Issue #101)
* Changes one of the exit conditions (noExit) to waived (Issue #107)
* Removes escrow receipts entirely and replaces them with invites to contracts.
* All offers to Zoe must redeem a Zoe invite (Issue #102)
* Contracts use units rather than extents. (Issue #99)
* Mentions of "exit safety" replaced by "payout liveness" (Issue #361)

## Release 0.1.2 (17-Dec-2019)

Refactored the internals of Zoe. No user-visible changes.
