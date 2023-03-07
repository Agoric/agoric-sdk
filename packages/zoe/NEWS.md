User-visible changes in @agoric/zoe:

## Release v0.7.0 (29-June-2020)

Zoe Service changes:

* Instead of `zoe.makeInstance` returning an invite only, it now
  returns a record of `{ invite, instanceRecord }` such that
  information like the `instanceHandle` can be obtained directly from
  the instanceRecord.
* `installationHandle`, the identifier for the code that is used to
  create a new running contract instance, is added to the extent of
  invites for contracts so that interested parties can easily check
  whether their invite is using the code they expect.
* `brandKeywordRecord` is added as a property of `instanceRecord`
  alongside `issuerKeywordRecord`. `brandKeywordRecord` is an object
  with keyword keys and brand values.
* `zoe.makeContract` now only accepts a single argument (`bundle`) and
  the old module format will error.


Zoe Contract Facet (zcf) changes:
* `zcf.reallocate` no longer accepts a third argument `sparseKeywords`
  and no longer expects the keywords for different offers to be the
  same. Within reallocate, the offer safety check compares the user's
  proposal to the user's allocation, and the rights conservation check
  adds up the amounts by brand to ensure the totals are the same.
  Neither of these checks requires that the keywords for the
  allocations be the same for different offers.
* `zcf.getCurrentAllocation` and `zcf.getCurrentAllocations` no longer
  take sparseKeywords as a parameter. Instead, brandKeywordRecord is
  an optional parameter. If omitted, amounts are returned only for
  brands for which an allocation currently exists.
* `zcf.getInstanceRecord()` no longer takes a parameter
* `brandKeywordRecord` is added as a property of `instanceRecord`
  alongside `issuerKeywordRecord`. `brandKeywordRecord` is an object
  with keyword keys and brand values.
* `zcf.getAmountMaths` has been subsumed by `zcf.getAmountMath` which
  takes a single brand parameter.
* `zcf.getBrandForIssuer` has been added. It synchronously returns the
  brand for a given issuer already known to Zoe.
* `zoe.getInstance`, which was deprecated earlier, has been removed.
* `cancelObj` and `cancelObj.cancel()`, which were deprecated earlier,
  have been removed.

Changes for Zoe contract developers:
* Zoe contracts are now expected to return only an invite as the
  result of `makeContract`. If the contracts want to have a
  `publicAPI`, they can do so through `zcf.initPublicAPI`.
* Contracts can allow different offers to use different keywords for
  the same issuers. For example, publicAuction, the second price
  auction contract, uses 'Asset' and 'Ask'
  for the seller keywords and 'Asset' and 'Bid' for the buyer
  keywords.


Built-in Zoe contract changes:
* We added more comments to the start of the built-in Zoe contracts.
* The operaTickets contract has been split into two contracts: a
  generic `sellItems` contract that sells fungible or nonfungible
  items at a set price for money, and a generic `mintAndSellNFT`
  contract that mints NFT tokens and then immediately creates a new
  `sellItems` instance to sell them. The original operaTicket tests
  are able to use these contracts.
* The `getCurrentPrice` helper in `bondingCurves.js` has been renamed
  to `getInputPrice` and now only returns the `outputExtent`.
* A new built-in contract was added: barter-exchange.js. Barter
  Exchange takes offers for trading arbitrary goods for one another.
* Autoswap now has different keywords for different actions that can
  be taken. For example, a swap should have the keywords 'In' and
  'Out'.
* Multipool Autoswap has new keywords for different actions that can
  be taken as well. For example, adding liquidity has the keywords:
  'SecondaryToken' and 'CentralToken' and returns a payout with
  keyword `Liquidity`.
* In Public Auction, the seller keywords are 'Asset' and 'Ask' and the
  buyer keywords are 'Asset' and 'Bid'.


ZoeHelpers changes:

Some helpers were removed, and others were added. The built-in Zoe contracts were rewritten to
  take advantage of these new helpers.
* `satisfies` was added. It checks whether an allocation would satisfy
  a single offer's wants if that was the allocation passed to
  `reallocate`.
* `isOfferSafe` was added. It checks whether an
  allocation for a particular offer would satisfy offer safety. Any
  allocation that returns true under `satisfy` will also return true
  under `isOfferSafe`. (`isOfferSafe` is equivalent of `satisfies` ||
  gives a refund).
* `trade` was added. `Trade` performs a trade between
  two offers given a declarative description of what each side loses
  and gains.
* `Swap` remains but has slightly different behavior: any
  surplus in a trade remains with the original offer
* `canTradeWith`
  was removed and subsumed by `satisfies`.
* `inviteAnOffer` was already
  deprecated and was removed.
* `assertNatMathHelpers` was added, which
  checks whether a particular keyword is associated with an issuer
  with natMathHelpers.

ERTP changes:
* `purse.deposit()` now returns the amount of the deposit, rather than
  the purse's new balance.
* A deposit-only facet was added to purses, and can be created by
  calling `makeDepositFacet` on any purse.

## Release v0.6.0 (1-May-2020)

* We added `completeObj` with the method `complete` to what is given
  to a user if they make an offer with Zoe with the exit rule
  `onDemand`. This will eventually replace the `cancelObj`, which will
  be removed in a few weeks.
* `zcf.makeInvitation` now takes an offerHook, a required string
  `inviteDesc`, and an object of options, including the ability to add
  `customDetails` to the extent of the invite. `inviteDesc` is
  required such that different kinds of invites from the same contract
  are distinguishable.
* The zoeHelper `inviteAnOffer` is deprecated
* Instead of `inviteAnOffer`, we recommend using `checkHook` which
  more cleanly wraps an offerHook in a check of whether the offer
  matches the expected proposal format.
* We changed the `getOffer` and `getOffers` methods on the Zoe Service
  API to match the Zoe Contract Facet API. Now, in order to get the
  current allocation, you should call the new methods
  `E(zoe).getCurrentAllocation(offerHandle)` or `E(zoe).getCurrentAllocations(offerHandles)`

## Release v0.4.0 (2-Apr-2020)

* The `proposal` and `paymentKeywordRecord` arguments to `zoe.redeem` now default to an empty record. Previously, a user had to pass in an empty record for these arguments, which would be interpreted as a presence in @endo/marshal.

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
