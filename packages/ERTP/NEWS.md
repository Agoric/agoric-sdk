User-visible changes in ERTP:

## Next Release

* Purses now support `getCurrentAmountNotifier()` that notifies of balance
  changes.

## Release v0.7.0 (21-July-2020)

* Rename `extent` to `value`
* Rename `produceIssuer` to `makeIssuerKit`

## Release v0.6.0 (29-June-2020) 

* `purse.deposit()` now returns the amount of the deposit, rather than
  the purse's new balance.
* A deposit-only facet was added to purses, and can be created by
  calling `makeDepositFacet` on any purse.

## Release v0.5.0 (26-Mar-2020)

Changed most ERTP methods to now accept promises for payments. The
only method that does not accept a promise for a payment is `deposit`,
which only accepts payments.

## Release v0.4.0 (6-Mar-2020)

* We added the concept of a brand, because the assay (renamed to
  issuer) was serving two purposes: it was indicating the kind and was
  a trusted authority for payment and purse validity. This was a
  problem because where it was used to indicate the kind, like in
  `payment.getBalance()`, a user could grab an assay from the units,
  use it to claim their payment, and think they accomplished something
  security-wise. 
* Relatedly, most of the methods from payments have been removed. The
  only method on payments that remains is `getAllegedBrand`. To get
  the current amount of assets in a payment, use the issuer:
  `issuer.getAmountOf(payment)`
* makeMint was renamed to 'produceIssuer' to emphasize that the issuer
  is most important and the mint is just the admin facet of the issuer.
* ProduceIssuer returns an object with properties like issuer, mint,
  amountMath (formerly unitOps), and brand rather than the old version
  that just returned a mint. 
* Most configuration has been removed from ERTP in favor of a few
  built-in configurations: digital assets can be fungible (the
  default), or non-fungible. If digital assets are non-fungible, there
  is a choice between two settings: 'strSet' mathHelpers handle the
  math for extents that are sets of string IDS, and 'set' mathHelpers
  handle the math for extents that are sets of more complex objects
  (which might be opaque ids called handles or data). Zoe invites use
  'set' mathHelpers. 
* CoreMintKeeper was rewritten to conserve currency and then inserted
  into issuer.js (formerly mint.js)
* We removed the issuer and purse methods with suffix 'All' and
  'Exactly' and replaced them with one method per job that takes an
  optional amount. If the optional amount is present, the code checks
  whether the balance it is working with is equal to that balance.
* The `coerce` method in AmountMath (formerly UnitOps) now only
  accepts amounts. This means that minting (i.e.
  `mint.mintPayment(moola(3))`) only accepts amounts and rejects raw
  extents.


## Release v0.3.1 (4-Feb-2020)

Update dependency on pixel-demo

## Release v0.3.0 (3-Feb-2020) 

* Move a number of files out of ERTP and into their own packages in
  this monorepo, including:
  
  1. `@agoric/import-manager`
  2. `@agoric/make-promise`
  3. `@agoric/sparse-ints`
  4. `@agoric/insist`
  5. `@agoric/registrar`
  6. `@agoric/store`
  7. `@agoric/weak-store`
  8. `@agoric/sharing-service`
  9. `@agoric/same-structure`
  10. `@agoric/spawner` (formerly contractHost)
  11. `@agoric/pixel-demo`

## Release v0.2.0 (12/4/2019)

* Remove Zoe from ERTP and publish as @agoric/zoe

## Release v0.1.12 (11/13/2019)

* Added "myFirstDapp", a smart contract with the same interface as our
  autoswap (Uniswap) contract, but which does not have the same
  functionality. Instead, the developer building on Zoe is prompted to
  add their own custom logic at various points of the contract. By
  default, users can use the contract to trade one unit of one kind of
  digital assets for one unit of another kind of digital asset
  indefinitely as long as they alternate, but this behavior is meant
  to be altered by the smart contract developer. 

