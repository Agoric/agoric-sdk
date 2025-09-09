# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/builders@0.2.0-u22.0...@agoric/builders@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @agoric/builders

## 0.2.0-u22.0 (2025-09-08)

### ⚠ BREAKING CHANGES

* rm redundant networkConfigs
* **chainHub:** register and retrieve non-cosmos chains
* remove orch.makeLocalAccount
* make Network and IBC vats durable (#8721)

### Features

*  smartWallet verstion 2 with watchedPromises ([5ed5107](https://github.com/Agoric/agoric-sdk/commit/5ed51078d39e643d91b572d9c50fad4a276d7ded))
* `ForwardOpts` accepts `intermediateRecipient` ([eb975f1](https://github.com/Agoric/agoric-sdk/commit/eb975f1df1587bc9307b27c20b7b236cc7fe386e))
* `ForwardOptsShape` ([50b1717](https://github.com/Agoric/agoric-sdk/commit/50b1717c1e40ed67a5e69810961ad8d0144c5f9e))
* `IcaAccountKit` accepts `relativeTimeoutNs` opt for outgoing tx packets ([57b4bde](https://github.com/Agoric/agoric-sdk/commit/57b4bdea6b22202d4e58b82b1ca6f94de660682a))
* `update-fee-config` proposal ([5d8775c](https://github.com/Agoric/agoric-sdk/commit/5d8775c409896369a931e6d78ae1d7958ad9d901))
* a proposal to upgrade scaledPriceAuthorities ([e5ed0ff](https://github.com/Agoric/agoric-sdk/commit/e5ed0ff6abcb83f52b32d49125e21e6e41923ed0))
* add `bech32Prefix?: string` to `CosmosChainInfo` ([cb9e1ee](https://github.com/Agoric/agoric-sdk/commit/cb9e1eeab9295b44ec009b82d73c457299e8d6f4))
* add axelar gmp core-eval and bootstrap tests ([e0d7ef8](https://github.com/Agoric/agoric-sdk/commit/e0d7ef82f1fc4ea42c6fc8ae7faaf5c74de8e36e))
* add priceFeed for StkAtom ([6a861df](https://github.com/Agoric/agoric-sdk/commit/6a861dfa14f42b4547a24ba31175a3b1a74c97c1))
* Add terminate-governed-instance.js proposal ([c2cb517](https://github.com/Agoric/agoric-sdk/commit/c2cb51779039ef2a5921efcc35b3b365a7b6159f)), closes [#10725](https://github.com/Agoric/agoric-sdk/issues/10725) [#10861](https://github.com/Agoric/agoric-sdk/issues/10861)
* add transfer method to CosmosOrchestrationAccount ([b1fdde1](https://github.com/Agoric/agoric-sdk/commit/b1fdde18b33237d1a2ea6f02938d998f55ce4d01))
* add upgrade zcf only proposal ([73e0bb8](https://github.com/Agoric/agoric-sdk/commit/73e0bb830e7612e74c8fb510b909db154d2b2219))
* added replace electorate proposal in chain upgrade ([4e88d9f](https://github.com/Agoric/agoric-sdk/commit/4e88d9f0412fe2b90efda30df0afbb61887bf35f))
* advancer with fees ([087f3a8](https://github.com/Agoric/agoric-sdk/commit/087f3a84a266fd0061f6d35c7b51f193de308f95))
* assetInfo as array of entries ([51e7a9c](https://github.com/Agoric/agoric-sdk/commit/51e7a9c3e3fb2cde44db2ffce817f353a17e76a3))
* auctioneer detects failing priceAuthority; requests new one ([#8691](https://github.com/Agoric/agoric-sdk/issues/8691)) ([8604b01](https://github.com/Agoric/agoric-sdk/commit/8604b011b072d7bef43df59c075bcff9582b8804)), closes [#8696](https://github.com/Agoric/agoric-sdk/issues/8696)
* **boot:** distribute FastUSDC contract fee builder, test ([7776298](https://github.com/Agoric/agoric-sdk/commit/7776298772a6e5178573fc3078ab0a5fbfea9f8a))
* **builders:** --noNoble option for init-fast-usdc ([508a3e0](https://github.com/Agoric/agoric-sdk/commit/508a3e0876d0fadac0e4a2fc1fa64b86ff8e5c2d))
* **builders:** fast-usdc builder w/CLI config ([9f45a05](https://github.com/Agoric/agoric-sdk/commit/9f45a0572777cfe26012b5f48ad4140eaea96dad))
* **builders:** fast-usdc oracleSet option for MAINNET, ... ([3bf01a2](https://github.com/Agoric/agoric-sdk/commit/3bf01a279e5b2c72d6667704a07056501012260e))
* **builders:** fast-usdc policy update builder ([8ded3d8](https://github.com/Agoric/agoric-sdk/commit/8ded3d8be612a6944b80f3f63ab6fb727c76d179))
* **builders:** non-ambient `strictPriceFeedProposalBuilder` in `priceFeedSupport.js` ([95174a2](https://github.com/Agoric/agoric-sdk/commit/95174a23671ed16f7497ef6b0edaa63a54f1343d))
* **builders:** to reconfigure Fast USDC ([833e674](https://github.com/Agoric/agoric-sdk/commit/833e67499acfe20e2d73c9322b8c3b28df52b1d6))
* Caip10RecordShape ([8a104f2](https://github.com/Agoric/agoric-sdk/commit/8a104f27cae9c6c1bd44c86d7bd2736fea333234))
* chain-capabilities.js constants ([52ff70a](https://github.com/Agoric/agoric-sdk/commit/52ff70a187df1fadc89ccc506228bc6d0ca48da6))
* **chainHub:** register and retrieve non-cosmos chains ([bd11be2](https://github.com/Agoric/agoric-sdk/commit/bd11be25656ad0dd9ea4ad18c85f74a11ef2e520))
* coreEval to update priceFeeds, auction, and vaultManager ([fd91f78](https://github.com/Agoric/agoric-sdk/commit/fd91f781ad721033d67485d1732272af0c689ae7))
* **cosmos:** add Reserve withdrawal upgrade ([9e97cbd](https://github.com/Agoric/agoric-sdk/commit/9e97cbd7438e3df5aec96091d18ecdcde720978b))
* **cosmos:** upgrade IBC vat for next release ([c994490](https://github.com/Agoric/agoric-sdk/commit/c99449081560480e7e2dd6fc069b12dbcc630370))
* examples/auto-stake-it.contract.js ([b87ecba](https://github.com/Agoric/agoric-sdk/commit/b87ecba0ea41f1397dbd513d8e4c541f1299fd3f)), closes [#9042](https://github.com/Agoric/agoric-sdk/issues/9042)
* export `DenomDetailShape` ([2dfddb3](https://github.com/Agoric/agoric-sdk/commit/2dfddb3fb2018d769b1acc1b32f4ff3b4c7f67b7))
* export `OrchestrationPowersShape` ([34b61ea](https://github.com/Agoric/agoric-sdk/commit/34b61eae918a5f02ba6e06ac7e15b24750494821))
* **fast-usdc:** write chain policies to vstorage ([#10532](https://github.com/Agoric/agoric-sdk/issues/10532)) ([9d6cff1](https://github.com/Agoric/agoric-sdk/commit/9d6cff17bb95ce5557758da242ca4646a87ac5b0))
* fusdc assetInfo and chainInfo by netname ([afb4f34](https://github.com/Agoric/agoric-sdk/commit/afb4f34518124b3809d1df07ea706743fa47f2b1))
* include issuerKeywordRecord in start-sendAnywhere.js ([0b97916](https://github.com/Agoric/agoric-sdk/commit/0b9791672f91890a9de13511d0a6e7290d30d4d5))
* **inter-protocol:** Add core-eval builder for depositing reserve withdrawal invitations ([#11678](https://github.com/Agoric/agoric-sdk/issues/11678)) ([754cd9e](https://github.com/Agoric/agoric-sdk/commit/754cd9e5fe69ad4921eb057140c1384f173bb4be)), closes [#11460](https://github.com/Agoric/agoric-sdk/issues/11460) [TypeError#1](https://github.com/Agoric/TypeError/issues/1) [TypeError#1](https://github.com/Agoric/TypeError/issues/1) [TypeError#1](https://github.com/Agoric/TypeError/issues/1) [v39#70001](https://github.com/Agoric/v39/issues/70001) [v39#70001](https://github.com/Agoric/v39/issues/70001) [#1](https://github.com/Agoric/agoric-sdk/issues/1) [v39#70001](https://github.com/Agoric/v39/issues/70001) [#1](https://github.com/Agoric/agoric-sdk/issues/1)
* make Network and IBC vats durable ([#8721](https://github.com/Agoric/agoric-sdk/issues/8721)) ([3d13c09](https://github.com/Agoric/agoric-sdk/commit/3d13c09363013e23726c2ac5fa299a8e5344fd8c))
* new 'builders' package ([00c88ab](https://github.com/Agoric/agoric-sdk/commit/00c88ab1615ed55a3928ae52e332be05a173d1f6))
* **orchestration:** add init-stakeOsmo.js to support .query tests ([b6df6c2](https://github.com/Agoric/agoric-sdk/commit/b6df6c230a902288f11f6217dbd1ca9701a9a8b6))
* **orchestration:** add stakeAtom example contract ([82f1901](https://github.com/Agoric/agoric-sdk/commit/82f1901ec6ecf5a802a72023d033609deeb053e1))
* **orchestration:** create ChainAccount ([ba75ed6](https://github.com/Agoric/agoric-sdk/commit/ba75ed692a565aae5c5124ad5220f6901576532e))
* **orchestration:** stakeAtom query balance ([9f0ae09](https://github.com/Agoric/agoric-sdk/commit/9f0ae09e389f1750c9e550d5e6893460d1e21d07))
* parameterize fusdc with chainInfo and assetInfo ([e5a8b64](https://github.com/Agoric/agoric-sdk/commit/e5a8b6489368f0bf3a099ce4c5ddf9607a6192c1))
* record instances that will be replaced so we can manage them ([c883c39](https://github.com/Agoric/agoric-sdk/commit/c883c39bbe4ec236a758030508fdf9f4fbd3ba9b))
* register interchain bank assets proposal ([0e20707](https://github.com/Agoric/agoric-sdk/commit/0e2070754d6811acd40cb026792d4295189ae771))
* registerChainsAndAssets ([e72782d](https://github.com/Agoric/agoric-sdk/commit/e72782dcc748b9e6a2879179cccf9866718f4e00))
* remove orch.makeLocalAccount ([5526337](https://github.com/Agoric/agoric-sdk/commit/552633753ff66f011f6cff7b701cd3cc8f808fbe)), closes [#10106](https://github.com/Agoric/agoric-sdk/issues/10106)
* remove prefix.key_prefix from IBCConnectionInfo ([78e701a](https://github.com/Agoric/agoric-sdk/commit/78e701a92de9fa62ac719211a3bd874efd3678ac)), closes [#9807](https://github.com/Agoric/agoric-sdk/issues/9807)
* repair KREAd contract on zoe upgrade ([84dd229](https://github.com/Agoric/agoric-sdk/commit/84dd2297eb74061b809a11bba3c2d2c5c697219f))
* replace committee proposal support for custom config ([d3014e3](https://github.com/Agoric/agoric-sdk/commit/d3014e3162eeb7e30c2976dd8fd3feb9b79efc54))
* save the outgoing EC Charter instance and kit ([c2c9be3](https://github.com/Agoric/agoric-sdk/commit/c2c9be3785f50e3b2cae3585d0e05d8b0a918283))
* send-anywhere inits chainHub ([2fa2f75](https://github.com/Agoric/agoric-sdk/commit/2fa2f7512b2a1a19d47f47b59e3206619794be18))
* **smart-wallet:** upgrade walletFactory for non-vbank assets ([a0c4ecf](https://github.com/Agoric/agoric-sdk/commit/a0c4ecf5d6f1e3874828f5b2fcf38f87cb0619ba))
* stakeBld contract ([a7e30a4](https://github.com/Agoric/agoric-sdk/commit/a7e30a4e43c00b2916d2d57c70063650e726321f))
* start a new auction in a3p-integration ([969235b](https://github.com/Agoric/agoric-sdk/commit/969235b18abbd15187e343d5f616f12177d224c4))
* update price feed proposal support for custom config ([8804ed2](https://github.com/Agoric/agoric-sdk/commit/8804ed28e259bf4ee9dd8872ccdd9ec42897e279))
* update settler reference proposal ([23e52dc](https://github.com/Agoric/agoric-sdk/commit/23e52dc7a074c3366a24bbd34a4df7a419fd992f))
* upgrade auction and vaults to use the new governor ([5aeac6d](https://github.com/Agoric/agoric-sdk/commit/5aeac6d2bd3a95357c9a725e01391b3d967530ff))
* upgrade v7-board and test it ([#10516](https://github.com/Agoric/agoric-sdk/issues/10516)) ([d8a109e](https://github.com/Agoric/agoric-sdk/commit/d8a109edcc78c977ef856131b52dd449e6a9d724)), closes [#10394](https://github.com/Agoric/agoric-sdk/issues/10394)
* **vat-transfer:** first cut at working proposal ([2864bd5](https://github.com/Agoric/agoric-sdk/commit/2864bd5c12300c3595df9676bcfde894dbe59b29))
* **vats:** provide init-localchain ([19e5aed](https://github.com/Agoric/agoric-sdk/commit/19e5aed4e8a2aad667c04023e0aea01712ff9b9c))
* **vats:** upgrade the orchestration core ([c2d9530](https://github.com/Agoric/agoric-sdk/commit/c2d9530e2d891bd9412969a43a9c5728cc3c2721))
* Zoe use watchPromise() to wait for contract finish ([#8453](https://github.com/Agoric/agoric-sdk/issues/8453)) ([6388a00](https://github.com/Agoric/agoric-sdk/commit/6388a002b53593f17a8d936d4e937efb7d065d97))

### Bug Fixes

* **agd:** upgrade all orchestration vats to new liveslots ([59fa82c](https://github.com/Agoric/agoric-sdk/commit/59fa82c4740e1ddace28e1389e3c7c875bcdf93e))
* **builders:** Overlook inspecific home type ([e499fc4](https://github.com/Agoric/agoric-sdk/commit/e499fc4749b24e4f178e43b401410a0e5f06fb17))
* **builders:** use proper `oracleBrand` subkey case ([52f02b7](https://github.com/Agoric/agoric-sdk/commit/52f02b75b6706ee455a32ff83617dd5afb7342a7))
* **orchestration:** denomAmounts must be non-negative ([#10458](https://github.com/Agoric/agoric-sdk/issues/10458)) ([40e0e4e](https://github.com/Agoric/agoric-sdk/commit/40e0e4e37503b611609d1752389477d8f14f1a8e))
* **orchestration:** makeAccount never resolves when icqEnabled: false ([a74b6a2](https://github.com/Agoric/agoric-sdk/commit/a74b6a27d5108c5e014d546b86c695e3fc8bf2e5))
* repair storage of zcfBundleCap and add a3p test ([72c7574](https://github.com/Agoric/agoric-sdk/commit/72c75740aff920ffb53231441d0f00a8747400f1))
* support issuerName separate from keyword in add-collateral-core ([f0b1559](https://github.com/Agoric/agoric-sdk/commit/f0b1559374fe67d10e92f20c85d90a6f07e03cf0))
* **types:** discriminate `ChainInfo` union on `namespace` ([0f9f3fc](https://github.com/Agoric/agoric-sdk/commit/0f9f3fcbdd9da33b2eca1c02a2f7189c5405e8ff))
* validate scriptArgs endowment ([6864614](https://github.com/Agoric/agoric-sdk/commit/68646147d3e95c68b4a90c9e37d888ef00e9d35d))
* write-chain-info after u17 ([fc1f3ce](https://github.com/Agoric/agoric-sdk/commit/fc1f3ce1fe03bb2018edd4eb55d6561312d5fbe8))

### Reverts

* Revert "chore: remove 'encoding' from ChainAddress" ([be9dee2](https://github.com/Agoric/agoric-sdk/commit/be9dee245a04714568a45ae8b328f54b20b43d8a))

### Miscellaneous Chores

* rm redundant networkConfigs ([8eebb66](https://github.com/Agoric/agoric-sdk/commit/8eebb665132f27f2f3de121f575052d5494e80f9))
