# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.34.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.34.0...@agoric/cosmos@0.34.1) (2023-06-09)

**Note:** Version bump only for package @agoric/cosmos





### Updated go.mod and go.sum to include the barberry fix


## [0.34.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.32.2...@agoric/cosmos@0.34.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* **vstorage:** separate `set`, `legacySet` and `setWithoutNotify`

### Features

* allow external transfers to the reserve account ([664ec3d](https://github.com/Agoric/agoric-sdk/commit/664ec3da137eb689093f25d275cd795a86683590))
* flag to compress bundles in transit ([26e02d6](https://github.com/Agoric/agoric-sdk/commit/26e02d668f196a9632ead8c26ea2f98dc5e521a0))
* **casting:** handle noData value encoding ([530bc41](https://github.com/Agoric/agoric-sdk/commit/530bc41854cc7f5e5749e97e87fabc6163a17864))
* **cosmic-proto:** add state-sync artifacts proto ([4cc25f5](https://github.com/Agoric/agoric-sdk/commit/4cc25f56ba9e967039c2dff2cbb566eafb37aaea))
* **cosmic-swingset:** add after-commit action ([970a53f](https://github.com/Agoric/agoric-sdk/commit/970a53f827ded21b27525f6b0042bbc124c62d48))
* **cosmic-swingset:** Add context info to actionQueue items ([ed47435](https://github.com/Agoric/agoric-sdk/commit/ed4743519e81dbb05b6136de1f94bae0ae0f87c8))
* **cosmic-swingset:** basic snapshot wiring ([b1072d8](https://github.com/Agoric/agoric-sdk/commit/b1072d8b1ddabbb5f2835eb503c945fed3b6b080))
* **cosmic-swingset:** export swingStore kvData to vstorage ([be68431](https://github.com/Agoric/agoric-sdk/commit/be684315dc68ecf0cb603a8eb38ddd5418e996a6))
* **cosmic-swingset:** leave inbound in actionQueue ([a32299d](https://github.com/Agoric/agoric-sdk/commit/a32299df308eb869def870cca93f0b89e37e9110))
* **cosmic-swingset:** process highPriorityQueue actions ([182a96e](https://github.com/Agoric/agoric-sdk/commit/182a96e169c8cac7f31fbce014783fd6db72b64c))
* **cosmic-swingset:** remove unnecessary explicit activityhash ([5dcc44d](https://github.com/Agoric/agoric-sdk/commit/5dcc44d31be0c8a95a5749d768791fa35b72dbd3))
* **cosmos:** Export KVData as artifact ([283fded](https://github.com/Agoric/agoric-sdk/commit/283fded7ceedace3c916cf1e02eb25d1e4f87a88))
* **cosmos:** prioritize some swingset message senders ([83819cd](https://github.com/Agoric/agoric-sdk/commit/83819cddff33dcc8e2ff50ccb19f991d79b76ffc))
* **events:** only single base64 encode and augment with anchors ([1739e7d](https://github.com/Agoric/agoric-sdk/commit/1739e7d849063d3bde4f96e684ea78afa8ead703))
* **x/swingset:** Core eval is high priority ([740840f](https://github.com/Agoric/agoric-sdk/commit/740840ff432a8b5d2bb59c3880ca4982aa84b4bc))
* add new bean cost for bytes in permanent storage ([b2118b1](https://github.com/Agoric/agoric-sdk/commit/b2118b1afc3421e00387ff2246f0723f4ccedf94))
* functional upgrade-10 handler ([bfc0f7f](https://github.com/Agoric/agoric-sdk/commit/bfc0f7f4d6e7559712850e99ee11fa09fc42520c))
* tweak state-sync logging ([#7468](https://github.com/Agoric/agoric-sdk/issues/7468)) ([9ec9ce2](https://github.com/Agoric/agoric-sdk/commit/9ec9ce277897c47df8b64856eabd3119f89416ce))
* **cosmos:** wire swingset RestoreExtension ([c94e49d](https://github.com/Agoric/agoric-sdk/commit/c94e49dbca2cfa4fc2e1ceb3617a5f1b6489a0a1))
* **cosmos:** wire swingset SnapshotExtension ([7b0d99e](https://github.com/Agoric/agoric-sdk/commit/7b0d99ed1db8fa85757de994b7cf3a82fb967244))
* **vstorage:** Add placeholder migration logic ([35a3848](https://github.com/Agoric/agoric-sdk/commit/35a384862ac03123b54b7bc99743c41cf7a62c8d))
* **vstorage:** Export sub tree ([726e188](https://github.com/Agoric/agoric-sdk/commit/726e188481f4286583e48e6c3d87b654a7dd8d73))
* **vstorage:** Handle explicit delete of path ([f46557d](https://github.com/Agoric/agoric-sdk/commit/f46557d424840d7dfa3ca2b817175c707a53540f))
* null handlers for upgrade-10 ([267dc41](https://github.com/Agoric/agoric-sdk/commit/267dc41aa6e1e6e454cc85e8479e4a5969ec378d))
* null upgrade handler for upgrade-9 ([d6bf056](https://github.com/Agoric/agoric-sdk/commit/d6bf056369fc6b8816ca0e1fcb580d88a48ea06b))
* **vstorage:** batch and dedupe events per block ([312b608](https://github.com/Agoric/agoric-sdk/commit/312b60818835865de48cf3252819c56152f5876c))
* **vstorage:** separate `set`, `legacySet` and `setWithoutNotify` ([a242a0e](https://github.com/Agoric/agoric-sdk/commit/a242a0e7670300f2ac67eaf5d163d9ea13fff65c))


### Bug Fixes

* **agd:** run the bootstrap block during `agoric-upgrade-10` ([3bb75e3](https://github.com/Agoric/agoric-sdk/commit/3bb75e398b3827c9608137f8ccb5d31c468a3684))
* **cosmos:** don't log expected missing tx context of CORE_EVAL ([5516913](https://github.com/Agoric/agoric-sdk/commit/55169134e7f14d1c2b5a838568ce97a1b196cfbd))
* add mutex to synchronize read/write of active snapshot ([c0dacd2](https://github.com/Agoric/agoric-sdk/commit/c0dacd2e9f9750ad513522cd86f38e5eb5216bb1))
* correct for premature creation of provision account during upgrade ([4edf64f](https://github.com/Agoric/agoric-sdk/commit/4edf64f97ac70911119b91b800e51de139df74fc))
* correctly count the swingset messages in a cosmos message ([daa16b1](https://github.com/Agoric/agoric-sdk/commit/daa16b13e27d99458a7f06d3c1be3b88a11768e0))
* correctly detect a too-low expected uncompressed size ([0a44077](https://github.com/Agoric/agoric-sdk/commit/0a44077adbf6268f2fcddaaf4ebe74a4bc199397))
* create provision account at genesis time ([49ac310](https://github.com/Agoric/agoric-sdk/commit/49ac3101847bb851f2bf5d5e7fd64b2c9fa773a6))
* don't ignore error return from RegisterMigration ([e09822b](https://github.com/Agoric/agoric-sdk/commit/e09822bcafb5a48a9b1167bc6c05d810c417a35d))
* dont reflect key back in error ([a5309bb](https://github.com/Agoric/agoric-sdk/commit/a5309bb59a651e9a4eb54dbf2a65ed72657ca755))
* lint ([298eb9f](https://github.com/Agoric/agoric-sdk/commit/298eb9fc46d606347be96ca5b0695c10136ac8e4))
* pass msg into go func ([2b4248c](https://github.com/Agoric/agoric-sdk/commit/2b4248ca3df5af1fda5e1a7ee5d3f93184edbbb7))
* restore MsgDeliverInbound as one inbound message ([19e3f07](https://github.com/Agoric/agoric-sdk/commit/19e3f071b19f64e6f443ac31d76976ed91ac0e06))
* review feedback asks for 10MB uncompressed size limit ([4e28b72](https://github.com/Agoric/agoric-sdk/commit/4e28b72760c6f3ba74c2beebf3b8ace23a099812))
* test bug ([8ee32e9](https://github.com/Agoric/agoric-sdk/commit/8ee32e92ff6df9c2619266b1c89c0d78c03b8672))
* typo ([039e3d1](https://github.com/Agoric/agoric-sdk/commit/039e3d1b707d9dbbe989c129d773a41d8cca86e2))
* upgrade handler agoric-upgrade-10 ([c23890f](https://github.com/Agoric/agoric-sdk/commit/c23890f7818b26701e67ed17489e7b88eabeffbd))
* **cosmic-swingset:** Use BigInt for chainQueue bounds ([40a8abb](https://github.com/Agoric/agoric-sdk/commit/40a8abb5aeac9237613fd50e4bbacb33f8057ed9))
* **cosmos:** avoid low gas estimates when simulated admission fails ([a2a0f9d](https://github.com/Agoric/agoric-sdk/commit/a2a0f9db323e02d9340257e0c0b516aca28012db))
* **vbank:** only "module account" events cause balance updates ([f90f094](https://github.com/Agoric/agoric-sdk/commit/f90f0946c2ccf61339b63458927860f00e39cc9a))
* **vbank:** properly detect module accounts ([5b5f39d](https://github.com/Agoric/agoric-sdk/commit/5b5f39d4e48b4d990f6534a14890fe745b1e8946))


### Reverts

* Revert "fix: disable state-sync by default, until we've implemented it" ([30340fb](https://github.com/Agoric/agoric-sdk/commit/30340fbf14caaa0decb1dc1c0dd2ecec150c38d6))



## [0.33.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.32.2...@agoric/cosmos@0.33.0) (2023-02-17)


### Features

* null upgrade handler for upgrade-9 ([bfbc86f](https://github.com/Agoric/agoric-sdk/commit/bfbc86f32959c8e900bda3ed2bae7283e9975f66))


### Bug Fixes

* remove unneeded upgrade store loader ([e7a0ea0](https://github.com/Agoric/agoric-sdk/commit/e7a0ea0d8029ac131ca07ba90a4da210d4be6294))



### [0.32.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.32.1...@agoric/cosmos@0.32.2) (2022-10-18)


### Bug Fixes

* actually run the upgrade handler for test ([142b769](https://github.com/Agoric/agoric-sdk/commit/142b7696061e724c5bf25c627b1356610dc5fa75))
* allow test flag for update ([237c56e](https://github.com/Agoric/agoric-sdk/commit/237c56edbf9de28d6947d8f6e482aa554aae02f9))
* init in the right order ([3050d11](https://github.com/Agoric/agoric-sdk/commit/3050d11a9bff53251d9fb7ccfea7cb713fd14ca8))
* use fromVM instead of vm since vm is an import ([131f0db](https://github.com/Agoric/agoric-sdk/commit/131f0db9dfcd46aa04ce7e0b5115fc3735a175fd))



### [0.32.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.32.0...@agoric/cosmos@0.32.1) (2022-10-08)


### Bug Fixes

* implement upgrade handler ([0f64bf1](https://github.com/Agoric/agoric-sdk/commit/0f64bf15e78e27e7e3127a62740025ab823a4a96))
* review comments ([c67dc3c](https://github.com/Agoric/agoric-sdk/commit/c67dc3c17b1158c6a56ecd94856b55ec5f873983))



## [0.32.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.31.0...@agoric/cosmos@0.32.0) (2022-10-05)


### Features

* compute separate mempool limit for allowed inbound ([ebfc852](https://github.com/Agoric/agoric-sdk/commit/ebfc85272ab9c589d6a0ecb6dac5b59f931f3001))
* Cosmos-side ante handler, storage of allowed queue size ([20dc36b](https://github.com/Agoric/agoric-sdk/commit/20dc36b78efa43be608efaade25ce8e83d69c42d))
* **cosmic-swingset:** inboundQueue limit ([1b2d08f](https://github.com/Agoric/agoric-sdk/commit/1b2d08fcb4dd3de42f92358646d2c88e3b3687f5))
* **cosmic-swingset:** parse go->node send results as JSON ([2839223](https://github.com/Agoric/agoric-sdk/commit/2839223f4447deed7c32e73ca37ff142f7c563ef))
* notify on all balance changes ([56a7b88](https://github.com/Agoric/agoric-sdk/commit/56a7b88a814e7c763bed6e5a518e4bfa6b4638f7))
* run CI and mergify on release-pismo ([#6338](https://github.com/Agoric/agoric-sdk/issues/6338)) ([cf973d0](https://github.com/Agoric/agoric-sdk/commit/cf973d08c8a15678d2c3bdbddf96d330ce5246db))
* upgrade handler for upgrade 8 ([54c8746](https://github.com/Agoric/agoric-sdk/commit/54c8746247aafc4888f55be759d20b86faee4956))


### Bug Fixes

* detect CheckTx correctly, reject inbound before fees ([ae8fc79](https://github.com/Agoric/agoric-sdk/commit/ae8fc790d7966dd011da7c359b1a783b4aaa672e))
* **golang:** add actionQueue overflow check ([5a579d9](https://github.com/Agoric/agoric-sdk/commit/5a579d936f8de08b178ad12a72700c27d2c9dbc0))
* **x/swingset:** amino encoding details ([9a2c435](https://github.com/Agoric/agoric-sdk/commit/9a2c435e03350683142d70bc4610653845fbe99f))
* generate vbank notifications for zero balances ([9769886](https://github.com/Agoric/agoric-sdk/commit/976988605fb2de00ebceee3c98db8a4d7b8a0199))
* remove unneeded store upgrade ([f1cc0da](https://github.com/Agoric/agoric-sdk/commit/f1cc0dacb37948777329f7bc8ade6218e3f03a34))



## [0.31.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.30.0...@agoric/cosmos@0.31.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **vstorage:** separate `x/vstorage` from `x/swingset` module

### Features

* **cosmic-swingset:** Add chainStorage interface ([#5385](https://github.com/Agoric/agoric-sdk/issues/5385)) ([109ff65](https://github.com/Agoric/agoric-sdk/commit/109ff65845caaa503b03e2663437f62e7cdc686e)), closes [#4558](https://github.com/Agoric/agoric-sdk/issues/4558)
* **cosmos:** enable fees for MsgWalletAction, MsgWalletSpendAction ([406e13a](https://github.com/Agoric/agoric-sdk/commit/406e13a4baf4999fb500b484e8db7a9720ff6f62))
* **cosmos:** pay per provisioning power flag ([b22417e](https://github.com/Agoric/agoric-sdk/commit/b22417ec638158945fb35cdfa2c14f56136b90df))
* **golang:** add module account for provisioning ([6f4e845](https://github.com/Agoric/agoric-sdk/commit/6f4e84577ff0a58e7a59a2db31f2d95c650bbdf2))
* charge fee based on bundle size ([2ebdfea](https://github.com/Agoric/agoric-sdk/commit/2ebdfea4cd95912cffb6830869e6e4eb4d2cafc8))
* **cosmos:** report `state_change` events ([203b10d](https://github.com/Agoric/agoric-sdk/commit/203b10d09acace40939843e798d8ea4e1c5e94cd))
* **keeper:** storage path key encoding ([9a27e24](https://github.com/Agoric/agoric-sdk/commit/9a27e2400c7d325f4d9f95d549101216277ae07d))
* **vats:** Add support for configuring chainStorage nodes as sequences ([461204a](https://github.com/Agoric/agoric-sdk/commit/461204af30c5437a072d17a1703f3ec02395721b))
* **vstorage:** backport `SetStorageAndNotify` ([3ad5774](https://github.com/Agoric/agoric-sdk/commit/3ad5774d03794d0d544c2ac93005c4aa0107a318))
* **vstorage:** just one store for paths and data ([f17623c](https://github.com/Agoric/agoric-sdk/commit/f17623c6cad0204ca696735dc67424e5f37ae23f))
* **vstorage:** provide the data prefix for the storeKey ([f08b2ac](https://github.com/Agoric/agoric-sdk/commit/f08b2ac85830ab16ce1f1688cede98a6a64c8062))
* **vstorage:** separate `x/vstorage` from `x/swingset` module ([cf7b993](https://github.com/Agoric/agoric-sdk/commit/cf7b99334f7152694a98aec4a1e221794792287c))


### Bug Fixes

* move auth module earlier in genesis order ([d689d2e](https://github.com/Agoric/agoric-sdk/commit/d689d2e153917486f26a213cfd09c076eb3fa776))
* **cosmic-swingset:** Publish installation success and failure topic ([6a9f533](https://github.com/Agoric/agoric-sdk/commit/6a9f533b5b9095768f25b5642e001fd6e9aa8b47))
* **golang:** complete ledger support for MsgWallet{Spend}Action ([#5779](https://github.com/Agoric/agoric-sdk/issues/5779)) ([6cbf3c2](https://github.com/Agoric/agoric-sdk/commit/6cbf3c2b6c26174330cb692f2ae96044a531863f)), closes [#3628](https://github.com/Agoric/agoric-sdk/issues/3628)
* **golang:** swingset wallet-action was not quite wired up ([36f8bcd](https://github.com/Agoric/agoric-sdk/commit/36f8bcda3fe5e08202cdc3a27200b25f35eee589)), closes [#5144](https://github.com/Agoric/agoric-sdk/issues/5144)
* avoid race by requesting lien change as a delta ([a20afe7](https://github.com/Agoric/agoric-sdk/commit/a20afe7b2977ac1ef5763c1306776bd368139c48))
* remove unused message definition ([06a73c0](https://github.com/Agoric/agoric-sdk/commit/06a73c0f1081f518a171768361b632dace17af15))
* **chain-storage:** ensure state is exportable ([7f0b452](https://github.com/Agoric/agoric-sdk/commit/7f0b45226a8fc59d187024ed35389afcfacc227b))
* **cosmos:** exit 99 if `start` ever stops ([5f3ba46](https://github.com/Agoric/agoric-sdk/commit/5f3ba462fe6962bfa031dc4b2852ded7fc1cb1dc))
* **vats:** update `chainStorage` to use new `vstorage` API ([094044c](https://github.com/Agoric/agoric-sdk/commit/094044c6e75203a47d069242cfa225b2c15d80d5))
* **vstorage:** efficient ancestry ([68df8ed](https://github.com/Agoric/agoric-sdk/commit/68df8ede30eddfb2559654994dd8517cec4427b3))



## [0.30.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.29.0...@agoric/cosmos@0.30.0) (2022-05-28)


### Features

* **agd:** Add install-bundle command ([6d3e227](https://github.com/Agoric/agoric-sdk/commit/6d3e227314da09609ea17aead2c0e1b48510b128))
* **cosmic-swingset:** Handle InstallBundle messages ([e3ae969](https://github.com/Agoric/agoric-sdk/commit/e3ae969e4824ad5fb43c18e17c6ed863743a08e2))
* **cosmos:** divert all fees to the vbank/reserve ([50755ec](https://github.com/Agoric/agoric-sdk/commit/50755ece181033a6c26ab1a247e5dd3f318a099b))
* **golang/cosmos:** Add InstallBundle RPC message types to Protobuf definitions ([2d11fde](https://github.com/Agoric/agoric-sdk/commit/2d11fdeff8af1c671c9b833017456c9dd4f29ca1))
* **golang/cosmos:** Implement SDK InstallBundle message type ([b69b94f](https://github.com/Agoric/agoric-sdk/commit/b69b94f22e0a2953f3783868bfb30f31c2782f1f))
* **vbank:** separate smoothing and distribution fraction from epoch ([9116ede](https://github.com/Agoric/agoric-sdk/commit/9116ede69169ebb252faf069d90022e8e05c6a4e))
* **vbank:** update with `vbank/reserve` module account ([3799383](https://github.com/Agoric/agoric-sdk/commit/379938358a669b6b247474d3e7fabf576f75b01d))
* cli for sending Wallet{Spend}Action transactions ([ddb9629](https://github.com/Agoric/agoric-sdk/commit/ddb96291d37c3832e9593e3a9ed466d89fc8a824))


### Bug Fixes

* **keeper:** do not delete keys with descendents ([cb272ae](https://github.com/Agoric/agoric-sdk/commit/cb272ae97a042ceefd3af93b1b4601ca49dfe3a7))
* **vbank:** avoid panicing on invalid denoms ([adc22d6](https://github.com/Agoric/agoric-sdk/commit/adc22d6ba3125a7e878885b066019f0e6b95a6a1))
* Correct a dead link for package @agoric/cosmos ([#5143](https://github.com/Agoric/agoric-sdk/issues/5143)) ([1e51f6a](https://github.com/Agoric/agoric-sdk/commit/1e51f6a0bedefd0e33260a78b21ad72d31048f08))



## [0.29.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.28.0...@agoric/cosmos@0.29.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* can only lien vested tokens ([9eea226](https://github.com/Agoric/agoric-sdk/commit/9eea22695b43e899c2dc701a6cdc6b3aa2e5f987))
* track delegation in lien wrapper account ([05da39f](https://github.com/Agoric/agoric-sdk/commit/05da39fdbaaaeadef52f7eee874517fd1e8c0299))


### Bug Fixes

* prevent panic in `BindPort` ([5df86b0](https://github.com/Agoric/agoric-sdk/commit/5df86b0753367af883a2d1563a7267bcb15d1779))
* **cosmos:** make swingset key cli easier to use ([08f61a3](https://github.com/Agoric/agoric-sdk/commit/08f61a33da95cd2481cbb8bedf88b5f5c0784482))
* add account wrappers for whole account hierarchy ([633a07f](https://github.com/Agoric/agoric-sdk/commit/633a07f4179e55824ba37b2b341347dd7db83b64))
* **cosmosswingset:** check negativity before castnig to uint ([db6c3da](https://github.com/Agoric/agoric-sdk/commit/db6c3dab4162e3e52720e81d10b1798064b94817))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



## [0.28.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.27.3...@agoric/cosmos@0.28.0) (2022-02-24)


### ⚠ BREAKING CHANGES

* **cosmos:** RUN protocol etc. is not started by default.

To start RUN protocol, Pegasus, etc., use:

CHAIN_BOOTSTRAP_VAT_CONFIG=@agoric/vats/decentral-demo-config.json \
  agoric start local-chain

Stay tuned for a mechanism to turn them on via governance.

### Features

* **cosmic-swingset:** add tools for core-eval governance ([7368aa6](https://github.com/Agoric/agoric-sdk/commit/7368aa6c22be840733843b1da125eb659cc21d84))
* **cosmos:** add CoreEval and WalletAction protos ([0fe56dd](https://github.com/Agoric/agoric-sdk/commit/0fe56dda06017ee4f8906d6de0d3e1ae022db812))
* **cosmos:** implement `x/swingset` CoreEval and Wallet ([251cf41](https://github.com/Agoric/agoric-sdk/commit/251cf41b36c6c3b32678ef5a707794e6cdc07197))
* **cosmos:** robustly handle kvstore rollback ([c58ddb4](https://github.com/Agoric/agoric-sdk/commit/c58ddb490229741e57ef2130493608cbe9b13d4c))


### Bug Fixes

* **cosmos:** use core bootstrap by default ([2cbf293](https://github.com/Agoric/agoric-sdk/commit/2cbf293f4d5fab85fc8c14cd1566a2dd78e99f86))



### [0.27.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.27.2...@agoric/cosmos@0.27.3) (2022-02-21)


### Features

* **cosmos:** charge SwingSet fees at the Cosmos level ([5da6fec](https://github.com/Agoric/agoric-sdk/commit/5da6fece5c89c46a159970a734feb17bbd9a4d08))
* **cosmos:** set `swingset.params.bootstrap_vat_config` at genesis ([63e6e67](https://github.com/Agoric/agoric-sdk/commit/63e6e67957bad2bb05b7693f667e2efd1cbc9e48))
* **ibc:** reimplement `relativeTimeoutNs`, per `ibc-go` ([4673493](https://github.com/Agoric/agoric-sdk/commit/4673493df11f51e9aa018b0ded9632776759f1ee))


### Bug Fixes

* **cosmos:** remove unnecessary IBC complexity ([08f9a44](https://github.com/Agoric/agoric-sdk/commit/08f9a44751d0122f90368d6d64d512482a7dbf41))
* make `default-params.go` match `sim-params.js` ([550ba3a](https://github.com/Agoric/agoric-sdk/commit/550ba3a058cc2f7e0200479c6c3ceaf5dc39e21e))
* **sim-params:** update parameters to charge higher SwingSet fees ([341ddbb](https://github.com/Agoric/agoric-sdk/commit/341ddbbf43637c38eb194f3e7c6fd20fb1e5cb4e))



### [0.27.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.27.1...@agoric/cosmos@0.27.2) (2021-12-22)


### Features

* **cosmos:** adapt Agoric changes to new `gaiad` ([29535de](https://github.com/Agoric/agoric-sdk/commit/29535ded86ca87db70b2fa59d85dc4394bbba761))
* **cosmos:** upgrade to `gaia/releases/v6.0.0` ([2fe7008](https://github.com/Agoric/agoric-sdk/commit/2fe7008ed699bb543db0ad8c3fb750dfd8c6c425))


### Bug Fixes

* **cosmos:** add `upgradegaia.sh` to apply Gaia source upgrades ([b9669c5](https://github.com/Agoric/agoric-sdk/commit/b9669c5dfe80c9942aed620fdaa19b164c9f3600))
* **cosmos:** also look for `ag-chain-cosmos` in the `agd` directory ([f598d40](https://github.com/Agoric/agoric-sdk/commit/f598d40e0f55814bd17fc021503fbb45bddcfd67))
* **cosmos:** don't twiddle the genesis params, set them explicitly ([c9c8d81](https://github.com/Agoric/agoric-sdk/commit/c9c8d81f476a0df7559eae35c0dd323cd26a9d7b))
* **cosmos:** properly put `x/capability` in `SetOrderBeginBlockers` ([823f4fe](https://github.com/Agoric/agoric-sdk/commit/823f4fe86a8f2109f87746f00ffbd3eeb4bf1e38))



### [0.27.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.27.0...@agoric/cosmos@0.27.1) (2021-12-02)


### Features

* **ante:** record `tx_ante_admission_refused` counter ([7d31058](https://github.com/Agoric/agoric-sdk/commit/7d31058caf64a57ef127f129588162ecc7377bea))
* **beans:** use `sdk.Uint` whole beans to prevent negatives ([46f7fdc](https://github.com/Agoric/agoric-sdk/commit/46f7fdc9a03473c55cacf9d09251d52c71237842))
* **cosmic-swingset:** add swingset governance params support ([afec1ad](https://github.com/Agoric/agoric-sdk/commit/afec1ad273fd75005ddd33c829479ec1138e180f))
* **cosmos:** add ControllerAdmissionMsg to allow vm throttling ([f1dd757](https://github.com/Agoric/agoric-sdk/commit/f1dd7574ee4905631ae7aa84c033888951189656))
* **cosmos:** add some x/swingset fee charging params ([53e43bb](https://github.com/Agoric/agoric-sdk/commit/53e43bb221f7ab977d78ed789027c84fafb14e6d))
* **cosmos:** add swingset governance param proto definitions ([30557b4](https://github.com/Agoric/agoric-sdk/commit/30557b4ab0ccd5278f09f537f97b6867cfa80d30))
* **cosmos:** integrate new proto definitions ([a3e9689](https://github.com/Agoric/agoric-sdk/commit/a3e96898c7686a167881a7303c06c37f5b28edc0))
* **cosmos:** update code for ibc-go v2.0.0 ([459c530](https://github.com/Agoric/agoric-sdk/commit/459c5304c707a058c8108c91698e79e03a16ed59))
* **cosmos:** update x/swingset proto definitions ([5b61aac](https://github.com/Agoric/agoric-sdk/commit/5b61aac17e23fd4e11304ecdebb5c25167409e1e))
* **cosmos:** use snake-cased governance params ([41ca6dc](https://github.com/Agoric/agoric-sdk/commit/41ca6dcde40ef01a9ff1c9564d6b3763a779bf35))
* implement staking state query to support voting ([4d44aa4](https://github.com/Agoric/agoric-sdk/commit/4d44aa40d147389cae6083c1210fe287478257c7))


### Bug Fixes

* represent storage in same order in genesis state ([f584cd1](https://github.com/Agoric/agoric-sdk/commit/f584cd1a1256d4b27cf05a1b46bda1fb6aa591af))
* **cosmos:** make a repeated array of entries for `beans_per_unit` ([fa96b9a](https://github.com/Agoric/agoric-sdk/commit/fa96b9a369c595cdf6b09e9b57aaad7c06003709))
* **cosmos:** use newly-introduced proto types ([1e740b7](https://github.com/Agoric/agoric-sdk/commit/1e740b7dad6cf80897dc9b82202eca8af663ad27))
* comments and correct protoc options for the version ([7e04df7](https://github.com/Agoric/agoric-sdk/commit/7e04df799e148e6367727653a28ab7281271581d))
* downgrade grpc-gateway ([7b2295c](https://github.com/Agoric/agoric-sdk/commit/7b2295c6bb3a10a382bc0cfb790dc1ad9585e3c4))
* generate grpc-gateway and update buf configuration ([86010d1](https://github.com/Agoric/agoric-sdk/commit/86010d1b828e1587d95a3d18c51f6f03def7640c))
* upgrade and configure buf ([334aa87](https://github.com/Agoric/agoric-sdk/commit/334aa8796b318dd1efbff76da3e51d3fa077ca8e))
* **cosmos:** remove extra `types.Storage` wrapping from x/swingset ([d716f96](https://github.com/Agoric/agoric-sdk/commit/d716f966ff2582b7fcfa19f74e9b083182df29b0))



## [0.27.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.19...@agoric/cosmos@0.27.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* **cosmos:** compile agd binary to supercede ag-chain-cosmos

### Features

* **agoricd:** add new Golang binary without any SwingSet ([26c9994](https://github.com/Agoric/agoric-sdk/commit/26c99948edf4579aab124c3e74f350747e54b840))
* **agoricd:** have `agoricd start` delegate to `ag-chain-cosmos` ([1740795](https://github.com/Agoric/agoric-sdk/commit/174079552e1557dd13318d35435d401dfd51e05f))
* **cosmos:** compile agd binary to supercede ag-chain-cosmos ([6880646](https://github.com/Agoric/agoric-sdk/commit/6880646e6c26a2df2c2c6b95ac2ac5e230f41e76))
* revise x/lien to hold total liened amount ([842c9b0](https://github.com/Agoric/agoric-sdk/commit/842c9b0d98a8655b286c9f91c70bb6fddc3e0ba3))
* stateless lien module that upcalls to kernel ([603c0cf](https://github.com/Agoric/agoric-sdk/commit/603c0cfc8d2b4706dbbaa42d2ae057fa9dea65dc))


### Bug Fixes

* address review comments ([8af3e15](https://github.com/Agoric/agoric-sdk/commit/8af3e1547b4df32c604f6b628a62bff230666166))
* bugfixes, comments ([30dbeaa](https://github.com/Agoric/agoric-sdk/commit/30dbeaa7ef64f2c2dee9ddeb0a8c3929a611c21e))
* don't use manual key prefix ([50a881b](https://github.com/Agoric/agoric-sdk/commit/50a881be4971cd5c006867daca66eb6138276492))
* lien accounts must proxy all account methods ([db79c42](https://github.com/Agoric/agoric-sdk/commit/db79c42398195a09e8b3953dad35224f0943752b))



### [0.26.19](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.18...@agoric/cosmos@0.26.19) (2021-09-23)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.18](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.17...@agoric/cosmos@0.26.18) (2021-09-15)


### Features

* **cosmos:** publish event when `x/swingset` storage is modified ([8b63eb0](https://github.com/Agoric/agoric-sdk/commit/8b63eb08006807af547f4b1e166fef34c6cdde75))


### Bug Fixes

* **cosmos:** ensure simulated transactions can't trigger SwingSet ([997329a](https://github.com/Agoric/agoric-sdk/commit/997329a92f5380edab586f4186a2092ce361dcde))
* **cosmos:** the bootstrap block is not a simulation, either ([f906a54](https://github.com/Agoric/agoric-sdk/commit/f906a54a9a3cdb2342c8b274a7132fb6aa9e9fcc))
* **solo:** query WebSocket for mailbox instead of ag-cosmos-helper ([9a23c34](https://github.com/Agoric/agoric-sdk/commit/9a23c344e3d2c1980e27db23e3caa306a9bd655f))



### [0.26.17](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.16...@agoric/cosmos@0.26.17) (2021-08-21)


### Bug Fixes

* **cosmos:** the bootstrap block is not a simulation, either ([c4e4727](https://github.com/Agoric/agoric-sdk/commit/c4e472748b4eed4f7ad9650a5904a526e0c2e214))



### [0.26.16](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.15...@agoric/cosmos@0.26.16) (2021-08-21)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.14...@agoric/cosmos@0.26.15) (2021-08-18)


### Bug Fixes

* **cosmos:** don't version x/swingset proto yet ([4463e89](https://github.com/Agoric/agoric-sdk/commit/4463e8950f930216ec0a1270e3c5d3a8d6ec510d))
* **cosmos:** properly fail when querying missing egress/mailbox ([0c1be92](https://github.com/Agoric/agoric-sdk/commit/0c1be922f3742ea2e7fb7e82f567ab04b85f7ae1))
* **cosmos:** route x/swingset queries through GRPC ([34fc9cd](https://github.com/Agoric/agoric-sdk/commit/34fc9cd89ef1c018840ed019c481a1e255d96378))



### [0.26.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.13...@agoric/cosmos@0.26.14) (2021-08-17)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.12...@agoric/cosmos@0.26.13) (2021-08-16)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.9...@agoric/cosmos@0.26.12) (2021-08-15)


### Features

* **cosmos:** generate GRPC REST gateway implementations ([968b78e](https://github.com/Agoric/agoric-sdk/commit/968b78e40bd8a2bdb9aff1f141c1d9489b581354))
* **cosmos:** upgrade to v0.43.0 and add vbank governance hooks ([29137dd](https://github.com/Agoric/agoric-sdk/commit/29137dd8bd8b08776fff7a2a97405042da9222a5))
* **vbank:** add governance and query methods ([c80912e](https://github.com/Agoric/agoric-sdk/commit/c80912e6110b8d45d6b040ee9f3d9c1addaab804))


### Bug Fixes

* **cosmos:** deterministic storage modification and querying ([799ebdb](https://github.com/Agoric/agoric-sdk/commit/799ebdb77056ce40404358099a65f8ef673de6c9))
* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))

### 0.26.10 (2021-07-28)


### Features

* **cosmos:** use agoric-labs/cosmos-sdk v0.43.0-rc0.agoric ([6dfebdb](https://github.com/Agoric/agoric-sdk/commit/6dfebdb1493ae448f226cd5b1be399213068ca95))


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.26.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.9...@agoric/cosmos@0.26.11) (2021-08-14)


### Features

* **cosmos:** generate GRPC REST gateway implementations ([968b78e](https://github.com/Agoric/agoric-sdk/commit/968b78e40bd8a2bdb9aff1f141c1d9489b581354))
* **cosmos:** upgrade to v0.43.0 and add vbank governance hooks ([29137dd](https://github.com/Agoric/agoric-sdk/commit/29137dd8bd8b08776fff7a2a97405042da9222a5))
* **vbank:** add governance and query methods ([c80912e](https://github.com/Agoric/agoric-sdk/commit/c80912e6110b8d45d6b040ee9f3d9c1addaab804))


### Bug Fixes

* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))

### 0.26.10 (2021-07-28)


### Features

* **cosmos:** use agoric-labs/cosmos-sdk v0.43.0-rc0.agoric ([6dfebdb](https://github.com/Agoric/agoric-sdk/commit/6dfebdb1493ae448f226cd5b1be399213068ca95))


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.26.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.9...@agoric/cosmos@0.26.10) (2021-07-28)


### Features

* **cosmos:** use agoric-labs/cosmos-sdk v0.43.0-rc0.agoric ([6dfebdb](https://github.com/Agoric/agoric-sdk/commit/6dfebdb1493ae448f226cd5b1be399213068ca95))


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.26.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.8...@agoric/cosmos@0.26.9) (2021-07-01)


### Bug Fixes

* **vbank:** ensure that multiple balance updates are sorted ([204790f](https://github.com/Agoric/agoric-sdk/commit/204790f4c70e198cc06fe54e9205a71567ca6c83))



### [0.26.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.7...@agoric/cosmos@0.26.8) (2021-06-28)


### Bug Fixes

* **vbank:** be sure to persist nonce state in the KVStore ([9dc151a](https://github.com/Agoric/agoric-sdk/commit/9dc151a26c13c84351dba237d2e550f0cabb3d49))



### [0.26.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.6...@agoric/cosmos@0.26.7) (2021-06-25)


### Bug Fixes

* **cosmos:** have daemon also trap os.Interrupt for good luck ([9854446](https://github.com/Agoric/agoric-sdk/commit/98544462b469cce8b3365223fc31a4ca305e610f))



### [0.26.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.5...@agoric/cosmos@0.26.6) (2021-06-24)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.4...@agoric/cosmos@0.26.5) (2021-06-23)


### Bug Fixes

* move COMMIT_BLOCK immediately before the Cosmos SDK commit ([f0d2e68](https://github.com/Agoric/agoric-sdk/commit/f0d2e686a68cffbee2e97697594a7669051f0b40))



### [0.26.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.3...@agoric/cosmos@0.26.4) (2021-06-16)

**Note:** Version bump only for package @agoric/cosmos





### [0.26.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.2...@agoric/cosmos@0.26.3) (2021-06-15)


### Features

* enable VPURSE_GIVE_TO_FEE_COLLECTOR ([b56fa7f](https://github.com/Agoric/agoric-sdk/commit/b56fa7fc6c7180e3bcba3660da3ec897bc84d551))
* epoched reward distribution part 1 - buffer ([e6bbb6d](https://github.com/Agoric/agoric-sdk/commit/e6bbb6d9dcdc2f35c3fe324538455780253f5d38))
* epoched reward distribution part 2 - send ([331793b](https://github.com/Agoric/agoric-sdk/commit/331793b982062514b3a6c98d214f8a63ed6bcd7c))
* implement cosmos-sdk v0.43.0-beta1 ([7b05073](https://github.com/Agoric/agoric-sdk/commit/7b05073f1e8a458e54fa9ddd6ba037b9e472d59a))
* send AG_COSMOS_INIT supplyCoins instead of vpurse genesis ([759d6ab](https://github.com/Agoric/agoric-sdk/commit/759d6abe4ec5f798dca15a88d3523c63808a8b30))


### Bug Fixes

* apply recent renames, use aliases if possible ([d703223](https://github.com/Agoric/agoric-sdk/commit/d7032237fea884b28c72cb3bdbd6bc9deebf6d46))
* don't intercept SIGQUIT ([223185a](https://github.com/Agoric/agoric-sdk/commit/223185a3acf76f6577119b110f1d005d686b7187))
* handle amounts over int64 limits ([fabfacb](https://github.com/Agoric/agoric-sdk/commit/fabfacb326adf0bfc00fd4de66e33ad100a94606))
* quoting typo ([afb1c98](https://github.com/Agoric/agoric-sdk/commit/afb1c98cebaed03296b5112523518c0f6618f3e7))
* there is no "controller" port; we meant "storage" ([299baa7](https://github.com/Agoric/agoric-sdk/commit/299baa7ba66581483bdf8f0ac39ecbf2f53b411a))
* **golang:** exit Go on signals; no more SIGKILL just to quit ([b5222b3](https://github.com/Agoric/agoric-sdk/commit/b5222b3352ad71854472dce9f8561417576ddd97))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))



## [0.26.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.1...@agoric/cosmos@0.26.2) (2021-05-10)


### Bug Fixes

* a malformed case statement elided recipient vpurse updates ([5f4664d](https://github.com/Agoric/agoric-sdk/commit/5f4664de429740a266bbbd0ad6b1f868a2b4240b))
* update incorrect string cast where Sprint was needed ([c83dc19](https://github.com/Agoric/agoric-sdk/commit/c83dc198a23c844edaccacf351bb8911c893153b))





## [0.26.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.26.0...@agoric/cosmos@0.26.1) (2021-05-05)

**Note:** Version bump only for package @agoric/cosmos





# [0.26.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.25.4...@agoric/cosmos@0.26.0) (2021-05-05)


### Bug Fixes

* adjust git-revision.txt generation ([6a8b0f2](https://github.com/Agoric/agoric-sdk/commit/6a8b0f20df17d5427b1c70273bcc170c7945dc2a))


### Features

* **golang:** implement balance updates for virtual purses ([c4c485c](https://github.com/Agoric/agoric-sdk/commit/c4c485cbc2280464e632b1b4a2fa945e86ff8b36))
* donate RUN from the bootstrap payment on each provision ([43c5db5](https://github.com/Agoric/agoric-sdk/commit/43c5db5d819a3be059a5ead074aa96c3d87416c4))
* plumb through the genesis data to vpurse initialisation ([8105589](https://github.com/Agoric/agoric-sdk/commit/8105589dd7e14a7e8edbbac4a794d8eee2f30298))
* **vpurse:** connect to golang ([d2f719d](https://github.com/Agoric/agoric-sdk/commit/d2f719dce9936a129817a3781bc1de8c4367bb46))





## [0.25.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.25.3...@agoric/cosmos@0.25.4) (2021-04-22)

**Note:** Version bump only for package @agoric/cosmos





## [0.25.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.25.2...@agoric/cosmos@0.25.3) (2021-04-18)

**Note:** Version bump only for package @agoric/cosmos





## [0.25.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.25.1...@agoric/cosmos@0.25.2) (2021-04-16)

**Note:** Version bump only for package @agoric/cosmos





## [0.25.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.25.0...@agoric/cosmos@0.25.1) (2021-04-14)

**Note:** Version bump only for package @agoric/cosmos





# [0.25.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.5...@agoric/cosmos@0.25.0) (2021-04-13)


### Bug Fixes

* run swingset on genesis init before opening for business ([7e228d4](https://github.com/Agoric/agoric-sdk/commit/7e228d40d8d435727863c72c1ba19ca7267476ce))


### Features

* install Pegasus on "transfer" IBC port ([a257216](https://github.com/Agoric/agoric-sdk/commit/a2572163878bad9c6ba11914e02b8aacfefedeba))
* wait until genesis time has passed before continuing ([4d13843](https://github.com/Agoric/agoric-sdk/commit/4d13843db58fa1f7037386d54db13cbf786cd1d3))





## [0.24.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.4...@agoric/cosmos@0.24.5) (2021-04-07)

**Note:** Version bump only for package @agoric/cosmos





## [0.24.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.3...@agoric/cosmos@0.24.4) (2021-04-06)

**Note:** Version bump only for package @agoric/cosmos





## [0.24.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.2...@agoric/cosmos@0.24.3) (2021-03-24)


### Bug Fixes

* silence some noisy Go logs ([6ef8a69](https://github.com/Agoric/agoric-sdk/commit/6ef8a69b5c7845a33d1ec7bfeb6c74ece2fbab0f))





## [0.24.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.1...@agoric/cosmos@0.24.2) (2021-03-16)


### Bug Fixes

* golang/cosmos upgrades ([d18e9d3](https://github.com/Agoric/agoric-sdk/commit/d18e9d31de456b2c44a08f36e01bd4b6c2c237dc))
* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)





## [0.24.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmos@0.24.0...@agoric/cosmos@0.24.1) (2021-02-22)

**Note:** Version bump only for package @agoric/cosmos