## Release v0.1.11 (11/1/2019)

* Added documentation explaining how the "trait" pattern can be used
  to customize the functionality of ERTP interfaces like purses and
  payments.
* Fix a race condition in Zoe that occurred when the same assay is
  used multiple times in the smart contract's array of assays.

## Release v0.1.10 (10/31/2019)

* Updated how fees are calculated in autoswap so that conservation of
  supply is not violated.

## Release v0.1.9 (10/30/2019)

* Added a write up of Zoe and smart contracts. This documentation
  now lives at [https://agoric.com/Documentation/](https://agoric.com/Documentation/)
* Cleaned up Zoe and the smart contracts running on Zoe
* Renamed a number of terms:
   * descOps -> unitOps
   * assetDesc -> units
   * conditions/offerConditions -> offerRules
   * offerDesc -> payoutRules
   * label.description -> label.allegedName
   * handoff service to sharing service
* Updated the timer interface to match timerServices

## Release v0.1.8 (10/22/2019)

* Added the registrar naming service. Objects can be registered with a
  name. The name supplied by the user is concatenated with a random
  string to produce a value like `myName_4409`, if `myName` was the
  user-supplied string. Then, this full name can be used to `get` the
  object back from the registrar naming service. This can be used to
  give public names to objects meant to be shared. 
* The contracts that run on Zoe have been updated. There are now six
  contracts: `automaticRefund`, used for testing and tutorials, which
  just gives the user their digital assets back, `autoswap`, a Uniswap
  implementation, `coveredCall` which involves an invite to make an
  offer that can act as an option, `publicAuction` which is a
  second-price auction, `publicSwap` which has the same swap logic
  as the `coveredCall` contract, but which doesn't use invites, and
  `simpleExchange` which is a naive decentralized exchange. 
* Tests have been written for "higher order" contract uses. That is, a
  invite for one contract used as the underlying right in another
  contract. 
* Exit conditions were added to Zoe. This allows the user to specify
  their exit conditions when they escrow an offer with Zoe. 

## Release v0.1.7 (10/15/2019)

* Added configurable endowments in contract evaluation for `Zoe` and the
  `contractHost`.

## Release v0.1.6 (10/14/2019)

* [Renamed many aspects of ERTP](https://github.com/Agoric/ERTP/commit/a34dad171eb8693b807a7fd959b14e938fedf42a):
    1. `amount`, the description of an asset (e.g. 3 bucks), is now
       `assetDesc`, short for 'asset description'.
    2. `quantity`, the measure of "how much" is in an asset (the '3'
       of '3 bucks') is now `extent`. We did this so that we
       can reference the extent of non-fungible assets as easily as
       fungible assets.
    3. `assay`, the operations for manipulating labeled
       extents/quantities, is now `descOps`. `DescOps` are the set
       operations on asset descriptions. This change makes it clear
       that the `descOps` are not an institution in the same sense as
       the mint and are merely operations.
    4. `strategy`, the operations for manipulating unlabeled extents,
       is now `extentOps`. This change makes it clear that it is the
       operations on extents, and it acts on extents in the same way
       that `descOps` acts on descriptions.
    5. Purses and payments are now together called `assetHolders`.
       Assets are the intangible (i.e. there is no asset object) erights held by purses and payments.
    6. `issuer` has been renamed to `assay`. `assay` and `mint` are
       two facets of the same institution. The `mint` has the
       authority to create new assets. The `assay` is the
       public-facing facet that is often widely known and can be used
       to claim exclusive access to a payment or make an empty purse,
       among other things. 
* Added [support for uploading contracts](https://github.com/Agoric/cosmic-swingset/blob/master/lib/ag-solo/contracts/README-contract.md) at the start of the Agoric testnet. 
* Added an [initial version of Zoe](https://github.com/Agoric/ERTP/commit/a32426aab307d31bd0fe1b6e1241d4a270964e31), our offer-safety enforcement layer.
  More on this to come.

## Release v0.1.5 (10/4/2019)

* Updated to `@agoric/swingset-vat` v0.0.26. Also updated a number of
  other packages.

* Fixed two bugs: `issuer.split` was trying to `vouch` for the amounts
  that were passed into the `split` function. When these amounts were
  created in a different vat, `vouch` failed. We realized that
  `assay.vouch` was unnecessary and `assay.coerce` could be used
  instead. The second bug fix was to replace `E.resolve` (deprecated)
  with `Promise.resolve` when we did the update of
  `@agoric/swingset-vat`.

## Release v0.1.4 (9/3/2019)

Core ERTP:
* Created a "list strategy" for assays. The list strategy allows
  non-fungible assets to have set operations. For instance, for the
  pixelList assay, each pixel is defined by the x and y coordinates,
  but there can be multiple pixels in a purse or payment. These
  multiple pixels can be combined together because they are put in a
  list. Similarly, we can remove pixels from a purse or payment by
  removing them from the list.
* Updated to `@agoric/swingset-vat` v0.0.20 and `ses` v0.6.0

## Release v0.1.3 (8/27/2019)

Core ERTP:
* Extracted assay set operations/arithmetic into "strategies". We had
  several different assays that described various types of fungible
  and non-fungible digital assets. A lot of the code was reused, but
  what differed was the custom logic for the arithmetic or set
  operations. For instance, a fungible token just adds or substracts
  natural numbers, but a non-fungible token might put something in or
  take something out of a list. We extracted that logic such that we
  could reuse `assay.js` for many different types of assets.
* Added an 'import manager' that maps strings to imported code. The
  import manager allows code such as configuration functions to be
  imported rather than passed as parameters.

## Release v0.1.2 (8/20/2019)

Core ERTP:
* Enforced "payment linearity". Whenever a payment is deposited,
  burned, or claimed, the entire payment must be used up ("killed").
  When a payment is killed, it is removed from the ledger entirely,
  not just reduced to an empty amount, as was previously the case. Two
  new methods to support payment linearity are added to `issuer`:
  `combine(paymentArray)` and `split(payment, amountsArray,
  namesArray)`. The methods for depositing are now
  `depositExactly(amount, payment)`, which checks that the `amount` is
  equal to the `payment` balance, and `depositAll(payment)`. The
  methods for burning are now `burnExactly` and `burnAll`, and the
  methods for claiming are now `claimExactly` and `claimAll`. 

## Release v0.1.1 (8/15/2019)

Core ERTP:
* Made the `makeMint` config act in a more "trait-like" manner.
  Instead of creating custom purses and payments by calling a function
  that returns the custom purse or payment, the "trait-like" style
  combines the core methods of a purse or payment with the custom
  methods, overriding any custom methods with the core methods if
  there is any overlap. 

Pixel Demo:
* Fixed a bug in which `tapFaucet` did not return newly minted
  `pixelPayments` but instead returned previously created ones.

## Release v0.1.0 (8/14/2019)

Core ERTP:
* Refactored contracts to make it easier for users to check the terms of
  a contract
* Added an IDL to describe the user-facing ERTP interface for mints,
  issuers, purses, payments, assays, and the contractHost.
* Renamed `getExclusive` and `getExclusiveAll` to `claim` and
  `claimAll`
* Added `equals` as an assay method

Pixel Demo:
* Created a new representation of hierarchical rights for the pixel
  demo, which allows holders of higher-level rights to revoke rights
  held further down. This follows the pattern of owner, tenant, and
  subtenant relationships in real property. 
* Made the gallery in the pixel demo use a long-lived contract host
  rather than creating a new contract host for each contract

## Release v0.0.9 (7/29/2019)

* Moved ERTP from the SwingSet repository
* Added pixel demo and handoff table to push ERTP design forward to
  non-fungible tokens with real uses
