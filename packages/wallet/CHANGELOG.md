# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.18.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.18.2...@agoric/wallet@0.18.3) (2023-06-09)

**Note:** Version bump only for package @agoric/wallet





### [0.18.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.18.1...@agoric/wallet@0.18.2) (2023-06-02)

**Note:** Version bump only for package @agoric/wallet





### [0.18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.18.0...@agoric/wallet@0.18.1) (2023-05-24)

**Note:** Version bump only for package @agoric/wallet





## [0.18.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.17.0...@agoric/wallet@0.18.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* **makeChainInfo:** rpc param as authoritative

### Features

* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* **makeChainInfo:** optional apiAddrs ([6c59220](https://github.com/Agoric/agoric-sdk/commit/6c592203beb0624992aeb94be9cb5d85126cf040))
* **makeChainInfo:** rpc param as authoritative ([23ed917](https://github.com/Agoric/agoric-sdk/commit/23ed9174053936b8a22219ce5f56a357b52764d5))
* **wallet:** serve legacy wallet from solo HTTP ([4008b1c](https://github.com/Agoric/agoric-sdk/commit/4008b1ccc271b451ee63f9a4fcc06fb01b36a99e))
* **wallet-ui:** add terms dialog on first pageview ([821a1aa](https://github.com/Agoric/agoric-sdk/commit/821a1aace936077ae88477eccdb5c28cf70b4c07))
* **wallet-ui:** ammend terms text and link ([03b11d2](https://github.com/Agoric/agoric-sdk/commit/03b11d220c317184d57b941cee5911782cde711a))
* **wallet-ui:** link out to ToS ([9b27ceb](https://github.com/Agoric/agoric-sdk/commit/9b27cebc9f1e44bcc2079d9fa3a14b11fab919e4))
* omit "SEVERED: " in Wallet offers ([838f5d2](https://github.com/Agoric/agoric-sdk/commit/838f5d22d1e747bee2199b38c109b30e298a5fb8))


### Bug Fixes

* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric-sdk/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **ERTP:** `getCurrentAmountNotifier` returns a `LatestTopic` ([735d005](https://github.com/Agoric/agoric-sdk/commit/735d005ec4f4087a4055d48ff1dd1801c9a3d836))
* code updates for new marshal ([292f971](https://github.com/Agoric/agoric-sdk/commit/292f971769db69e61782f96638c2f687c3f95ac2))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric-sdk/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))
* **smart-wallet:** reenable provisioning options ([55f3ab1](https://github.com/Agoric/agoric-sdk/commit/55f3ab1a0842ae2cc60a05b55e17120e964570b5))
* **wallet-ui:** dont overrite all offers when adding new one ([6d4ef3a](https://github.com/Agoric/agoric-sdk/commit/6d4ef3a5cebf4f7f114788af8a9a8d020fd45684))



### [0.17.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.17.1...@agoric/wallet@0.17.2) (2023-02-17)

**Note:** Version bump only for package @agoric/wallet





### [0.17.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.17.0...@agoric/wallet@0.17.1) (2022-12-14)

**Note:** Version bump only for package @agoric/wallet





## [0.17.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.16.0...@agoric/wallet@0.17.0) (2022-10-18)


### Features

* **web-components:** add 'makeAgoricKeplrConnection' util ([#6452](https://github.com/Agoric/agoric-sdk/issues/6452)) ([0b4b1aa](https://github.com/Agoric/agoric-sdk/commit/0b4b1aac42379c68aabe807904f5bfd6670009c5))



## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.15.0...@agoric/wallet@0.16.0) (2022-10-08)


### Features

* **connection:** default to main ([06be161](https://github.com/Agoric/agoric-sdk/commit/06be1618c1bdf5ce5f3e791ca8bfaea287381a7e))
* **settings dialog:** assume Keplr ([721c604](https://github.com/Agoric/agoric-sdk/commit/721c6049bac92148e70df990b38964438ecd0297))
* **settings dialog:** pick known network configs ([ead4dbc](https://github.com/Agoric/agoric-sdk/commit/ead4dbcc7f5c4e80a20ae38d4f312bba88ae42ac))
* **settings dialog:** pick network-config by host ([4fd9b55](https://github.com/Agoric/agoric-sdk/commit/4fd9b55bbe7193784ffa13bb53eafe79ece901c2))
* **wallet-ui:** require 100IST in pool to provision smart wallet ([1c374ed](https://github.com/Agoric/agoric-sdk/commit/1c374ed1a990aad5e7e9a6d9800894352cf08c7a))
* **wallet/ui:** show JSON in keplr signer even without Ledger ([035dfe0](https://github.com/Agoric/agoric-sdk/commit/035dfe08f31ea8eaffae8db81b627942749b7444)), closes [#6424](https://github.com/Agoric/agoric-sdk/issues/6424)


### Bug Fixes

* **wallet-ui:** call firstCallback after wallet loads ([c56f5d1](https://github.com/Agoric/agoric-sdk/commit/c56f5d10eed437c7487ebb2b0da5e976bbb6cc33))
* **wallet-ui:** fix mainnet config option ([3cb5a95](https://github.com/Agoric/agoric-sdk/commit/3cb5a952b9653115b5fa9641aa03a58c5ce45a31))
* **wallet-ui:** update offers correctly ([21adc3a](https://github.com/Agoric/agoric-sdk/commit/21adc3a71c5b06ab9e6885528ab677a23c40bbb1))
* **wallet/ui:** signing offers (PSM trades) with Ledger ([6ed4ca7](https://github.com/Agoric/agoric-sdk/commit/6ed4ca7ad40239ccf0ad4c41b9cbd44b3be9b5f8))



## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.14.0...@agoric/wallet@0.15.0) (2022-10-05)


### Features

* **cli:** show status of invitations ([8506e6d](https://github.com/Agoric/agoric-sdk/commit/8506e6d87ef331e781c9d2e2251fdcf48e784e04))
* **keyManagement:** submitProvision ([94eae93](https://github.com/Agoric/agoric-sdk/commit/94eae93f20b35408efa327a5427482f3e3b087a1))
* **wallet-ui:** basic provisioning dialog ([3f01ea6](https://github.com/Agoric/agoric-sdk/commit/3f01ea656b1a88221002da033683b23634f10896))
* **wallet-ui:** bridge storage without click when possible ([84834d9](https://github.com/Agoric/agoric-sdk/commit/84834d9dac49de6482cf2f652853522169f4227f))
* **wallet-ui:** clean up ui states ([6a20c8d](https://github.com/Agoric/agoric-sdk/commit/6a20c8d3789e983b4b19f6f769610bb5de20c39d))
* **wallet-ui:** make provision dialog harder to close ([b1b2d7b](https://github.com/Agoric/agoric-sdk/commit/b1b2d7b906309f196f4d594ee8c16a14569279b3))
* **wallet-ui:** submit provision on dialog action ([8012e8f](https://github.com/Agoric/agoric-sdk/commit/8012e8f4d99c5cf8084d710a71058a38a6172889))
* **wallet-ui:** use new wallet.current node ([703eecd](https://github.com/Agoric/agoric-sdk/commit/703eecd0af917cd432d1f6a12e645a12ab9d2c39))


### Bug Fixes

* **wallet/ui:** amino encoding details (for Ledger) ([223b45d](https://github.com/Agoric/agoric-sdk/commit/223b45d0486cdd91cf06f48e6a60f5c75e06f8c0))
* avoid colliding with 'agoric' chain, e.g. in Keplr ([692084c](https://github.com/Agoric/agoric-sdk/commit/692084ce9328b11e23ab8b46025f83eb8d1b5b3d))
* **wallet-ui:** detect unprovisioned wallet ([1747d57](https://github.com/Agoric/agoric-sdk/commit/1747d5781f4ee594eca1ded76af4944c405e7000))
* **wallet-ui:** parse purse.brand in fetchCurrent ([3c8299c](https://github.com/Agoric/agoric-sdk/commit/3c8299c2f5cf70b531bf194e4f5509bf6cd6a7be))
* **wallet-ui:** show rejected offers properly ([7b77ee0](https://github.com/Agoric/agoric-sdk/commit/7b77ee0301060921dc6542daa7c4bef8960a2454))
* **wallet-ui:** wait until window loads to access keplr ([c9b4fc3](https://github.com/Agoric/agoric-sdk/commit/c9b4fc3e5a272fe4a2b6b12774b138fdfa58be95))



## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.13.1...@agoric/wallet@0.14.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **legacy-smart-wallet:** remove dead package
* **wallet-ui:** remove Solo wallet support
* **store:** move some util where they are more reusable (#5990)
* **run-protocol:** rename to inter-protocol

### Features

* **cache:** makeChainStorageCoordinator ([a9b8f3e](https://github.com/Agoric/agoric-sdk/commit/a9b8f3ebe4ff3e25c857426781ae5c403198f234))
* **smart-wallet:** contract for wallet factory ([57eac62](https://github.com/Agoric/agoric-sdk/commit/57eac62e204dac3001e8e1643fcf04e1cf191071))
* **wallet:** expose `getCacheCoordinator()` over the bridge ([bb1e8af](https://github.com/Agoric/agoric-sdk/commit/bb1e8af58943942241856cad340c73bbe76e66ea))
* **wallet:** smart wallet performAction ([#5946](https://github.com/Agoric/agoric-sdk/issues/5946)) ([ab99e75](https://github.com/Agoric/agoric-sdk/commit/ab99e75cf1606f6892275f81696b9433e42fddc0))
* **wallet:** some feedback when no smart wallet ([8057c35](https://github.com/Agoric/agoric-sdk/commit/8057c35d2a89b9d80d31c1da10279c248b3c6e68))
* **wallet:** use the bridge's casting `makeDefaultLeader` ([4118825](https://github.com/Agoric/agoric-sdk/commit/4118825165d5db64253025338e4ff72353b37a15))
* **wallet-connection:** Connect dapp directly to wallet UI ([#5750](https://github.com/Agoric/agoric-sdk/issues/5750)) ([1dd584b](https://github.com/Agoric/agoric-sdk/commit/1dd584b195212705b1f74a8c89b7f3f121640e41))
* **wallet-ui:** adapt smart wallet proposals ([cef7f34](https://github.com/Agoric/agoric-sdk/commit/cef7f34d6f418bc18155d02b9448a0f378ddc3f9))
* **wallet-ui:** connect to keplr with smart wallet ([#5744](https://github.com/Agoric/agoric-sdk/issues/5744)) ([3482e0d](https://github.com/Agoric/agoric-sdk/commit/3482e0d98748c9b7995c93cbef9a06b0ec0fbea8))
* **wallet-ui:** display set amounts ([#5654](https://github.com/Agoric/agoric-sdk/issues/5654)) ([1945069](https://github.com/Agoric/agoric-sdk/commit/1945069e3e838ecf4cb91a48027bcdcea310d848))
* **wallet-ui:** future-proof for `@agoric/casting`-enabled notifiers ([5eba88a](https://github.com/Agoric/agoric-sdk/commit/5eba88a195d3cd8bbb299d6100f5fbb98a9e4754))
* **wallet-ui:** more robust connection config ui ([#5685](https://github.com/Agoric/agoric-sdk/issues/5685)) ([b1a4c4b](https://github.com/Agoric/agoric-sdk/commit/b1a4c4b9258a8af3a98d6fc281c891229b9a79a4))
* **wallet-ui:** preview mode ([fedf049](https://github.com/Agoric/agoric-sdk/commit/fedf049435d7307311219fbab1b2b342ec6acce8))
* **wallet-ui:** reworking of wallet connections ([f8506f3](https://github.com/Agoric/agoric-sdk/commit/f8506f3c218bd321f35206eab143514bca8f268b))
* **wallet-ui:** start displaying balances ([0f36da9](https://github.com/Agoric/agoric-sdk/commit/0f36da99daef86f24670d606ae5fd1adb32b419b))
* **wallet-ui:** translate proposalTemplate to proposal ([bd91fed](https://github.com/Agoric/agoric-sdk/commit/bd91fede39bf5b430e1b8584e99070fb6ab56254))
* **wallet/api:** marshal brand and issuer board ids ([df1d955](https://github.com/Agoric/agoric-sdk/commit/df1d9559127f1d8bb8f77ae421f85092e8b297ae))
* **wallet/api:** marshal contexts for wallet, board ([#5883](https://github.com/Agoric/agoric-sdk/issues/5883)) ([088e144](https://github.com/Agoric/agoric-sdk/commit/088e1446a100932f801fb04d5881f80f5d94526f))
* **wallet/ui:** expose netconfig url to dapp bridge ([#5988](https://github.com/Agoric/agoric-sdk/issues/5988)) ([5098751](https://github.com/Agoric/agoric-sdk/commit/5098751d513ec86a912a545f6864deed86eacd20))
* **wallet/ui:** interactive, background signing ([#5877](https://github.com/Agoric/agoric-sdk/issues/5877)) ([e7e6529](https://github.com/Agoric/agoric-sdk/commit/e7e652986cb5410bc09152b8974d6c60cfbb0b28))
* contract for single on-chain wallet ([0184a89](https://github.com/Agoric/agoric-sdk/commit/0184a89403a3719f21dc61de37865512cdc819ae))
* read only smart wallet ([#5741](https://github.com/Agoric/agoric-sdk/issues/5741)) ([9f3745d](https://github.com/Agoric/agoric-sdk/commit/9f3745da424424ff9a2e4c8f7b26bb0de89dd3eb))
* store dapps in localstorage not contract ([#5804](https://github.com/Agoric/agoric-sdk/issues/5804)) ([2fc72d5](https://github.com/Agoric/agoric-sdk/commit/2fc72d5439a7d8e103b15a8afaad2a86c3d455c5))


### Bug Fixes

* **casting:** Align cosmjs deps ([0ba7a1f](https://github.com/Agoric/agoric-sdk/commit/0ba7a1f7a18d4f83afa04b3637f432fdd72f3cd8))
* **wallet-api:** clarify some marshal code ([274f994](https://github.com/Agoric/agoric-sdk/commit/274f9941aa44f3049bd045877de170dc8bb1f8fe))
* **wallet-api:** tolerate null slots ([5cf9803](https://github.com/Agoric/agoric-sdk/commit/5cf9803a704189a40c752e76d047b0c534105564))
* **wallet-ui:** don't crash if purse not found ([f0b591b](https://github.com/Agoric/agoric-sdk/commit/f0b591bdd2beda96d134bcbee5b3323a7ed40714))
* **wallet-ui:** get offer completion working again ([2e838a0](https://github.com/Agoric/agoric-sdk/commit/2e838a091b77b6f0adb77810c02a5b3f844a9307))
* **wallet-ui:** increase gas allowance ([53eff35](https://github.com/Agoric/agoric-sdk/commit/53eff35ddf01048add0ef7a74f16e45c57406bd6))
* **wallet-ui:** reverse iterate to process all update deltas ([65e681d](https://github.com/Agoric/agoric-sdk/commit/65e681d448a0a65b95837be59322f7298fdfef91))
* ALWAYS default to safe ([#6079](https://github.com/Agoric/agoric-sdk/issues/6079)) ([963b652](https://github.com/Agoric/agoric-sdk/commit/963b652c696e006fb2c4960fe6e36ca49530dd29))
* Fix test failures in packages other than "vats" ([364815b](https://github.com/Agoric/agoric-sdk/commit/364815b88429e3443734681b5b0771b7d824ebe8))
* import context requires board ids ([561fc72](https://github.com/Agoric/agoric-sdk/commit/561fc729f439033f9d3d2cb4266342ed905795c1))
* makePublishKit ([#5435](https://github.com/Agoric/agoric-sdk/issues/5435)) ([d8228d2](https://github.com/Agoric/agoric-sdk/commit/d8228d272cfe18aa2fba713fb5acc4e84eaa1e39))
* Remove lockdown unsafe monkey-patching hack ([8c3126d](https://github.com/Agoric/agoric-sdk/commit/8c3126d8301bc2c8f7bb0a2145469f6d9d96b669))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* **wallet:** upgrade for new store coordinator ([51cfc04](https://github.com/Agoric/agoric-sdk/commit/51cfc0462187f7f459016b76a7583e87e0986f14))
* **wallet-api:** dont rely on attestation brand ([447380a](https://github.com/Agoric/agoric-sdk/commit/447380a754cd33aadf6246ac643c5ec8cae1230f))
* **wallet-ui:** safely render invalid amount values ([#5617](https://github.com/Agoric/agoric-sdk/issues/5617)) ([23f0de1](https://github.com/Agoric/agoric-sdk/commit/23f0de16e2fb858df2f2fb93a8247029c1ab002d))
* **wallet/api:** prune inactive historical offers ([#6078](https://github.com/Agoric/agoric-sdk/issues/6078)) ([b99db49](https://github.com/Agoric/agoric-sdk/commit/b99db49a54b6a8427a5da62c1205f7d0bba7649e))
* **wallet/contract:** bounded updates: recent offers / payments only ([#6095](https://github.com/Agoric/agoric-sdk/issues/6095)) ([64241cd](https://github.com/Agoric/agoric-sdk/commit/64241cd953efb5e50b5669b4d65088b71977d68e))
* **wallet/ui:** change makeFollower to getUnserializer ([#5964](https://github.com/Agoric/agoric-sdk/issues/5964)) ([15179fb](https://github.com/Agoric/agoric-sdk/commit/15179fbabffb9db4588b5301d95014bdf6b9e0fd))
* **wallet/ui:** fix gas price in suggest chain ([21351bd](https://github.com/Agoric/agoric-sdk/commit/21351bd198536624d56235abb34032aca6c7e09e))
* **wallet/ui:** style connection component better ([#5984](https://github.com/Agoric/agoric-sdk/issues/5984)) ([94791c9](https://github.com/Agoric/agoric-sdk/commit/94791c933c678a1f5c8dd43721523db8468d0dd7))
* less unsafe. what breaks? ([#5922](https://github.com/Agoric/agoric-sdk/issues/5922)) ([ace75b8](https://github.com/Agoric/agoric-sdk/commit/ace75b864f93d922477094c464da973125dabf3b))
* userSeat allocation only for testing ([#5826](https://github.com/Agoric/agoric-sdk/issues/5826)) ([9cb561b](https://github.com/Agoric/agoric-sdk/commit/9cb561b39d56cc54e87258980d333d912e837f38))
* **walletFactory:** marshal using petnames ([#5743](https://github.com/Agoric/agoric-sdk/issues/5743)) ([5d49ad7](https://github.com/Agoric/agoric-sdk/commit/5d49ad79947f44a7cbe98d232ecde105223763d5))


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))
* **wallet-ui:** remove Solo wallet support ([d952e56](https://github.com/Agoric/agoric-sdk/commit/d952e561e7a6d7396af088a7977d20d8d8ef42f0))


### Miscellaneous Chores

* **legacy-smart-wallet:** remove dead package ([bb56ce8](https://github.com/Agoric/agoric-sdk/commit/bb56ce8ed0556949c5e434734cedf113ae649fdb))



### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.13.0...@agoric/wallet@0.13.1) (2022-05-28)


### Bug Fixes

* **wallet-ui:** put back missing dapps notifier ([2720247](https://github.com/Agoric/agoric-sdk/commit/272024775e3670b4ead5934a82e9625631e9ea77))
* **wallet-ui:** update state when resetting wallet connection ([eff4186](https://github.com/Agoric/agoric-sdk/commit/eff4186d9b30ff53897f0c683660ea1a3a22949d))



## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.12.0...@agoric/wallet@0.13.0) (2022-05-09)


### Features

* **wallet:** support attestations in offers ([f993c0b](https://github.com/Agoric/agoric-sdk/commit/f993c0b5f44f2b8d6beba50748da0b4889a26b5c))



## [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.9...@agoric/wallet@0.12.0) (2022-04-18)


### Features

* **wallet:** support reading notifiers from offer result ([934ed3c](https://github.com/Agoric/agoric-sdk/commit/934ed3c93b587ad7501fb6c122e8ef7be84ef940))
* **wallet-api:** allow preapproved bridge to set offer meta ([adbbaaf](https://github.com/Agoric/agoric-sdk/commit/adbbaaff21c7223f840bc0b409c07be8fda7d5c4))
* **wallet-api:** expose `E(wallet).lookup()` to traverse names ([5ef561d](https://github.com/Agoric/agoric-sdk/commit/5ef561d4f0cb96c743642d8e1713239f5cfe4721))
* **wallet-api:** send `proposalTemplate.arguments` as offer args ([9c769f1](https://github.com/Agoric/agoric-sdk/commit/9c769f11cc9d04fbd8ab1898f983774b60393544))
* **wallet-ui:** cheap rendering of offer arguments ([192500d](https://github.com/Agoric/agoric-sdk/commit/192500d019bc482437ed5224a12a76b2488cb23b))


### Bug Fixes

* **wallet:** change notifiers to publicNotifiers ([2fe5492](https://github.com/Agoric/agoric-sdk/commit/2fe5492821826f31bee4f99347aeea5abbd626ab))
* **wallet-api:** don't drop unused invitations on the floor ([f63ed7e](https://github.com/Agoric/agoric-sdk/commit/f63ed7ef8f576d9f4807798c6befb46d4df517dd))
* **wallet-ui:** don't add or strip `board:` prefix ([55d0a0a](https://github.com/Agoric/agoric-sdk/commit/55d0a0a79057a735076630a7c972ea1dbd327f71))



### [0.11.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.8...@agoric/wallet@0.11.9) (2022-02-24)


### Bug Fixes

* **wallet:** don't publish depositFacet until we're ready to receive ([f448176](https://github.com/Agoric/agoric-sdk/commit/f448176fd64ef47da5af00cab029104fb187afc7))



### [0.11.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.7...@agoric/wallet@0.11.8) (2022-02-21)


### Features

* example txn ([2cc8a45](https://github.com/Agoric/agoric-sdk/commit/2cc8a45e403f6bdd80566330ddf3f6e4e9477396))
* **wallet:** keplr connection ([259345e](https://github.com/Agoric/agoric-sdk/commit/259345e56c4cd48d3ff6f47da280d5d24b3548ac))
* **wallet-ui:** use new `WalletBackendAdapter` ([4c03015](https://github.com/Agoric/agoric-sdk/commit/4c03015d2cce617b959a0f3105a99d2a29ad65cd))


### Bug Fixes

* **wallet:** dont crash when purses arent loaded before payments ([2965063](https://github.com/Agoric/agoric-sdk/commit/296506378ea6197c74976849bcc54d7c34e34da9))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* use snackbar instead of window.alert ([a233c12](https://github.com/Agoric/agoric-sdk/commit/a233c1269643f201b9214fe132cd4e0d45de3137))
* **solo:** remove a symlink dependency in exchange for web config ([42fc52b](https://github.com/Agoric/agoric-sdk/commit/42fc52b9d7bd8217038164f92f0448c4540c6e64))
* **wallet:** fix crash when deleting dapps ([51f78ae](https://github.com/Agoric/agoric-sdk/commit/51f78ae7a0fcba6a68b68a790d706abea5b6e116))
* **wallet:** fix indefinite loading state ([c58f07d](https://github.com/Agoric/agoric-sdk/commit/c58f07ddd97e6bf06da99284df6eaf2fcb5f2f46))
* **wallet:** fix offer id reference ([#4393](https://github.com/Agoric/agoric-sdk/issues/4393)) ([8c9dae7](https://github.com/Agoric/agoric-sdk/commit/8c9dae71bd3d3bf06d562f38c67dfb46be7db1ca))
* **wallet:** handle cancelled offer state ([#4292](https://github.com/Agoric/agoric-sdk/issues/4292)) ([9dd2dc4](https://github.com/Agoric/agoric-sdk/commit/9dd2dc4f0ed62bed0f6a300dc04c4f0d60d0a65a))
* **wallet:** resolve home.wallet before exiting deploy.js ([f09eb66](https://github.com/Agoric/agoric-sdk/commit/f09eb665ee76a3f1f415ca3f094a064a4ea8241e))
* **wallet-backend:** default new purses to autodeposit ([9a06a92](https://github.com/Agoric/agoric-sdk/commit/9a06a926ce1c19b3483b10b27a19f37bd493006e))
* **wallet-ui:** flatten schema into `actions` and iterators ([21bdfd1](https://github.com/Agoric/agoric-sdk/commit/21bdfd142df0aee91ad19b882a9b8f79a3894e95))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))



### [0.11.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.6...@agoric/wallet@0.11.7) (2021-12-22)


### Features

* **wallet:** add help link to documentation ([977262e](https://github.com/Agoric/agoric-sdk/commit/977262e596259788a773f0fe17eb61fb03d30ea4))


### Bug Fixes

* **wallet:** properly get the first timerService value ([636e099](https://github.com/Agoric/agoric-sdk/commit/636e0994761998b0857232f9bdd6f0b3ac451b31))
* **wallet:** render issuer brand correctly ([f648c19](https://github.com/Agoric/agoric-sdk/commit/f648c19bbf397e9b322e7b990025157c124d2156))



### 0.11.6 (2021-12-02)

**Note:** Version bump only for package @agoric/wallet
