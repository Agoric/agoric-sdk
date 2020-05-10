# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.5.0...@agoric/swingset-vat@0.5.1) (2020-05-10)


### Bug Fixes

* rewrite liveslots use of HandledPromise, remove deliver() stall ([42c2193](https://github.com/Agoric/agoric-sdk/commit/42c2193ce62f527eb2dfa1b5bed4f8b32f2d452d))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.2...@agoric/swingset-vat@0.5.0) (2020-05-04)


### Bug Fixes

* get the encouragement dIBC working ([6bb1337](https://github.com/Agoric/agoric-sdk/commit/6bb13377c94e25df79481a42c3f280b7f4da43ed))
* harmonise the docs with the implementation ([88d2a0a](https://github.com/Agoric/agoric-sdk/commit/88d2a0aeb5cb6ebbece7bebc090b1b6697fdb8e1))
* ibcports->ibcport ([efb9d95](https://github.com/Agoric/agoric-sdk/commit/efb9d95c8fc5b69e76e9dc52236ebea2f98ee50c))
* improve bridge and network implementation ([1fca476](https://github.com/Agoric/agoric-sdk/commit/1fca4762e7cb458d14499b6b533bc0e4889e3842))
* introduce sleep to help mitigate a relayer race condition ([c0014d3](https://github.com/Agoric/agoric-sdk/commit/c0014d3108f28c01d507da1c7553295a3fde6b06))
* lint... ([1db8eac](https://github.com/Agoric/agoric-sdk/commit/1db8eacd5fdb0e6d6ec6d2f93bd29e7c9291da30))
* message legibilization shouldn't choke on non-JSON-parseable messages ([4267c52](https://github.com/Agoric/agoric-sdk/commit/4267c523c578ab0cc99ab091a27b4ec75ac90015))
* more dIBC inbound work ([6653937](https://github.com/Agoric/agoric-sdk/commit/665393779540c580d57f798aa01c62855e7b5278))
* move "crank 0" commit to after initialized flag is set ([f57c755](https://github.com/Agoric/agoric-sdk/commit/f57c755f9a30fd2200da0a9de8992e0cc0f4b000))
* proper inbound IBC listening ([3988235](https://github.com/Agoric/agoric-sdk/commit/3988235312806711c1837f80788ddc42ae7713dd))
* reimplement crossover connections ([bf3bd2a](https://github.com/Agoric/agoric-sdk/commit/bf3bd2ad78440dad42935e4a30b50de56a77ceba))
* reject all sends when the connection is closed ([61b0975](https://github.com/Agoric/agoric-sdk/commit/61b09750c6c89f0097addd9ee068751bc4a55e56))
* rename host->peer, and implement basic Multiaddr ([ef89315](https://github.com/Agoric/agoric-sdk/commit/ef893151189ab99016910582a8d5ca3aa96c4fda))
* return packet acknowledgements ([4cf6f2f](https://github.com/Agoric/agoric-sdk/commit/4cf6f2f210466fa049361f9d7c115a706ec6ff49))
* return the correct crossover side for inbound ([dc285d7](https://github.com/Agoric/agoric-sdk/commit/dc285d7f80197bf88fcc5961fe758d9cb891d7b4))
* separate multiaddr from network ([f3d7dcb](https://github.com/Agoric/agoric-sdk/commit/f3d7dcb289b376c4083dd63b1b7f8502640a5dc6))
* swingset: remove unused 'inbound' device ([f096e3b](https://github.com/Agoric/agoric-sdk/commit/f096e3b5afa78175f897736c2cf7f68d86dceb12))
* update docs and metadata to require Node.js v12.16.1 or higher ([#938](https://github.com/Agoric/agoric-sdk/issues/938)) ([d4e5f74](https://github.com/Agoric/agoric-sdk/commit/d4e5f7447d7172f519b97ff83b53f29c281710e7)), closes [#837](https://github.com/Agoric/agoric-sdk/issues/837) [#937](https://github.com/Agoric/agoric-sdk/issues/937) [#837](https://github.com/Agoric/agoric-sdk/issues/837) [#35](https://github.com/Agoric/agoric-sdk/issues/35)
* update tests to account for kernel tracking crank number ([700802d](https://github.com/Agoric/agoric-sdk/commit/700802d39a14c020a3514f3a3a22840f9d97a0bf))
* use harden ([453552b](https://github.com/Agoric/agoric-sdk/commit/453552b85839b125e516207750a8df87c34e4d41))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* add crank number to kernel state ([75e5d53](https://github.com/Agoric/agoric-sdk/commit/75e5d53d36862e630b3ee8e9628d2237493eb8ae))
* add Presence, getInterfaceOf, deepCopyData to marshal ([aac1899](https://github.com/Agoric/agoric-sdk/commit/aac1899b6cefc4241af04911a92ffc50fbac3429))
* add the network vat to ag-solo ([d88062c](https://github.com/Agoric/agoric-sdk/commit/d88062c9d35a10afaab82728123ca3d71b7d5189))
* allow pure handlers by passing the handler back in ([acf4bcc](https://github.com/Agoric/agoric-sdk/commit/acf4bcc585bbd03986080331830f34413ea7486d))
* begin getting working with loopback peer ([7729e86](https://github.com/Agoric/agoric-sdk/commit/7729e869793196cbc2f937260c0a320665056784))
* end-to-end dIBC across chains ([151ff3f](https://github.com/Agoric/agoric-sdk/commit/151ff3f9e0c92972aa7a21a6f55c1898db85b820))
* finish network router and multiaddr implementation ([dc74469](https://github.com/Agoric/agoric-sdk/commit/dc74469462b8fdc0f1fdc47dc4a9922a891902bd))
* first pass at channel API ([f45f04e](https://github.com/Agoric/agoric-sdk/commit/f45f04e88f8dc236ca509529dd7d45265449715e))
* get 'ibc/*/ordered/echo' handler working ([2795c21](https://github.com/Agoric/agoric-sdk/commit/2795c214cae8ac44eb5d19eb1b1aa0c066a22ecd))
* implement channel host handler ([4e68f44](https://github.com/Agoric/agoric-sdk/commit/4e68f441b46d70dee481387ab96e88f1e0b69bfa))
* implement the "sendPacket" transaction ([063c5b5](https://github.com/Agoric/agoric-sdk/commit/063c5b5c266187bc327dde568090dabf2bbfde8d))
* implement the network vat ([0fcd783](https://github.com/Agoric/agoric-sdk/commit/0fcd783576ecfab5430d3d905a53f22b3e01e95f))
* Improved console log diagnostics ([465329d](https://github.com/Agoric/agoric-sdk/commit/465329d1d7f740e82fa46da24be370e2081fcb33))
* introduce vats/ibc.js handler ([cb511e7](https://github.com/Agoric/agoric-sdk/commit/cb511e74e797bedbcce1aac4193780ae7abc8cfc))
* swingset: add 'bridge' device ([4b07cdd](https://github.com/Agoric/agoric-sdk/commit/4b07cddf5db86b3ee886b0aeb1a4932e664bdc39)), closes [#860](https://github.com/Agoric/agoric-sdk/issues/860)
* swingset: add networking.md ([74b53d4](https://github.com/Agoric/agoric-sdk/commit/74b53d420e9bc84d3b5e11555283e659556ea4b0))
* Treat state resulting from kernel initialization as if it resulted from a crank ([4763c02](https://github.com/Agoric/agoric-sdk/commit/4763c024c0fcae4471f525b385eb71548344d9df))





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.2-alpha.0...@agoric/swingset-vat@0.4.2) (2020-04-13)

**Note:** Version bump only for package @agoric/swingset-vat





## [0.4.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.1...@agoric/swingset-vat@0.4.2-alpha.0) (2020-04-12)


### Bug Fixes

* liveslots use the returned promise rather than our own ([3135d9a](https://github.com/Agoric/agoric-sdk/commit/3135d9a14c0b9e773419c6882ad00fb285b27303))
* tweak log levels ([b0b1649](https://github.com/Agoric/agoric-sdk/commit/b0b1649423f7b950904604ba997ddb25e413fe08))





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.1-alpha.0...@agoric/swingset-vat@0.4.1) (2020-04-02)


### Bug Fixes

* make unhandledRejections log louder ([313adf0](https://github.com/Agoric/agoric-sdk/commit/313adf0b30ef2e6069573e1bb683bbb01411b175))





## [0.4.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-vat@0.4.0...@agoric/swingset-vat@0.4.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-vat





# 0.4.0 (2020-03-26)


### Bug Fixes

* allow vats under SwingSet to unwrap their promises ([f2be5c7](https://github.com/Agoric/SwingSet/commit/f2be5c7806de93388e2641962539218313489fad))
* anachrophobia should crash hard ([42deaaf](https://github.com/Agoric/SwingSet/commit/42deaafc7082d42f5114134744e5fdd01cc93ad7)), closes [#68](https://github.com/Agoric/SwingSet/issues/68)
* first draft use collection equality ([6acbde7](https://github.com/Agoric/SwingSet/commit/6acbde71ec82101ec8da9eaafc729bab1fdd6df9))
* improve command device support ([c70b8a1](https://github.com/Agoric/SwingSet/commit/c70b8a10b04c5554b1a952daa584216227858bc5))
* input queuing, and use the block manager for fake-chain ([c1282c9](https://github.com/Agoric/SwingSet/commit/c1282c9e644fbea742846f96a80a06afe64664ba))
* let the caller handle dispatch rejections ([8a9761d](https://github.com/Agoric/SwingSet/commit/8a9761dcb49787a03bc302a1138a4e86a80ee360))
* make code clearer ([efc6b4a](https://github.com/Agoric/SwingSet/commit/efc6b4a369cc23813788f5626c61ec412e4e3f6a))
* make default log level for ag-chain-cosmos more compatible ([258e4c9](https://github.com/Agoric/SwingSet/commit/258e4c94746888f0392da19335cf7abc804c3b3a))
* remove 'Nat' from the set that SwingSet provides to kernel/vat code ([b4798d9](https://github.com/Agoric/SwingSet/commit/b4798d9e323c4cc16beca8c7f2547bce59334ae4))
* remove nondeterminism from ag-solo replay ([2855b34](https://github.com/Agoric/SwingSet/commit/2855b34158b71e7ffe0acd7680d2b3c218a5f0ca))
* secure the console and nestedEvaluate endowments ([ed13e80](https://github.com/Agoric/SwingSet/commit/ed13e8008628ee95cb1a5ee5cc5b8e9dd4640a32))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/SwingSet/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **solo:** get repl working again ([a42cfec](https://github.com/Agoric/SwingSet/commit/a42cfec9c8c087c77ec6e09d5a24edfe0d215c02))
* **swingset:** controller: enforce withSES==true ([e4d9b04](https://github.com/Agoric/SwingSet/commit/e4d9b04847bc5cc913f67fa308ff223779a10286))
* **swingset:** disable all non-SES tests ([b481008](https://github.com/Agoric/SwingSet/commit/b48100890d881e2678d4842993c6dcc067043eba))
* stringify an inboundHandler Error better ([6f80429](https://github.com/Agoric/SwingSet/commit/6f804291f7a348cef40899963b15a6274005a7f6))
* symbols no longer passable ([7290a90](https://github.com/Agoric/SwingSet/commit/7290a90444f70d2a9a2f5c1e2782d18bea00039d))
* **metering:** refactor names and implementation ([f1410f9](https://github.com/Agoric/SwingSet/commit/f1410f91fbee61903e82a81368675eef4fa0b836))
* **SwingSet:** ensure the registerEndOfCrank doesn't allow sandbox escape ([053c56e](https://github.com/Agoric/SwingSet/commit/053c56e19e5a4ff4eba5a1b7550ccac7e6dab5d7))
* **SwingSet:** passing all tests ([341718b](https://github.com/Agoric/SwingSet/commit/341718be335e16b58aa5e648b51a731ea065c1d6))
* **SwingSet:** remove Nat from nested evaluation contexts too ([69088d1](https://github.com/Agoric/SwingSet/commit/69088d1c225a8234b2f39a0490309615b5d0a047))
* **SwingSet:** remove redundant ${e} ${e.message} ([9251375](https://github.com/Agoric/SwingSet/commit/92513753bb8ec8b3dd28318bb26c7c7a58df2ba7))
* **timer:** don't enforce advancement, just prevent moving backwards ([7a0a509](https://github.com/Agoric/SwingSet/commit/7a0a50916ee98b4aad1288b34e4b1cda9b456437)), closes [#328](https://github.com/Agoric/SwingSet/issues/328)


### Features

* use anylogger to allow flexible message dispatch ([be8abc8](https://github.com/Agoric/SwingSet/commit/be8abc8fb8bb684273b13a1732a2bf509a962253))
* **metering:** allow the metering vat to register refill functions ([ce077a3](https://github.com/Agoric/SwingSet/commit/ce077a38aec75a01621ea6a115e919ae607e3aeb))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/SwingSet/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **spawner:** implement basic metering ([8bd495c](https://github.com/Agoric/SwingSet/commit/8bd495ce64ab20a4f7e78999846afe1f9bce96a4))
* **SwingSet:** pass all tests with metering installed ([d2dbd2c](https://github.com/Agoric/SwingSet/commit/d2dbd2c17db613faa18ccfa5903fa0160f90b35e))
