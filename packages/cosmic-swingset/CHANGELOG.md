# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.15.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.1...@agoric/cosmic-swingset@0.15.0-alpha.0) (2020-04-12)


### Bug Fixes

* better detection of already-listening ports ([6194c31](https://github.com/Agoric/agoric-sdk/commit/6194c31a9c7405f017666ac6de29b054b3e87c9d))
* change the account prefix to "agoric" and app name to Agoric ([0c14de9](https://github.com/Agoric/agoric-sdk/commit/0c14de900c008afb8a09eeeddaff6547be7096d2))
* cosmic-swingset should use disk-backed storage ([da0613a](https://github.com/Agoric/agoric-sdk/commit/da0613a58fa9711d64584ee1cd7886309cff52fd)), closes [#899](https://github.com/Agoric/agoric-sdk/issues/899)
* tweak log levels ([b0b1649](https://github.com/Agoric/agoric-sdk/commit/b0b1649423f7b950904604ba997ddb25e413fe08))


### Features

* introduce a wrapper around ag-solo to start in inspect mode ([93e4887](https://github.com/Agoric/agoric-sdk/commit/93e488790da490d997c7d707b1340fc7be5b33b7))
* use SETUP_HOME/cosmos-delegates.txt and increase defaults ([5e87ae1](https://github.com/Agoric/agoric-sdk/commit/5e87ae1c501adf5b35371c30dc999bfcea8c75e6))





## [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.0...@agoric/cosmic-swingset@0.14.1) (2020-04-03)


### Bug Fixes

* make provisioning server work again ([c7cf3b3](https://github.com/Agoric/agoric-sdk/commit/c7cf3b3e0d5e0966ce87639ca1aa36546f365e38))





# [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.0-alpha.0...@agoric/cosmic-swingset@0.14.0) (2020-04-02)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.14.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.13.0...@agoric/cosmic-swingset@0.14.0-alpha.0) (2020-04-02)


### Bug Fixes

* add `single-node` subcommand on the Docker entrypoint ([210edb6](https://github.com/Agoric/agoric-sdk/commit/210edb683280791b0e74831860c7e93176dadbed))
* have a generic IBCChannelHandler that takes ChannelTuples ([3bff564](https://github.com/Agoric/agoric-sdk/commit/3bff564a4ffa6f43e4496871b628ea1bfaa4c568))
* properly use EncodedLen ([0633825](https://github.com/Agoric/agoric-sdk/commit/063382581ba472ec5adb0eb5760f501148158010))
* stringify queued objects when sending over WebSocket ([6c45374](https://github.com/Agoric/agoric-sdk/commit/6c453742c773f79dc956a56515a3701152341bc7))
* use the PacketI interface where possible ([48c3bf5](https://github.com/Agoric/agoric-sdk/commit/48c3bf5e80b6fd8d4fec3e73a4a2225eb1ca5ae8))


### Features

* implement the Go side of dynamic IBC ([cf2d894](https://github.com/Agoric/agoric-sdk/commit/cf2d8945eecd8871898c127e9748ea7c5247628e))
* just ack IBC packets and close ([88257f8](https://github.com/Agoric/agoric-sdk/commit/88257f80574e3651cf88b50a2d513139dc7d497f))
* use Agoric version of cosmos-sdk for dynamic IBC ([b004f11](https://github.com/Agoric/agoric-sdk/commit/b004f11f7c50d508c6de9f51ad28a1b1fc266ae0))





# 0.13.0 (2020-03-26)


### Bug Fixes

* accomodate modified offer ids ([38d367d](https://github.com/Agoric/agoric-sdk/commit/38d367dedcba143524b4668573f11b757233401b))
* actually synchronise the inbound messages ([9568483](https://github.com/Agoric/agoric-sdk/commit/95684834643321dcceb70675f450efe42464df7c))
* add END_BLOCK controller call ([b115b55](https://github.com/Agoric/agoric-sdk/commit/b115b559ef7636c7b4ed3f3878d347a2216a4947))
* add missing files and dependencies ([2dc3e07](https://github.com/Agoric/agoric-sdk/commit/2dc3e072103aa68517c0ca31b15e1bf6d4bfc239))
* allow disabling of logging by setting DEBUG='' ([131c1c6](https://github.com/Agoric/agoric-sdk/commit/131c1c64f646f2fa3adece698d1da240dc969f03))
* don't double-withdraw from the first purse of an assay ([b37203e](https://github.com/Agoric/agoric-sdk/commit/b37203eded655169853bb1a3c7acdcdc8634ef15))
* generalise the wallet to arbitrary offers ([4b3ae29](https://github.com/Agoric/agoric-sdk/commit/4b3ae2974b2060e022fbe200b82e986d09cbc09a))
* getOfferDescriptions is now working ([b50690b](https://github.com/Agoric/agoric-sdk/commit/b50690be3294baff6165cb3a10b644f31bb29e15))
* hydrateHooks on the HTTP handler instead of addOffer ([b3e214d](https://github.com/Agoric/agoric-sdk/commit/b3e214d66a9e753da992d1e320350321c78e747a))
* improve command device support ([c70b8a1](https://github.com/Agoric/agoric-sdk/commit/c70b8a10b04c5554b1a952daa584216227858bc5))
* input queuing, and use the block manager for fake-chain ([c1282c9](https://github.com/Agoric/agoric-sdk/commit/c1282c9e644fbea742846f96a80a06afe64664ba))
* introduce and use Store.entries() ([b572d51](https://github.com/Agoric/agoric-sdk/commit/b572d51df45641da59bc013a0f2e45a694e56cbc))
* make default log level for ag-chain-cosmos more compatible ([258e4c9](https://github.com/Agoric/agoric-sdk/commit/258e4c94746888f0392da19335cf7abc804c3b3a))
* make REPL occupy less of screen when below wallet ([d4fc392](https://github.com/Agoric/agoric-sdk/commit/d4fc392f49bd515a70e2cc904f2fca08b0931584))
* make the changes needed to cancel pending offers ([b4caa9e](https://github.com/Agoric/agoric-sdk/commit/b4caa9ed26489ad39651b4717d09bd9f84557480))
* make the fake-chain better ([b4e5b02](https://github.com/Agoric/agoric-sdk/commit/b4e5b02ca8fc5b6df925391f3b0a2d6faecbdb73))
* panic on END_BLOCK error ([28b6d46](https://github.com/Agoric/agoric-sdk/commit/28b6d467ba3a40e752f75467c2381d1afa69a77e))
* polish the wallet and dApp UIs ([292291f](https://github.com/Agoric/agoric-sdk/commit/292291f234646cdb0685dbf63cf0a75a2491018c))
* prevent deadlock in the input queue for delivered commands ([ee0e488](https://github.com/Agoric/agoric-sdk/commit/ee0e4881dc2dd17fea8b4efea6e149bd86daab22))
* prevent simulated blocks from reentering the kernel ([42f7abd](https://github.com/Agoric/agoric-sdk/commit/42f7abd4ec9a017bbca6d02c164c06272e328713)), closes [#763](https://github.com/Agoric/agoric-sdk/issues/763)
* propagate more errors correctly ([0437c5f](https://github.com/Agoric/agoric-sdk/commit/0437c5f1510c05d49a4b5070919db77efefdbb09))
* proper sorting of wallet entries ([24627eb](https://github.com/Agoric/agoric-sdk/commit/24627eb5c271d75052370afa24ead851d001a126))
* properly kill off child processes on SIGHUP ([93b71cd](https://github.com/Agoric/agoric-sdk/commit/93b71cd6b894cbd37dab39b6946ed8e6d47ab2a6))
* remove nondeterminism from ag-solo replay ([2855b34](https://github.com/Agoric/agoric-sdk/commit/2855b34158b71e7ffe0acd7680d2b3c218a5f0ca))
* remove reference to ping ([a9a3f0f](https://github.com/Agoric/agoric-sdk/commit/a9a3f0fd68d9870333fd25c458d8eba151557c65))
* rename connection to channel ([f50a94b](https://github.com/Agoric/agoric-sdk/commit/f50a94b33029e7ebd67db9a1c812f1d2dc955aa9))
* unbreak the fake-chain ([d84ee30](https://github.com/Agoric/agoric-sdk/commit/d84ee30ad2991e0f1676627a23c3e6989d3b0728))
* use COMMIT_BLOCK action to sync state ([5a3c087](https://github.com/Agoric/agoric-sdk/commit/5a3c08705d8477fcc281134e8a3540079fcb1edd))
* use latest @agoric/tendermint ([346b582](https://github.com/Agoric/agoric-sdk/commit/346b58291360b586e02278b14a7860715f0a06e8))
* wait for payments at opportune moments ([53f359d](https://github.com/Agoric/agoric-sdk/commit/53f359d56c49ef62a90e1e834b359de8ca5dfa4f))
* **ag-chain-cosmos:** keep SwingSet state in the validator state dir ([#434](https://github.com/Agoric/agoric-sdk/issues/434)) ([00b874c](https://github.com/Agoric/agoric-sdk/commit/00b874c59ef29db49bec4e89e1ed9122e0a171f7)), closes [#433](https://github.com/Agoric/agoric-sdk/issues/433)
* **ag-cosmos-helper:** properly register /txs route ([17bae2d](https://github.com/Agoric/agoric-sdk/commit/17bae2d1546e14d1555b1e97b9359372ee124ba5))
* **ag-solo:** be more tolerant of missing wallet ([94c2a3e](https://github.com/Agoric/agoric-sdk/commit/94c2a3e38d618202c125f784814858bf06e4d191))
* **ag-solo:** don't require a git checkout to init ([b8c4474](https://github.com/Agoric/agoric-sdk/commit/b8c44748da0e0b9df468c518c8d37c0aa75013d6)), closes [#570](https://github.com/Agoric/agoric-sdk/issues/570) [#562](https://github.com/Agoric/agoric-sdk/issues/562)
* **ag-solo:** reenable the ag-solo bundle command ([6126774](https://github.com/Agoric/agoric-sdk/commit/6126774fd3f102cf575a430dfddb3a0c6adcf0f5)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **agoric-cli:** changes to make `agoric --sdk` basically work again ([#459](https://github.com/Agoric/agoric-sdk/issues/459)) ([1dc046a](https://github.com/Agoric/agoric-sdk/commit/1dc046a02d5e616d33f48954e307692b43008442))
* **bundle:** deprecate the experimental E.C() syntax ([07f46cc](https://github.com/Agoric/agoric-sdk/commit/07f46cc47f726414410126400a7d34141230c967))
* **bundle:** use the same HandledPromise ([e668d3c](https://github.com/Agoric/agoric-sdk/commit/e668d3c9106ef6c47c66319afb8d954094b128eb)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **captp:** use new @agoric/eventual-send interface ([d1201a1](https://github.com/Agoric/agoric-sdk/commit/d1201a1a1de324ae5e21736057f3bb03f97d2bc7))
* **chain:** properly commit state ([7703aa7](https://github.com/Agoric/agoric-sdk/commit/7703aa753769d89dc1b2c7a899cfcf37c2f3626f))
* **chain:** state is being stored correctly again ([fe0b33d](https://github.com/Agoric/agoric-sdk/commit/fe0b33d2d33b4989f63d1e7030de61b5e886e69f))
* **cli:** improve install, template, fake-chain ([0890171](https://github.com/Agoric/agoric-sdk/commit/08901713bd3db18b52ed1793efca21b459e3713e))
* **cosmic-swingset:** minor UI versioning tweaks ([e0a5985](https://github.com/Agoric/agoric-sdk/commit/e0a59858ce606c31a756a0b029b57b478cfe84a0))
* **cosmic-swingset:** reduce unnecessary logs ([#425](https://github.com/Agoric/agoric-sdk/issues/425)) ([8dc31a0](https://github.com/Agoric/agoric-sdk/commit/8dc31a0d3620372523887adc7ea7c28ef4bf195d)), closes [#424](https://github.com/Agoric/agoric-sdk/issues/424)
* **cosmic-swingset:** reenable setup scripts ([e533479](https://github.com/Agoric/agoric-sdk/commit/e5334791202a89028d31ddf8ea109fe469a84943)), closes [#311](https://github.com/Agoric/agoric-sdk/issues/311)
* **deployment:** update deployment steps ([7527eb0](https://github.com/Agoric/agoric-sdk/commit/7527eb01a3fd5fd4eb4db6f7e9452ccacfe39a74))
* **docker:** cache Go depedency downloads to optimise docker builds ([aba22f0](https://github.com/Agoric/agoric-sdk/commit/aba22f0639ab9d92c02b5a87e30994d353762998))
* **docker:** more updates for ag-setup-solo ([e4b7c86](https://github.com/Agoric/agoric-sdk/commit/e4b7c868858329928c7fb25f4cac881d81458a99))
* **docker:** propagate git-revision correctly ([d8e6f7e](https://github.com/Agoric/agoric-sdk/commit/d8e6f7eca73a9fe6ba5ce4f9a01d38cd768c89d1))
* **docker:** remove dependency on NPM ([d3a8050](https://github.com/Agoric/agoric-sdk/commit/d3a805029da851985ae59836f76f6a4dd794488b))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/agoric-sdk/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **go:** use agoric-labs/tendermint subscription-keep-id ([10b2cd2](https://github.com/Agoric/agoric-sdk/commit/10b2cd26191b1d8982f44a68bbe4f480be3772de))
* **Makefile:** better convention for installing ag-chain-cosmos ([b27426a](https://github.com/Agoric/agoric-sdk/commit/b27426a0b74e9c21482172b71cc30fc36ebf29f5))
* **Makefile:** install ag-chain-cosmos in $GOPATH/bin/ ([d4af74f](https://github.com/Agoric/agoric-sdk/commit/d4af74fbc090383f9e2bdcd564a72f3a6433e164))
* **Makefile:** remove old docker-build and docker-push rules ([92a3816](https://github.com/Agoric/agoric-sdk/commit/92a3816968c17fc68830ff9cc433b02d23e70314))
* **Makefile:** set up the GOPATH environment ([ab72ca5](https://github.com/Agoric/agoric-sdk/commit/ab72ca562e0c5f2f6051a1c3eabebd0e680f3808))
* **provisioner:** allow for mount points as well ([7350220](https://github.com/Agoric/agoric-sdk/commit/7350220dfab2612ad7f3858988220cb307b92726))
* **provisioning-server:** remove debug prints ([f5b0e14](https://github.com/Agoric/agoric-sdk/commit/f5b0e14a96c77fd1bb40fbbf42e4f253b551d0a8))
* **pserver:** clarify StackedResource ([1251669](https://github.com/Agoric/agoric-sdk/commit/125166946d9eb985f6db2d797accbe37b6a90c22))
* **pserver:** new helper arguments and returns ([d40f2ac](https://github.com/Agoric/agoric-sdk/commit/d40f2ac452936ae8996f0e199c2b3f33ebc913c6))
* **solo:** get repl working again ([a42cfec](https://github.com/Agoric/agoric-sdk/commit/a42cfec9c8c087c77ec6e09d5a24edfe0d215c02))
* **test-make:** run the default Makefile target ([aa7d960](https://github.com/Agoric/agoric-sdk/commit/aa7d96039d6e0ca00d24a01756569e1780b375ea))
* rename ustake -> uagstake ([ac89559](https://github.com/Agoric/agoric-sdk/commit/ac895597e57a118948d686a0f60ebf8aed18d64e))
* **pserver:** use with-blocks when possible ([#384](https://github.com/Agoric/agoric-sdk/issues/384)) ([43ac9ac](https://github.com/Agoric/agoric-sdk/commit/43ac9ac087c5c221eca624b4b63c395699e956e9))
* **testnet:** properly push agoric/cosmic-swingset-setup ([d82aad6](https://github.com/Agoric/agoric-sdk/commit/d82aad6fb2ce71826fd71e2404fc1f1722ec709e))
* **ustake:** stake is actually micro-stake ([1aaf14f](https://github.com/Agoric/agoric-sdk/commit/1aaf14f078d1defb09d52692e78dabb9854bbb27))


### Features

* accomodate Zoe roles as is currently designed ([d4319d1](https://github.com/Agoric/agoric-sdk/commit/d4319d173d5ade915b3132f79054926f78121a51))
* add anylogger support ([4af822d](https://github.com/Agoric/agoric-sdk/commit/4af822d0433ac2b0d0fd53298e8dc9c7347a3e11))
* add wallet offer publicID querying API to the bridge ([4010226](https://github.com/Agoric/agoric-sdk/commit/401022662fb8776dc671a46eb5b31dd20d0bf318))
* add wallet.ping() method for testing ([1f07cd2](https://github.com/Agoric/agoric-sdk/commit/1f07cd26d55503af4dc5dbd8d3b916b323033793))
* allow subscribing to wallet offer changes ([5ad56e6](https://github.com/Agoric/agoric-sdk/commit/5ad56e6985b221e65989f4d10b39154c57d8f13c))
* default to silent unles `DEBUG=agoric` ([2cf5cd8](https://github.com/Agoric/agoric-sdk/commit/2cf5cd8ec66d1ee38f351be8b2e3c808afd554a9))
* implement the Cosmos block manager ([3a5936a](https://github.com/Agoric/agoric-sdk/commit/3a5936aeae6fc32a6075d85b7af88885e689a2ab))
* implement wallet bridge separately from wallet user ([41c1278](https://github.com/Agoric/agoric-sdk/commit/41c12789c1fd230fa8442db9e3979d0c7372025a))
* include requestContext in inboundCommand, and use it in wallet ([b332870](https://github.com/Agoric/agoric-sdk/commit/b33287032a376b4adf8c5f695321a559550401ea))
* new multirole (ending with '*') implementation ([442fd20](https://github.com/Agoric/agoric-sdk/commit/442fd202cdd0e361728e1dbb9e0c04ccdfb1e8d4))
* revamp the wallet for brands and Zoe roles ([b4a806c](https://github.com/Agoric/agoric-sdk/commit/b4a806c63a30e7cfca9a4b4c642702935e5741f4))
* separate registerAPIHandler from registerURLHandler ([7c670d9](https://github.com/Agoric/agoric-sdk/commit/7c670d9c5c92f7e229b6895625423702d39d16d2))
* use anylogger ([81a8950](https://github.com/Agoric/agoric-sdk/commit/81a8950c8f4a1e5cae26db463ff1986033e399d5))
* **ag-solo:** integrate wallet UI with REPL ([a193e87](https://github.com/Agoric/agoric-sdk/commit/a193e874ea373f5e6345568479ce620401147db2))
* **cosmic-swingset:** use a fake chain for scenario3 ([#322](https://github.com/Agoric/agoric-sdk/issues/322)) ([f833610](https://github.com/Agoric/agoric-sdk/commit/f833610831e687c65a28a0069dc58e74b18d7321))
* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))
* **reset-state:** add command to ag-solo to reset SwingSet ([233c0ff](https://github.com/Agoric/agoric-sdk/commit/233c0ff5a682c8b25a457e9c71f9d0b08e6c78ac))
* **start:** implement `agoric start testnet` ([cbfb306](https://github.com/Agoric/agoric-sdk/commit/cbfb30604b8c2781e564bb250dd58d08c7d57b3c))
