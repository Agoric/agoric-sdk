User-visible changes in ERTP:

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
