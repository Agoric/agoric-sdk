# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.14.3](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.14.2...@agoric/wallet-backend@0.14.3) (2023-06-09)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.14.2](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.14.1...@agoric/wallet-backend@0.14.2) (2023-06-02)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.14.1](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.14.0...@agoric/wallet-backend@0.14.1) (2023-05-24)

**Note:** Version bump only for package @agoric/wallet-backend





## [0.14.0](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.3...@agoric/wallet-backend@0.14.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers

### Features

* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric/issues/6822)


### Bug Fixes

* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **ERTP:** `getCurrentAmountNotifier` returns a `LatestTopic` ([735d005](https://github.com/Agoric/agoric/commit/735d005ec4f4087a4055d48ff1dd1801c9a3d836))
* code updates for new marshal ([292f971](https://github.com/Agoric/agoric/commit/292f971769db69e61782f96638c2f687c3f95ac2))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))



### [0.13.5](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.4...@agoric/wallet-backend@0.13.5) (2023-02-17)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.13.4](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.3...@agoric/wallet-backend@0.13.4) (2022-12-14)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.13.3](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.2...@agoric/wallet-backend@0.13.3) (2022-10-18)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.13.2](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.1...@agoric/wallet-backend@0.13.2) (2022-10-08)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.13.1](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.13.0...@agoric/wallet-backend@0.13.1) (2022-10-05)

**Note:** Version bump only for package @agoric/wallet-backend





## [0.13.0](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.12.1...@agoric/wallet-backend@0.13.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move some util where they are more reusable (#5990)
* **run-protocol:** rename to inter-protocol

### Features

* **cache:** makeChainStorageCoordinator ([a9b8f3e](https://github.com/Agoric/agoric/commit/a9b8f3ebe4ff3e25c857426781ae5c403198f234))
* **smart-wallet:** contract for wallet factory ([57eac62](https://github.com/Agoric/agoric/commit/57eac62e204dac3001e8e1643fcf04e1cf191071))
* **wallet:** expose `getCacheCoordinator()` over the bridge ([bb1e8af](https://github.com/Agoric/agoric/commit/bb1e8af58943942241856cad340c73bbe76e66ea))
* **wallet:** smart wallet performAction ([#5946](https://github.com/Agoric/agoric/issues/5946)) ([ab99e75](https://github.com/Agoric/agoric/commit/ab99e75cf1606f6892275f81696b9433e42fddc0))
* **wallet:** use the bridge's casting `makeDefaultLeader` ([4118825](https://github.com/Agoric/agoric/commit/4118825165d5db64253025338e4ff72353b37a15))
* **wallet-connection:** Connect dapp directly to wallet UI ([#5750](https://github.com/Agoric/agoric/issues/5750)) ([1dd584b](https://github.com/Agoric/agoric/commit/1dd584b195212705b1f74a8c89b7f3f121640e41))
* **wallet/api:** marshal brand and issuer board ids ([df1d955](https://github.com/Agoric/agoric/commit/df1d9559127f1d8bb8f77ae421f85092e8b297ae))
* **wallet/api:** marshal contexts for wallet, board ([#5883](https://github.com/Agoric/agoric/issues/5883)) ([088e144](https://github.com/Agoric/agoric/commit/088e1446a100932f801fb04d5881f80f5d94526f))


### Bug Fixes

* **wallet-api:** clarify some marshal code ([274f994](https://github.com/Agoric/agoric/commit/274f9941aa44f3049bd045877de170dc8bb1f8fe))
* **wallet-api:** tolerate null slots ([5cf9803](https://github.com/Agoric/agoric/commit/5cf9803a704189a40c752e76d047b0c534105564))
* import context requires board ids ([561fc72](https://github.com/Agoric/agoric/commit/561fc729f439033f9d3d2cb4266342ed905795c1))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric/issues/6174)) ([94625d3](https://github.com/Agoric/agoric/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* **wallet:** upgrade for new store coordinator ([51cfc04](https://github.com/Agoric/agoric/commit/51cfc0462187f7f459016b76a7583e87e0986f14))
* **wallet/api:** prune inactive historical offers ([#6078](https://github.com/Agoric/agoric/issues/6078)) ([b99db49](https://github.com/Agoric/agoric/commit/b99db49a54b6a8427a5da62c1205f7d0bba7649e))
* **wallet/contract:** bounded updates: recent offers / payments only ([#6095](https://github.com/Agoric/agoric/issues/6095)) ([64241cd](https://github.com/Agoric/agoric/commit/64241cd953efb5e50b5669b4d65088b71977d68e))
* userSeat allocation only for testing ([#5826](https://github.com/Agoric/agoric/issues/5826)) ([9cb561b](https://github.com/Agoric/agoric/commit/9cb561b39d56cc54e87258980d333d912e837f38))
* **wallet-api:** dont rely on attestation brand ([447380a](https://github.com/Agoric/agoric/commit/447380a754cd33aadf6246ac643c5ec8cae1230f))
* **walletFactory:** marshal using petnames ([#5743](https://github.com/Agoric/agoric/issues/5743)) ([5d49ad7](https://github.com/Agoric/agoric/commit/5d49ad79947f44a7cbe98d232ecde105223763d5))
* makePublishKit ([#5435](https://github.com/Agoric/agoric/issues/5435)) ([d8228d2](https://github.com/Agoric/agoric/commit/d8228d272cfe18aa2fba713fb5acc4e84eaa1e39))


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))



### [0.12.1](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.12.0...@agoric/wallet-backend@0.12.1) (2022-05-28)

**Note:** Version bump only for package @agoric/wallet-backend





## [0.12.0](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.11.0...@agoric/wallet-backend@0.12.0) (2022-05-09)


### Features

* **wallet:** support attestations in offers ([f993c0b](https://github.com/Agoric/agoric/commit/f993c0b5f44f2b8d6beba50748da0b4889a26b5c))



## [0.11.0](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.10.9...@agoric/wallet-backend@0.11.0) (2022-04-18)


### Features

* **wallet:** support reading notifiers from offer result ([934ed3c](https://github.com/Agoric/agoric/commit/934ed3c93b587ad7501fb6c122e8ef7be84ef940))
* **wallet-api:** allow preapproved bridge to set offer meta ([adbbaaf](https://github.com/Agoric/agoric/commit/adbbaaff21c7223f840bc0b409c07be8fda7d5c4))
* **wallet-api:** expose `E(wallet).lookup()` to traverse names ([5ef561d](https://github.com/Agoric/agoric/commit/5ef561d4f0cb96c743642d8e1713239f5cfe4721))
* **wallet-api:** send `proposalTemplate.arguments` as offer args ([9c769f1](https://github.com/Agoric/agoric/commit/9c769f11cc9d04fbd8ab1898f983774b60393544))


### Bug Fixes

* **wallet:** change notifiers to publicNotifiers ([2fe5492](https://github.com/Agoric/agoric/commit/2fe5492821826f31bee4f99347aeea5abbd626ab))
* **wallet-api:** don't drop unused invitations on the floor ([f63ed7e](https://github.com/Agoric/agoric/commit/f63ed7ef8f576d9f4807798c6befb46d4df517dd))



### [0.10.9](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.10.8...@agoric/wallet-backend@0.10.9) (2022-02-24)


### Bug Fixes

* **wallet:** don't publish depositFacet until we're ready to receive ([f448176](https://github.com/Agoric/agoric/commit/f448176fd64ef47da5af00cab029104fb187afc7))



### [0.10.8](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.10.7...@agoric/wallet-backend@0.10.8) (2022-02-21)


### Bug Fixes

* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* **wallet:** resolve home.wallet before exiting deploy.js ([f09eb66](https://github.com/Agoric/agoric/commit/f09eb665ee76a3f1f415ca3f094a064a4ea8241e))
* **wallet-backend:** default new purses to autodeposit ([9a06a92](https://github.com/Agoric/agoric/commit/9a06a926ce1c19b3483b10b27a19f37bd493006e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric/issues/4190)) ([fea822e](https://github.com/Agoric/agoric/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))



### [0.10.7](https://github.com/Agoric/agoric/compare/@agoric/wallet-backend@0.10.6...@agoric/wallet-backend@0.10.7) (2021-12-22)


### Bug Fixes

* **wallet:** properly get the first timerService value ([636e099](https://github.com/Agoric/agoric/commit/636e0994761998b0857232f9bdd6f0b3ac451b31))



### 0.10.6 (2021-12-02)

**Note:** Version bump only for package @agoric/wallet-backend





### [0.10.5](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.10.4...@agoric/dapp-svelte-wallet-api@0.10.5) (2021-10-13)


### Features

* **wallet-backend:** add `walletAdmin.getClockNotifier()` ([2902ec3](https://github.com/Agoric/agoric/commit/2902ec38f6110a5582f6906695b77911f4d43180))
* **wallet-backend:** attach timestamp and sequence metadata ([9e02962](https://github.com/Agoric/agoric/commit/9e02962b7c08d56ea1fe72970f3309998b734767))
* **wallet-connection:** handle dapp approval states ([32b7772](https://github.com/Agoric/agoric/commit/32b7772ed33ed512ed598bbfc5dcea16ed36a705))


### Bug Fixes

* **wallet-backend:** get tests passing ([1b4a22b](https://github.com/Agoric/agoric/commit/1b4a22b3b494203b924850e7d36fb65c2e339abb))



### [0.10.4](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.10.3...@agoric/dapp-svelte-wallet-api@0.10.4) (2021-09-23)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.10.3](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.10.2...@agoric/dapp-svelte-wallet-api@0.10.3) (2021-09-15)


### Features

* **wallet:** wire through the Zoe fee information ([f52ea9a](https://github.com/Agoric/agoric/commit/f52ea9a0a94b8d7c88a18afd603b22896306613f))


### Bug Fixes

* **wallet:** handle solo restarts while deploying wallet backend ([a6c7bf8](https://github.com/Agoric/agoric/commit/a6c7bf8d781d3b2c5350d6b47d61b1ea9293b8d4))



### [0.10.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.10.1...@agoric/dapp-svelte-wallet-api@0.10.2) (2021-08-21)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.10.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.10.0...@agoric/dapp-svelte-wallet-api@0.10.1) (2021-08-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.10.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.15...@agoric/dapp-svelte-wallet-api@0.10.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Features

* create feePurse in bootstrap and import to wallet ([4e9d5b0](https://github.com/Agoric/agoric/commit/4e9d5b0980cae94fdf6d8f78445da5282cbd974f))
* **wallet:** reenable invitationDetails ([6655857](https://github.com/Agoric/agoric/commit/6655857707c9e457b5fa42609355ac709f19d29f))
* **wallet:** set up a Zoe fee purse and forward invitationDetails ([42957ab](https://github.com/Agoric/agoric/commit/42957abc83e0152abc705ddcf36b22d2409a5443)), closes [#3669](https://github.com/Agoric/agoric/issues/3669)


### Bug Fixes

* **wallet:** never fail to suggestPetname ([dd4fbc1](https://github.com/Agoric/agoric/commit/dd4fbc166565e7ba1f1a0c06f513570305acefe7))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric/issues/3647)



### [0.9.15](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.14...@agoric/dapp-svelte-wallet-api@0.9.15) (2021-08-16)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.14](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.11...@agoric/dapp-svelte-wallet-api@0.9.14) (2021-08-15)

### 0.26.10 (2021-07-28)


### Bug Fixes

* some missing Fars ([#3498](https://github.com/Agoric/agoric/issues/3498)) ([8f77271](https://github.com/Agoric/agoric/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **wallet:** be more defensive when escrow is supposed to happen ([4130f6a](https://github.com/Agoric/agoric/commit/4130f6a9041b24680ac5cd9d8a31d9587cf0c871))
* **wallet:** be more robust with claiming payments ([0a67988](https://github.com/Agoric/agoric/commit/0a679889103fae9c15c37adaaa4af72dcc73b752))
* **wallet:** more robust addPayment method handles failed deposit ([7990569](https://github.com/Agoric/agoric/commit/79905692e15a1322c269c7f697bf78374dee4d95))



### [0.9.13](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.11...@agoric/dapp-svelte-wallet-api@0.9.13) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* some missing Fars ([#3498](https://github.com/Agoric/agoric/issues/3498)) ([8f77271](https://github.com/Agoric/agoric/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **wallet:** be more defensive when escrow is supposed to happen ([4130f6a](https://github.com/Agoric/agoric/commit/4130f6a9041b24680ac5cd9d8a31d9587cf0c871))
* **wallet:** be more robust with claiming payments ([0a67988](https://github.com/Agoric/agoric/commit/0a679889103fae9c15c37adaaa4af72dcc73b752))
* **wallet:** more robust addPayment method handles failed deposit ([7990569](https://github.com/Agoric/agoric/commit/79905692e15a1322c269c7f697bf78374dee4d95))



### [0.9.12](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.11...@agoric/dapp-svelte-wallet-api@0.9.12) (2021-07-28)


### Bug Fixes

* some missing Fars ([#3498](https://github.com/Agoric/agoric/issues/3498)) ([8f77271](https://github.com/Agoric/agoric/commit/8f77271b41a4589679ad95ff907126778466aba8))
* **wallet:** be more defensive when escrow is supposed to happen ([4130f6a](https://github.com/Agoric/agoric/commit/4130f6a9041b24680ac5cd9d8a31d9587cf0c871))
* **wallet:** be more robust with claiming payments ([0a67988](https://github.com/Agoric/agoric/commit/0a679889103fae9c15c37adaaa4af72dcc73b752))
* **wallet:** more robust addPayment method handles failed deposit ([7990569](https://github.com/Agoric/agoric/commit/79905692e15a1322c269c7f697bf78374dee4d95))



### [0.9.11](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.10...@agoric/dapp-svelte-wallet-api@0.9.11) (2021-07-01)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.10](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.9...@agoric/dapp-svelte-wallet-api@0.9.10) (2021-07-01)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.9](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.8...@agoric/dapp-svelte-wallet-api@0.9.9) (2021-06-28)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.8](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.7...@agoric/dapp-svelte-wallet-api@0.9.8) (2021-06-25)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.7](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.6...@agoric/dapp-svelte-wallet-api@0.9.7) (2021-06-24)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.6](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.5...@agoric/dapp-svelte-wallet-api@0.9.6) (2021-06-24)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.5](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.4...@agoric/dapp-svelte-wallet-api@0.9.5) (2021-06-23)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.4](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.3...@agoric/dapp-svelte-wallet-api@0.9.4) (2021-06-16)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





### [0.9.3](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.2...@agoric/dapp-svelte-wallet-api@0.9.3) (2021-06-15)


### Features

* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* remove references to @agoric/registrar ([ec6cc6d](https://github.com/Agoric/agoric/commit/ec6cc6d8f1da9ec5a38420b501562eaebfbdc76c))



## [0.9.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.1...@agoric/dapp-svelte-wallet-api@0.9.2) (2021-05-10)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.9.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.9.0...@agoric/dapp-svelte-wallet-api@0.9.1) (2021-05-05)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.9.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.8.4...@agoric/dapp-svelte-wallet-api@0.9.0) (2021-05-05)


### Bug Fixes

* update dapp-svelte-wallet to new packages ([a1dcabd](https://github.com/Agoric/agoric/commit/a1dcabd60790ef1effe16565ea33f9811b32fa09))
* update types and implementation now that Far preserves them ([a4695c4](https://github.com/Agoric/agoric/commit/a4695c43a09abc92a20c12104cfbfefb4cae2ff2))


### Features

* donate RUN from the bootstrap payment on each provision ([43c5db5](https://github.com/Agoric/agoric/commit/43c5db5d819a3be059a5ead074aa96c3d87416c4))
* **wallet:** subscribe to bank assets and fetch purses ([92a0a44](https://github.com/Agoric/agoric/commit/92a0a44b26a77d75668314f628ba28c4c58331a8))





## [0.8.4](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.8.3...@agoric/dapp-svelte-wallet-api@0.8.4) (2021-04-22)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.8.3](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.8.2...@agoric/dapp-svelte-wallet-api@0.8.3) (2021-04-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.8.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.8.1...@agoric/dapp-svelte-wallet-api@0.8.2) (2021-04-16)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.8.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.8.0...@agoric/dapp-svelte-wallet-api@0.8.1) (2021-04-14)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.8.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.7.1...@agoric/dapp-svelte-wallet-api@0.8.0) (2021-04-13)


### Features

* add contact address property and register depositFacet name ([feae632](https://github.com/Agoric/agoric/commit/feae6321259e29539ab637956e801d1321ba9a8e))





## [0.7.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.7.0...@agoric/dapp-svelte-wallet-api@0.7.1) (2021-04-07)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.7.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.6.1...@agoric/dapp-svelte-wallet-api@0.7.0) (2021-04-06)


### Bug Fixes

* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric/issues/2709)) ([85b674e](https://github.com/Agoric/agoric/commit/85b674e7942443219fa9828841cc7bd8ef909b47))


### Features

* integrate the economy's central token in chain bootstrap ([2288e60](https://github.com/Agoric/agoric/commit/2288e60bf2d85e2c9c9b08c479dbaad41284f55d))
* **dapp-svelte-wallet:** add getAgoricNames and getNamesByAddress ([7c8f4d5](https://github.com/Agoric/agoric/commit/7c8f4d55cd3956267a72882303d4430a72a58e70))





## [0.6.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.6.0...@agoric/dapp-svelte-wallet-api@0.6.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric/issues/2018)





# [0.6.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.3...@agoric/dapp-svelte-wallet-api@0.6.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric/issues/2647)
* **dapp-svelte-wallet:** add Far/Data annotations ([a826805](https://github.com/Agoric/agoric/commit/a826805d8734f6b5a02c0437726a87781e9ff0be)), closes [#2018](https://github.com/Agoric/agoric/issues/2018)


### Features

* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric/issues/2561)) ([1620307](https://github.com/Agoric/agoric/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))
* default new purses to autodeposit ([b210b4b](https://github.com/Agoric/agoric/commit/b210b4b918e8e67ab241d5d0c8907b437e58fc6c))





## [0.5.3](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.2...@agoric/dapp-svelte-wallet-api@0.5.3) (2021-02-22)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.5.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.1...@agoric/dapp-svelte-wallet-api@0.5.2) (2021-02-16)


### Bug Fixes

* Correlate sent errors with received errors ([73b9cfd](https://github.com/Agoric/agoric/commit/73b9cfd33cf7842bdc105a79592028649cb1c92a))
* Far and Remotable do unverified local marking rather than WeakMap ([#2361](https://github.com/Agoric/agoric/issues/2361)) ([ab59ab7](https://github.com/Agoric/agoric/commit/ab59ab779341b9740827b7c4cca4680e7b7212b2))
* message batches reduce wallet setup from 80 to 20 chain trips ([7d17f2f](https://github.com/Agoric/agoric/commit/7d17f2f5f7585adb5ae02a26489ef2e9abe7c5bb))
* review comments ([7db7e5c](https://github.com/Agoric/agoric/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* wire through the CapTP bootstrap message ([7af41bc](https://github.com/Agoric/agoric/commit/7af41bc13a778c4872863e2060874910d6c1fefa))





## [0.5.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.0...@agoric/dapp-svelte-wallet-api@0.5.1) (2020-12-10)


### Bug Fixes

* add more types and refactor naming of facets ([8f81091](https://github.com/Agoric/agoric/commit/8f810917e63aa8a2b78a523213310285abd49f8a))
* minor fixes while debugging purse notifiers ([bc4992a](https://github.com/Agoric/agoric/commit/bc4992ac65bba9007d44d242d6f0144072bf717b))
* replace "observable purse" with getCurrentAmountNotifier ([bdebc9e](https://github.com/Agoric/agoric/commit/bdebc9eedcb283ab6d12d40b1b3258cd1919d2fa))





# [0.5.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.0-dev.0...@agoric/dapp-svelte-wallet-api@0.5.0) (2020-11-07)


### Bug Fixes

* make wallet more robust, and handle decimals fully ([9c29e10](https://github.com/Agoric/agoric/commit/9c29e10225c3aef0717661674a7bdbdb2318231f))
* put all parsing and stringification into the wallet ui ([58ff9a3](https://github.com/Agoric/agoric/commit/58ff9a32f10778e76e379d8a81cabf655c26c580))


### Features

* update wallet for decimals ([898ce50](https://github.com/Agoric/agoric/commit/898ce50978bfeae94b5d342d94a0188b9a060a47))





# [0.5.0-dev.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.4.0...@agoric/dapp-svelte-wallet-api@0.5.0-dev.0) (2020-10-19)


### Features

* **zoe:** export src/contractFacet/fakeVatAdmin for dapps ([ea8568f](https://github.com/Agoric/agoric/commit/ea8568f7d2b67b10507d911c6585b1728ad3d011))





# [0.4.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.2...@agoric/dapp-svelte-wallet-api@0.4.0) (2020-10-11)


### Bug Fixes

* **wallet:** propagate offer handler exceptions to the WebSocket ([3965361](https://github.com/Agoric/agoric/commit/39653616bb45546593ba49cc59a8e6a0d1b515f2))
* add getBootstrap method to handler object ([bb1f525](https://github.com/Agoric/agoric/commit/bb1f5256bd6ab49c83cb46aee9e3a6557293f5b6))
* properly update inbox petnames ([00477b5](https://github.com/Agoric/agoric/commit/00477b58a0995d1cc1ad11f33312abaf7749fb20))


### Features

* allow CapTP URL handlers ([b3e1e61](https://github.com/Agoric/agoric/commit/b3e1e61b2a2dee7bd203bcffa23b2d1d5d1409bd))
* cleanups and fixes to the wallet ([db525f8](https://github.com/Agoric/agoric/commit/db525f85a72c578bffcd055c151743fa8176dcd2))
* pass through URL search params via wallet-bridge.html ([643636e](https://github.com/Agoric/agoric/commit/643636e3a0de564b4574a134368963a569252a96))





## [0.3.1-dev.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.1...@agoric/dapp-svelte-wallet-api@0.3.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.3.1-dev.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.0...@agoric/dapp-svelte-wallet-api@0.3.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.3.1-dev.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.0...@agoric/dapp-svelte-wallet-api@0.3.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.3.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.2.0...@agoric/dapp-svelte-wallet-api@0.3.0) (2020-09-16)


### Bug Fixes

* need to expose the wallet bridge to the dapp ([e520b8f](https://github.com/Agoric/agoric/commit/e520b8fc2afa6f24447140fa54581f4c25cf08cb))


### Features

* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





# 0.2.0 (2020-08-31)


### Bug Fixes

* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric/issues/1409)) ([2375b28](https://github.com/Agoric/agoric/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* make rename return a promise so as not to race ([712b095](https://github.com/Agoric/agoric/commit/712b095bb0d6157ea176d7c7a82aef92757d860c))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric/issues/1628)) ([1bae122](https://github.com/Agoric/agoric/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))


### Features

* add the Svelte wallet ([f950400](https://github.com/Agoric/agoric/commit/f950400eeb9323729616012ff1c319d05e087e93))
* use SES for the wallet frontend ([3ba89dc](https://github.com/Agoric/agoric/commit/3ba89dc4b2f5cf1d3a2cf60b3c7694a2dbf456c9))
