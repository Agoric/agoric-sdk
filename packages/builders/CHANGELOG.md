# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u16.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/builders@0.2.0-u16.1...@agoric/builders@0.2.0-u16.2) (2024-07-10)

**Note:** Version bump only for package @agoric/builders





## [0.2.0-u16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/builders@0.2.0-u16.0...@agoric/builders@0.2.0-u16.1) (2024-07-10)

**Note:** Version bump only for package @agoric/builders





## 0.2.0-u16.0 (2024-07-02)


### ⚠ BREAKING CHANGES

* make Network and IBC vats durable (#8721)

### Features

*  smartWallet verstion 2 with watchedPromises ([5ed5107](https://github.com/Agoric/agoric-sdk/commit/5ed51078d39e643d91b572d9c50fad4a276d7ded))
* a proposal to upgrade scaledPriceAuthorities ([e5ed0ff](https://github.com/Agoric/agoric-sdk/commit/e5ed0ff6abcb83f52b32d49125e21e6e41923ed0))
* add priceFeed for StkAtom ([6a861df](https://github.com/Agoric/agoric-sdk/commit/6a861dfa14f42b4547a24ba31175a3b1a74c97c1))
* add upgrade zcf only proposal ([73e0bb8](https://github.com/Agoric/agoric-sdk/commit/73e0bb830e7612e74c8fb510b909db154d2b2219))
* auctioneer detects failing priceAuthority; requests new one ([#8691](https://github.com/Agoric/agoric-sdk/issues/8691)) ([8604b01](https://github.com/Agoric/agoric-sdk/commit/8604b011b072d7bef43df59c075bcff9582b8804)), closes [#8696](https://github.com/Agoric/agoric-sdk/issues/8696)
* **builders:** non-ambient `strictPriceFeedProposalBuilder` in `priceFeedSupport.js` ([52a6eeb](https://github.com/Agoric/agoric-sdk/commit/52a6eebd9e2c3d73edd5f4ae35c58a22774a3cd0))
* make Network and IBC vats durable ([#8721](https://github.com/Agoric/agoric-sdk/issues/8721)) ([3d13c09](https://github.com/Agoric/agoric-sdk/commit/3d13c09363013e23726c2ac5fa299a8e5344fd8c))
* new 'builders' package ([00c88ab](https://github.com/Agoric/agoric-sdk/commit/00c88ab1615ed55a3928ae52e332be05a173d1f6))
* **orchestration:** add stakeAtom example contract ([82f1901](https://github.com/Agoric/agoric-sdk/commit/82f1901ec6ecf5a802a72023d033609deeb053e1))
* **orchestration:** create ChainAccount ([ba75ed6](https://github.com/Agoric/agoric-sdk/commit/ba75ed692a565aae5c5124ad5220f6901576532e))
* **orchestration:** stakeAtom query balance ([9f0ae09](https://github.com/Agoric/agoric-sdk/commit/9f0ae09e389f1750c9e550d5e6893460d1e21d07))
* repair KREAd contract on zoe upgrade ([14040d4](https://github.com/Agoric/agoric-sdk/commit/14040d4fb2a1fcc8687e26ed9208d9824c579876))
* **smart-wallet:** upgrade walletFactory for non-vbank assets ([a0c4ecf](https://github.com/Agoric/agoric-sdk/commit/a0c4ecf5d6f1e3874828f5b2fcf38f87cb0619ba))
* stakeBld contract ([a7e30a4](https://github.com/Agoric/agoric-sdk/commit/a7e30a4e43c00b2916d2d57c70063650e726321f))
* start a new auction in a3p-integration ([969235b](https://github.com/Agoric/agoric-sdk/commit/969235b18abbd15187e343d5f616f12177d224c4))
* **vat-transfer:** first cut at working proposal ([2864bd5](https://github.com/Agoric/agoric-sdk/commit/2864bd5c12300c3595df9676bcfde894dbe59b29))
* **vats:** provide init-localchain ([19e5aed](https://github.com/Agoric/agoric-sdk/commit/19e5aed4e8a2aad667c04023e0aea01712ff9b9c))
* Zoe use watchPromise() to wait for contract finish ([#8453](https://github.com/Agoric/agoric-sdk/issues/8453)) ([6388a00](https://github.com/Agoric/agoric-sdk/commit/6388a002b53593f17a8d936d4e937efb7d065d97))


### Bug Fixes

* **builders:** use proper `oracleBrand` subkey case ([bf531c3](https://github.com/Agoric/agoric-sdk/commit/bf531c36c83958924a1792e0c263ee38f4a65a11))
* repair storage of zcfBundleCap and add a3p test ([72c7574](https://github.com/Agoric/agoric-sdk/commit/72c75740aff920ffb53231441d0f00a8747400f1))
* support issuerName separate from keyword in add-collateral-core ([f0b1559](https://github.com/Agoric/agoric-sdk/commit/f0b1559374fe67d10e92f20c85d90a6f07e03cf0))
