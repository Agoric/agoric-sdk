User-visible changes in ERTP:

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
