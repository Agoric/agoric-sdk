# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/builders@0.2.0-u18.0...@agoric/builders@0.2.0-u18.1) (2024-11-19)

**Note:** Version bump only for package @agoric/builders





## 0.2.0-u18.0 (2024-10-31)


### ⚠ BREAKING CHANGES

* remove orch.makeLocalAccount
* make Network and IBC vats durable (#8721)

### Features

*  smartWallet verstion 2 with watchedPromises ([5ed5107](https://github.com/Agoric/agoric-sdk/commit/5ed51078d39e643d91b572d9c50fad4a276d7ded))
* a proposal to upgrade scaledPriceAuthorities ([e5ed0ff](https://github.com/Agoric/agoric-sdk/commit/e5ed0ff6abcb83f52b32d49125e21e6e41923ed0))
* add priceFeed for StkAtom ([6a861df](https://github.com/Agoric/agoric-sdk/commit/6a861dfa14f42b4547a24ba31175a3b1a74c97c1))
* add transfer method to CosmosOrchestrationAccount ([b1fdde1](https://github.com/Agoric/agoric-sdk/commit/b1fdde18b33237d1a2ea6f02938d998f55ce4d01))
* add upgrade zcf only proposal ([73e0bb8](https://github.com/Agoric/agoric-sdk/commit/73e0bb830e7612e74c8fb510b909db154d2b2219))
* added replace electorate proposal in chain upgrade ([4e88d9f](https://github.com/Agoric/agoric-sdk/commit/4e88d9f0412fe2b90efda30df0afbb61887bf35f))
* auctioneer detects failing priceAuthority; requests new one ([#8691](https://github.com/Agoric/agoric-sdk/issues/8691)) ([8604b01](https://github.com/Agoric/agoric-sdk/commit/8604b011b072d7bef43df59c075bcff9582b8804)), closes [#8696](https://github.com/Agoric/agoric-sdk/issues/8696)
* **builders:** non-ambient `strictPriceFeedProposalBuilder` in `priceFeedSupport.js` ([95174a2](https://github.com/Agoric/agoric-sdk/commit/95174a23671ed16f7497ef6b0edaa63a54f1343d))
* coreEval to update priceFeeds, auction, and vaultManager ([fd91f78](https://github.com/Agoric/agoric-sdk/commit/fd91f781ad721033d67485d1732272af0c689ae7))
* examples/auto-stake-it.contract.js ([b87ecba](https://github.com/Agoric/agoric-sdk/commit/b87ecba0ea41f1397dbd513d8e4c541f1299fd3f)), closes [#9042](https://github.com/Agoric/agoric-sdk/issues/9042)
* include issuerKeywordRecord in start-sendAnywhere.js ([0b97916](https://github.com/Agoric/agoric-sdk/commit/0b9791672f91890a9de13511d0a6e7290d30d4d5))
* make Network and IBC vats durable ([#8721](https://github.com/Agoric/agoric-sdk/issues/8721)) ([3d13c09](https://github.com/Agoric/agoric-sdk/commit/3d13c09363013e23726c2ac5fa299a8e5344fd8c))
* new 'builders' package ([00c88ab](https://github.com/Agoric/agoric-sdk/commit/00c88ab1615ed55a3928ae52e332be05a173d1f6))
* **orchestration:** add init-stakeOsmo.js to support .query tests ([b6df6c2](https://github.com/Agoric/agoric-sdk/commit/b6df6c230a902288f11f6217dbd1ca9701a9a8b6))
* **orchestration:** add stakeAtom example contract ([82f1901](https://github.com/Agoric/agoric-sdk/commit/82f1901ec6ecf5a802a72023d033609deeb053e1))
* **orchestration:** create ChainAccount ([ba75ed6](https://github.com/Agoric/agoric-sdk/commit/ba75ed692a565aae5c5124ad5220f6901576532e))
* **orchestration:** stakeAtom query balance ([9f0ae09](https://github.com/Agoric/agoric-sdk/commit/9f0ae09e389f1750c9e550d5e6893460d1e21d07))
* remove orch.makeLocalAccount ([5526337](https://github.com/Agoric/agoric-sdk/commit/552633753ff66f011f6cff7b701cd3cc8f808fbe)), closes [#10106](https://github.com/Agoric/agoric-sdk/issues/10106)
* remove prefix.key_prefix from IBCConnectionInfo ([78e701a](https://github.com/Agoric/agoric-sdk/commit/78e701a92de9fa62ac719211a3bd874efd3678ac)), closes [#9807](https://github.com/Agoric/agoric-sdk/issues/9807)
* repair KREAd contract on zoe upgrade ([84dd229](https://github.com/Agoric/agoric-sdk/commit/84dd2297eb74061b809a11bba3c2d2c5c697219f))
* replace committee proposal support for custom config ([d3014e3](https://github.com/Agoric/agoric-sdk/commit/d3014e3162eeb7e30c2976dd8fd3feb9b79efc54))
* **smart-wallet:** upgrade walletFactory for non-vbank assets ([a0c4ecf](https://github.com/Agoric/agoric-sdk/commit/a0c4ecf5d6f1e3874828f5b2fcf38f87cb0619ba))
* stakeBld contract ([a7e30a4](https://github.com/Agoric/agoric-sdk/commit/a7e30a4e43c00b2916d2d57c70063650e726321f))
* start a new auction in a3p-integration ([969235b](https://github.com/Agoric/agoric-sdk/commit/969235b18abbd15187e343d5f616f12177d224c4))
* update price feed proposal support for custom config ([8804ed2](https://github.com/Agoric/agoric-sdk/commit/8804ed28e259bf4ee9dd8872ccdd9ec42897e279))
* upgrade auction and vaults to use the new governor ([5aeac6d](https://github.com/Agoric/agoric-sdk/commit/5aeac6d2bd3a95357c9a725e01391b3d967530ff))
* **vat-transfer:** first cut at working proposal ([2864bd5](https://github.com/Agoric/agoric-sdk/commit/2864bd5c12300c3595df9676bcfde894dbe59b29))
* **vats:** provide init-localchain ([19e5aed](https://github.com/Agoric/agoric-sdk/commit/19e5aed4e8a2aad667c04023e0aea01712ff9b9c))
* **vats:** upgrade the orchestration core ([c2d9530](https://github.com/Agoric/agoric-sdk/commit/c2d9530e2d891bd9412969a43a9c5728cc3c2721))
* Zoe use watchPromise() to wait for contract finish ([#8453](https://github.com/Agoric/agoric-sdk/issues/8453)) ([6388a00](https://github.com/Agoric/agoric-sdk/commit/6388a002b53593f17a8d936d4e937efb7d065d97))


### Bug Fixes

* **builders:** Overlook inspecific home type ([e499fc4](https://github.com/Agoric/agoric-sdk/commit/e499fc4749b24e4f178e43b401410a0e5f06fb17))
* **builders:** use proper `oracleBrand` subkey case ([52f02b7](https://github.com/Agoric/agoric-sdk/commit/52f02b75b6706ee455a32ff83617dd5afb7342a7))
* **orchestration:** makeAccount never resolves when icqEnabled: false ([a74b6a2](https://github.com/Agoric/agoric-sdk/commit/a74b6a27d5108c5e014d546b86c695e3fc8bf2e5))
* repair storage of zcfBundleCap and add a3p test ([72c7574](https://github.com/Agoric/agoric-sdk/commit/72c75740aff920ffb53231441d0f00a8747400f1))
* support issuerName separate from keyword in add-collateral-core ([f0b1559](https://github.com/Agoric/agoric-sdk/commit/f0b1559374fe67d10e92f20c85d90a6f07e03cf0))
* validate scriptArgs endowment ([6864614](https://github.com/Agoric/agoric-sdk/commit/68646147d3e95c68b4a90c9e37d888ef00e9d35d))
* write-chain-info after u17 ([fc1f3ce](https://github.com/Agoric/agoric-sdk/commit/fc1f3ce1fe03bb2018edd4eb55d6561312d5fbe8))
