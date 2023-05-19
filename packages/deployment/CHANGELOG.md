# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 3.0.0 (2023-05-19)


### ⚠ BREAKING CHANGES

* move swingset state dir
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)

### Features

* move swingset state dir ([eddb46b](https://github.com/Agoric/agoric-sdk/commit/eddb46bd0e41340aec7d420adc37074fbca1b177))
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **ci:** Enforce no failures of otel slog sender in integration ([c7227b2](https://github.com/Agoric/agoric-sdk/commit/c7227b2ecdc68617cf2f3cfd5a4623fafd27376a))
* **ci:** require publishBundle ([aeb3e47](https://github.com/Agoric/agoric-sdk/commit/aeb3e47a20775a6585fc6d375d661018728c5fba))
* **ci:** Use state-sync in deployment loadgen test ([27b97c1](https://github.com/Agoric/agoric-sdk/commit/27b97c1a6fa6e702fa72f1d215bb4d42f403ed3e))
* **deployment:** Enable state-sync on validator nodes ([2faa1fb](https://github.com/Agoric/agoric-sdk/commit/2faa1fbd17d5cee552bfec8fd396b96d252bca1c))


### Bug Fixes

* accept ec invitations ([8cfc7d4](https://github.com/Agoric/agoric-sdk/commit/8cfc7d47bef9039e1cac1e4e54eea0a9e5ccefc9))
* address review suggestions ([a011871](https://github.com/Agoric/agoric-sdk/commit/a011871321ca1f57601bc02ccc271ffbc86f7a15))
* agoric follow lossy everywhere ([306ed4b](https://github.com/Agoric/agoric-sdk/commit/306ed4b3c25d6c51ab77e2111ee1e9fdd6a85349))
* avoid bash exit attribute, reduce verbosity ([3fe4127](https://github.com/Agoric/agoric-sdk/commit/3fe41271d66b99b0b530bf7963ac4ddd9d1340a3))
* bump go version ([d91451a](https://github.com/Agoric/agoric-sdk/commit/d91451a56da4a4c08f9ba0a1b56c8836ad4596b5))
* increased timeout for older agoric follow ([66c5939](https://github.com/Agoric/agoric-sdk/commit/66c59396f8a288c6a802e1992febe1cb50822a10))
* invalidate docker cache for GIT_REVISION too ([38de4a2](https://github.com/Agoric/agoric-sdk/commit/38de4a241db68ba0e62066d519b2f5bf6d804070))
* Makefile envvar shell compatibility ([1a210db](https://github.com/Agoric/agoric-sdk/commit/1a210dbe2047691a715d2f8ddeb65e3c202e316c))
* pushPrice prints correct oracle ([af5f1fe](https://github.com/Agoric/agoric-sdk/commit/af5f1feb1f76d17c0275ecc7ca447c9b1c78772f))
* rename docker image root ([#7186](https://github.com/Agoric/agoric-sdk/issues/7186)) ([ab2efa6](https://github.com/Agoric/agoric-sdk/commit/ab2efa64b44fb410592b6dfa2a992296fd8b51d4))
* timeout failed push price and emit warning ([0ba57cd](https://github.com/Agoric/agoric-sdk/commit/0ba57cd028ec52e779973c95f121b463d2b134bf))
* unsaved test and dir replacements ([54dd29a](https://github.com/Agoric/agoric-sdk/commit/54dd29a856b1a9cc74c686ea0aefcf40a862ab85))
* upgrade-test don't set dest ([a9bace0](https://github.com/Agoric/agoric-sdk/commit/a9bace0aa10d961f5db9cb6c3251a2197ebf7e69))
* **deployment:** minor Makefile fixes ([8494a90](https://github.com/Agoric/agoric-sdk/commit/8494a90b8edc767c93dbd4073d2f1b8a4f8044e4))
* **deployment:** Pass-through SLOGSENDER_AGENT_ env ([#6438](https://github.com/Agoric/agoric-sdk/issues/6438)) ([7818d2d](https://github.com/Agoric/agoric-sdk/commit/7818d2db4e38737e09a0623579160c683f582ec1))
* **deployment:** put `GOBIN` in `PATH` for `setup.sh` ([42ba2d4](https://github.com/Agoric/agoric-sdk/commit/42ba2d45cc1ee28f5344f1b146135ac10b4b4c5b))
* **deployment:** remove dependencies on cgroup ([beda83d](https://github.com/Agoric/agoric-sdk/commit/beda83dd060e5f1ce8da0894fce0c145297d9df4))
* **deployment:** rename `agoric/deployment` to `ssh-node` ([5eadb93](https://github.com/Agoric/agoric-sdk/commit/5eadb9329a689d95c0a5f276267350d9c7dfbd8a))
* use `ubuntu:latest` for deployment container ([da0251a](https://github.com/Agoric/agoric-sdk/commit/da0251a5af5d8070eefc434a2068b61c28ad02e6))
* **deployment:** simplify the integration test ([f1db1ec](https://github.com/Agoric/agoric-sdk/commit/f1db1ec69a5d57cbab1c2aae568428820ed576f7))


### Reverts

* Revert "test: faketime" ([7a3468c](https://github.com/Agoric/agoric-sdk/commit/7a3468c46a2e61d7f8c4b5f7ce521220551200a2))

## 0.32.0 (2022-10-05)


### Features

* **telemetry:** Support slog sender in subprocess ([9fa268f](https://github.com/Agoric/agoric-sdk/commit/9fa268fc9b59d9fb26d829300d7a9d5a768e47bc))

## 0.31.0 (2022-09-20)


### Features

* **cosmic-swingset:** Add heap snapshots ([42e43bc](https://github.com/Agoric/agoric-sdk/commit/42e43bce417a7538aa7bc6ed59320dfef45c1adb))
* add env to keep old snapshots on disk ([96e1077](https://github.com/Agoric/agoric-sdk/commit/96e1077683c64ff0c66fdfaa3993043006c8f368))
* use random snapshot memory init in integration test ([5c99976](https://github.com/Agoric/agoric-sdk/commit/5c999761e5cd0061f7eee483fcade290f98732c9))
* **telemetry:** `otel-and-flight-recorder.js` for the best of both ([a191b34](https://github.com/Agoric/agoric-sdk/commit/a191b34bd6a4b14f7280b0886fcfd44b5a42b6b5))


### Bug Fixes

* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **deployment:** `unsafe-reset-all` is a subcommand of `tendermint` ([deeb345](https://github.com/Agoric/agoric-sdk/commit/deeb3458ef3b19d771b574e0821dc1eec425b217))
* **deployment:** drive-by upgrade to Node.js 16 ([68ff922](https://github.com/Agoric/agoric-sdk/commit/68ff92257800022749494e169d62cffeaf1b53a7))

## 0.30.0 (2022-05-28)


### Features

* **deployment:** Add script to run integration test locally ([e0d366a](https://github.com/Agoric/agoric-sdk/commit/e0d366a3c1445d73db55141deac5bcbb8ce0da2e))
* **deployment:** integration: record xsnap and swingStore traces ([fa669e0](https://github.com/Agoric/agoric-sdk/commit/fa669e05c98a42ca647e1603c9ba1e95bec42769))
* **dockerfile:** include otel collector ([6f5e686](https://github.com/Agoric/agoric-sdk/commit/6f5e68604409b87592b7d810e0f412a5571d5459))


### Bug Fixes

* **deployment:** default `faucet-helper.sh` to `show-rpcaddrs` ([352f6a6](https://github.com/Agoric/agoric-sdk/commit/352f6a63d31a629aa88de860916b65801ce71513))
* **deployment:** disable swingstore consistency check ([#5323](https://github.com/Agoric/agoric-sdk/issues/5323)) ([e9dc159](https://github.com/Agoric/agoric-sdk/commit/e9dc1592e2aa7b6d907c9e7bf63e0ff1b46af1d0))
* **deployment:** Do not override explicit faucet SOLO_COINS ([#5360](https://github.com/Agoric/agoric-sdk/issues/5360)) ([70fa390](https://github.com/Agoric/agoric-sdk/commit/70fa3908dde52a79658b5ef8f58c17406a030ed3))
* **deployment:** give out some tokens to new clients ([847da8d](https://github.com/Agoric/agoric-sdk/commit/847da8d6f35a31525923cf18ca789c8b367ad943))
* **deployment:** handle aarch64 and arm64 ([75965ee](https://github.com/Agoric/agoric-sdk/commit/75965ee3ba8e4ef42b55a710cc743ea8a874c4ef))
* **deployment:** Install ansible for current os ([4b5940f](https://github.com/Agoric/agoric-sdk/commit/4b5940f5474b0b7ce3fe0ab07f5dd75b0f40b58a))
* **deployment:** Update CI script ([#5322](https://github.com/Agoric/agoric-sdk/issues/5322)) ([efbbf54](https://github.com/Agoric/agoric-sdk/commit/efbbf54ec53e064e1038fd678fca9e88c083f312))
* **faucet-helper:** use published network config ([72b0a81](https://github.com/Agoric/agoric-sdk/commit/72b0a819c04613c510fe8b08b934cc8801aca551))
* **vats:** make core config location independent ([9612d59](https://github.com/Agoric/agoric-sdk/commit/9612d591a4c58cf447f46e085f81dd0762b46d4a))

## 0.29.0 (2022-04-18)


### Bug Fixes

* **deployment:** correct `cosmos-delegates.txt` discrepency ([e402593](https://github.com/Agoric/agoric-sdk/commit/e40259330bbde2efd74af55f1830e27fea02dd12))
* **deployment:** correct quoting in `faucet-helper.sh` ([7d58ad8](https://github.com/Agoric/agoric-sdk/commit/7d58ad831652baff4ca35f0694279da0330a29ad))
* **deployment:** faucet-helper add-egress ([27aca53](https://github.com/Agoric/agoric-sdk/commit/27aca53509ba6b88911e2c1d2de6e9b1a5a305fd))
* **docker:** increase network timeout ([57d6504](https://github.com/Agoric/agoric-sdk/commit/57d6504ba19815442832ed16d1fdfe3a6bd5ba14))
* **dockerfile:** add terrible retry logic for yarn install on failure ([9e8e9c4](https://github.com/Agoric/agoric-sdk/commit/9e8e9c49f868ed9a414a0b1fc4e9709c31763c31))

## 0.28.0 (2022-02-24)


### Features

* **cosmic-swingset:** add tools for core-eval governance ([7368aa6](https://github.com/Agoric/agoric-sdk/commit/7368aa6c22be840733843b1da125eb659cc21d84))

### 0.27.3 (2022-02-21)


### Features

* **deployment:** include short loadgen test in CI ([bae4ce8](https://github.com/Agoric/agoric-sdk/commit/bae4ce82a044a7ff745b5fa40815a79e522ef5e8))


### Bug Fixes

* **deployment:** capture `flight-recorder.bin` ([451a817](https://github.com/Agoric/agoric-sdk/commit/451a81775e8d60b68c072759afaed07420a2b400))
* **deployment:** use docker API instead of CLI ([0c049b4](https://github.com/Agoric/agoric-sdk/commit/0c049b4ffdd51af2b3c39541a84f7f349027a10d))

### 0.27.2 (2021-12-22)


### ⚠ BREAKING CHANGES

* **deployment:** optional first block argument to `crunch.mjs`

### Features

* **deployment:** optional first block argument to `crunch.mjs` ([c03646d](https://github.com/Agoric/agoric-sdk/commit/c03646d7387200c3664e7aa03113514363a4611a))


### Bug Fixes

* **deployment:** use Docker `Cgroup Version` to init volumes ([3fa95e7](https://github.com/Agoric/agoric-sdk/commit/3fa95e77a0c79f4dfbf9651d5f295795ce7dc5df))

### 0.27.1 (2021-12-02)


### Features

* **deployment:** add scripts to help find nondeterminism ([a1065c0](https://github.com/Agoric/agoric-sdk/commit/a1065c043dc721d967065fe1098ad5a0cb59a3fa))
* **deployment:** enable `ag-setup-cosmos init --noninteractive` ([e866975](https://github.com/Agoric/agoric-sdk/commit/e866975fcda19afdf14adbd1ad59fc2b353c8b06))
* **deployment:** trace KVStore activity during integration test ([a915950](https://github.com/Agoric/agoric-sdk/commit/a915950241aedd406a0df1018f22f8a517a64a26))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))


### Bug Fixes

* **deployment:** accomodate `$GOBIN` ([d75868b](https://github.com/Agoric/agoric-sdk/commit/d75868b9c05b5ede14af92f78f1ddeef95e915d8))
* **deployment:** adapt to new cosmic-swingset `install` target ([02e4f4f](https://github.com/Agoric/agoric-sdk/commit/02e4f4f4fe6c8c3a32ff4715f912e5344985722f))
* **deployment:** change token send timeout from 10m to ~3m ([1791164](https://github.com/Agoric/agoric-sdk/commit/179116480de42d032c0607c40494b40fc20832eb))
* **deployment:** get `install-deps.sh` working under Linux ([1c2effe](https://github.com/Agoric/agoric-sdk/commit/1c2effe98df72e8a2d2be917f60fbc1bb74afbb0))
* **deployment:** properly detect faucet address in faucet-helper.sh ([3b9e8b1](https://github.com/Agoric/agoric-sdk/commit/3b9e8b1d72822d373021a36a45921b42e347899e))
* **deployment:** work around bundling divergence in Dockerfile.sdk ([1170879](https://github.com/Agoric/agoric-sdk/commit/11708793b1fe174a4411c0b7f72f439e751421b6))
* **faucet:** don't fail if `cosmos-delegates.txt` doesn't exist ([f650334](https://github.com/Agoric/agoric-sdk/commit/f65033489cb824d115a6c6dc5811868e5b53aeae))

## 0.27.0 (2021-10-13)

### 0.26.19 (2021-09-23)


### Features

* **deployment:** use latest faucet-helper.sh from testnet ([83f45f6](https://github.com/Agoric/agoric-sdk/commit/83f45f6be8112b9e74f687d9436963051d9e5308))


### Bug Fixes

* **deployment:** wait for staking tokens before creating validator ([59952d3](https://github.com/Agoric/agoric-sdk/commit/59952d3afd78ceb9b00eac5a8ccc84bef9d2ee4b))

### 0.26.18 (2021-09-15)

### 0.26.16 (2021-08-21)

### 0.26.15 (2021-08-18)


### Bug Fixes

* **deployment:** tolerate cycling of buster release ([94cbe35](https://github.com/Agoric/agoric-sdk/commit/94cbe3595488008cdd6ec9ff1bb04f55313c2b74))
* **deployment:** update faucet urun and bootstrap supply ([7e944f7](https://github.com/Agoric/agoric-sdk/commit/7e944f71b03a6e7b640da4f87fd2f2da4a20d896))
* **deployment:** write to .ag-chain-cosmos/data/chain.slog ([35cb64e](https://github.com/Agoric/agoric-sdk/commit/35cb64e2097938a2cb48ba1397121bd444040899))

### 0.26.14 (2021-08-17)

### 0.26.13 (2021-08-16)


### Bug Fixes

* remove more instances of `.cjs` files ([0f61d9b](https://github.com/Agoric/agoric-sdk/commit/0f61d9bff763aeb21c7b61010040ca5e7bd964eb))

### 0.26.12 (2021-08-15)


### Bug Fixes

* **deployment:** fix Makefile copy-pasta and dockerignore ([c8df74b](https://github.com/Agoric/agoric-sdk/commit/c8df74bc6e56ad117e01a04298e419e7646862c5))
* **deployment:** propagate submodules to docker-build-sdk ([8af454c](https://github.com/Agoric/agoric-sdk/commit/8af454cb5851bb833924aa863f3d02cdfbbcaa8a))
* **deployment:** use proper path to build.js ([78d2d73](https://github.com/Agoric/agoric-sdk/commit/78d2d73e33311ee09eaec17fa3b5c4d393a73621))

### 0.26.10 (2021-07-28)


### Bug Fixes

* **deployment:** improve the `provision` command to be idempotent ([622bbd8](https://github.com/Agoric/agoric-sdk/commit/622bbd8c07e79fa1de3b00a55224b9b462f4f75b))
* **deployment:** only format and mount /dev/sda for digitalocean ([745f90e](https://github.com/Agoric/agoric-sdk/commit/745f90e8a40745dbb832af56789a3daa5fe787c2))
* **deployment:** properly quote JSON pubkey from Ansible ([44132fa](https://github.com/Agoric/agoric-sdk/commit/44132fad78e7a6b59a324f47d986cefe140e1c30))

### 0.26.9 (2021-07-01)

### 0.26.7 (2021-06-25)


### Bug Fixes

* **deployment:** ensure that the faucet is given urun ([2e046f7](https://github.com/Agoric/agoric-sdk/commit/2e046f742be5bf01a69555bceb3acff5550b6ab4))

### 0.26.6 (2021-06-24)

### 0.26.5 (2021-06-23)

### 0.26.4 (2021-06-16)


### Bug Fixes

* **deployment:** many tweaks to make more robust ([16ce07d](https://github.com/Agoric/agoric-sdk/commit/16ce07d1269e66a016a0326ecc6ca4d42a76f75d))

### 0.26.3 (2021-06-15)


### Features

* for Keplr support (and presumably other wallets) we need CORS ([7986548](https://github.com/Agoric/agoric-sdk/commit/7986548c528e282c129175f0292d3db6b00a9468))
* **deployment:** --genesis=FILE and unique digitalocean SSH keys ([00d69da](https://github.com/Agoric/agoric-sdk/commit/00d69dab293f166e8e17adc05b0121dd99534adf))
* **deployment:** fetch --genesis=<url> ([e706e74](https://github.com/Agoric/agoric-sdk/commit/e706e747e8cdd54ed74f525b91d2d3fc2db61254))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* remove genesis bootstrap config; use just add-genesis-account ([fdc1255](https://github.com/Agoric/agoric-sdk/commit/fdc1255d66c702e8970ecf795be191dcf2291c39))

### 0.26.2 (2021-05-10)


### Bug Fixes

* **deployment:** make copy.yml copy ag-cosmos-helper by default ([2d3f5fb](https://github.com/Agoric/agoric-sdk/commit/2d3f5fbb32c294aa47453f96054778960a7f1dd7))

### 0.26.1 (2021-05-05)


### Bug Fixes

* cope with getting moddable submodule from agoric-labs ([a1a2693](https://github.com/Agoric/agoric-sdk/commit/a1a26931d17ade84ae97aa3a9d0e7c5c58a74491))

## 0.26.0 (2021-05-05)


### Features

* have the bank use normal purses when not on chain ([90ab888](https://github.com/Agoric/agoric-sdk/commit/90ab888c5cdc71a2322ca05ad813c6411c876a74))


### Bug Fixes

* adjust git-revision.txt generation ([6a8b0f2](https://github.com/Agoric/agoric-sdk/commit/6a8b0f20df17d5427b1c70273bcc170c7945dc2a))
* clean up Docker directory usage ([a97d0b3](https://github.com/Agoric/agoric-sdk/commit/a97d0b3edc1f47e04d93d37c6e999d0798903d03))
* correct faucet-helper.sh show-faucet-address and use it ([5e236e6](https://github.com/Agoric/agoric-sdk/commit/5e236e6cc0b457dc5c764d4494f4c4d8e3031f29))
* eliminate urun from cosmos bootstrap (it comes from treasury) ([16c1694](https://github.com/Agoric/agoric-sdk/commit/16c169446602a187810949748915eca31894fcb9))
* include backwards-compat /data directory links ([16feacd](https://github.com/Agoric/agoric-sdk/commit/16feacdd94400920190b6283a76968c6a61b3055))
* more Docker paths ([7783bb4](https://github.com/Agoric/agoric-sdk/commit/7783bb4740f4ea83b788fec45c1d1aa70145bba1))

### 0.25.4 (2021-04-22)


### Bug Fixes

* faucet delegate gives 62BLD, 93RUN ([4b80400](https://github.com/Agoric/agoric-sdk/commit/4b804005d2e58acf8cc86cca5312b9312fe9b77d))
* rename cosmos-level tokens uagstake/uag to ubld/urun ([0557983](https://github.com/Agoric/agoric-sdk/commit/0557983210571c9c2ba801d68644d71641a3f790))
* reorganise deployment ([5e7f537](https://github.com/Agoric/agoric-sdk/commit/5e7f537021f747327673b6f5819324eb048a3d96))

### 0.25.3 (2021-04-18)

### 0.25.2 (2021-04-16)

### 0.24.5 (2021-04-07)

### 0.24.4 (2021-04-06)

### 0.24.3 (2021-03-24)


### Features

* introduce separate roles for deployment placements ([a395571](https://github.com/Agoric/agoric-sdk/commit/a395571e7f8a06a4a5b7561bbcbfdcf3259454fa))

### 0.24.2 (2021-03-16)


### Features

* **deployment:** allow networks to init new placements ([13d6c2c](https://github.com/Agoric/agoric-sdk/commit/13d6c2ccc500cbc05c51790b09d218fa2e1f0f29))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))


### Bug Fixes

* changes needed for ag-setup-cosmos to be usable again ([4767bf5](https://github.com/Agoric/agoric-sdk/commit/4767bf5de61f34b050ec0ba54e61c802fd0ef12c))
* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **deployment:** bump up minimum node size to 4GB RAM ([030357c](https://github.com/Agoric/agoric-sdk/commit/030357cef635508a94c92f9f34ea93df045c2625))
* properly pin the Moddable SDK version ([58333e0](https://github.com/Agoric/agoric-sdk/commit/58333e069192267fc96e30bb5272edc03b3faa04))

### 0.24.1 (2021-02-22)


### ⚠ BREAKING CHANGES

* upgrade to stargate via gaiav3.0

### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* add `ag-setup-solo` compatibility, `ag-solo setup` ([4abe446](https://github.com/Agoric/agoric-sdk/commit/4abe4468a0626c2adfd170459c26c3fe973595a0))
* add a /dev/sda -> /home filesystem for Digital Ocean ([71895fc](https://github.com/Agoric/agoric-sdk/commit/71895fcb8489535f8f29569d65aaa889f94424e0))
* add a stub for decentralised web (dweb) ([d81b1f2](https://github.com/Agoric/agoric-sdk/commit/d81b1f262f365a994e2d5e29ff0aa027ed7b2841))
* add ansible plays for shuffling configs around ([d153aa2](https://github.com/Agoric/agoric-sdk/commit/d153aa24c43fef84614653fab401ce98d20b8c02))
* add export-genesis playbook ([cba5ae0](https://github.com/Agoric/agoric-sdk/commit/cba5ae0e5cf82b61c8d95f5be57a7d9edb94e5b1))
* expose API server (0.0.0.0:1317) for deployed chain ([d910692](https://github.com/Agoric/agoric-sdk/commit/d9106926fec9250ac48dfe918e73258c0cf2af60))
* further along the path of state export and migration ([13dc588](https://github.com/Agoric/agoric-sdk/commit/13dc588ee3502df243e5e8038406b737df21ccd8))
* implement add-egress, add-delegate ([ffd474a](https://github.com/Agoric/agoric-sdk/commit/ffd474abc292fbda4f314fb1715af7b4b6c92dcd))
* move faucet account onto the controller where it is safer ([8ba1c46](https://github.com/Agoric/agoric-sdk/commit/8ba1c462b9ecd5b47c19b7fe473b49de01e268ee))
* provision without Python ([1fdc1d3](https://github.com/Agoric/agoric-sdk/commit/1fdc1d31e7684705ebaf337be19271dbcdd9cbdc))
* update bigdipper scripts and services ([2be854d](https://github.com/Agoric/agoric-sdk/commit/2be854debb1c45ab702fd5cfabccbfe479e7eff6))
* upgrade to stargate via gaiav3.0 ([61fdc6c](https://github.com/Agoric/agoric-sdk/commit/61fdc6c959ff767844091b27b9c8514c8e5d5839))
* use SETUP_HOME/cosmos-delegates.txt and increase defaults ([5e87ae1](https://github.com/Agoric/agoric-sdk/commit/5e87ae1c501adf5b35371c30dc999bfcea8c75e6))
* **bigdipper:** add Big Dipper config ([f98ff43](https://github.com/Agoric/agoric-sdk/commit/f98ff43e6305e609c4ddaf953ff7b021a451ffaa))
* **bootstrap:** accept explicit semver (such as --bump=1.17.0) ([b3da002](https://github.com/Agoric/agoric-sdk/commit/b3da00237234353e8acfe121118a6a41e2ef41ba))
* **deployment:** add Prometheus support for monitoring ([713f63a](https://github.com/Agoric/agoric-sdk/commit/713f63a4b3ca347ba3c65283228dc33665fc10b3)), closes [#337](https://github.com/Agoric/agoric-sdk/issues/337)
* **fluentd:** support Loki log store ([c4bffbf](https://github.com/Agoric/agoric-sdk/commit/c4bffbf6e175e8df8bc321d5e955e200118e61bf))
* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))


### Bug Fixes

* adapt to new cosmos-sdk ([3b12c9e](https://github.com/Agoric/agoric-sdk/commit/3b12c9e2ef33117206189ecd085f51523c7d0d87))
* add `single-node` subcommand on the Docker entrypoint ([210edb6](https://github.com/Agoric/agoric-sdk/commit/210edb683280791b0e74831860c7e93176dadbed))
* add default moniker to hosts ([08cc625](https://github.com/Agoric/agoric-sdk/commit/08cc6258d5eadadd363f79fd257ff3cacd442a0a))
* allow faucet-helper.sh to work without web access ([8439ba3](https://github.com/Agoric/agoric-sdk/commit/8439ba34ed15347428c7fcffcb8b4458d49d6863))
* always rebuild the dweb config ([517041d](https://github.com/Agoric/agoric-sdk/commit/517041dd13ca16e5b915578b0f0cf6f8f27158fd))
* be tolerant of delegation errors ([db75f65](https://github.com/Agoric/agoric-sdk/commit/db75f651f8742340714264848c3cfb12ee72a16f))
* bigdipper settings changes ([facb79d](https://github.com/Agoric/agoric-sdk/commit/facb79d89a470371c67e89cb08656ed5cfdc5348))
* clear up all the paths through `agoric start` ([1b89571](https://github.com/Agoric/agoric-sdk/commit/1b89571734e9c7fd4748b1cf7b6d5a985f045ef3))
* complete the migration to dweb.crt and dweb.key ([9f2383e](https://github.com/Agoric/agoric-sdk/commit/9f2383e7d761e5f91743b3ceaffaad9f253e51cc))
* create a dweb `start.sh` so we keep the same systemd service ([a58abb4](https://github.com/Agoric/agoric-sdk/commit/a58abb46bcd10adc0460312acd7f877411478d4c))
* create dweb/data if it doesn't exist ([f6fcb2e](https://github.com/Agoric/agoric-sdk/commit/f6fcb2e89a205b9861ade6b0295d9c1376fc8c00))
* don't hardcode Agoric parameters within Ansible scripts ([19d0e13](https://github.com/Agoric/agoric-sdk/commit/19d0e1387060b54d1cfe9892039105a2270570ed))
* don't rely on validator DNS names when finding the network ([56e0cb3](https://github.com/Agoric/agoric-sdk/commit/56e0cb363af5d6130e74ee6b1b5335c200f4042e))
* excise half-fast Vagrant support ([9bbab1c](https://github.com/Agoric/agoric-sdk/commit/9bbab1c204a0c44bad2e51bcd0f7d08ad02b5a5b))
* fix "delegates" conditional syntax ([0a774a5](https://github.com/Agoric/agoric-sdk/commit/0a774a57be0697a8351f1a8523710f04e5368e82))
* force `--pruning=nothing` until we upgrade to Stargate ([9a3d54b](https://github.com/Agoric/agoric-sdk/commit/9a3d54bac54a92babe6fa1610c2a8c88f85a1e6a))
* get deployment to work ([77d2c6b](https://github.com/Agoric/agoric-sdk/commit/77d2c6b47bc18a503b46949e59fc0fe6d5a14225))
* increase testnet limit to allow more than 40 peers ([b72804f](https://github.com/Agoric/agoric-sdk/commit/b72804f4e0ab09af073e6aab3b5e3c6899549320))
* index_all_keys for IBC ([f513bda](https://github.com/Agoric/agoric-sdk/commit/f513bdabd413b36a8bcab28b598eed4fef7da561))
* make ag-cosmos-helper's home $HOME/.ag-cosmos-helper again ([1b9ad64](https://github.com/Agoric/agoric-sdk/commit/1b9ad647916d2c8de11b5f884bb88613e95ddcaa))
* make bigdipper.sh even more robust ([00b76a3](https://github.com/Agoric/agoric-sdk/commit/00b76a3c6d06d946219e4ac65ee8b9ad089ac55c))
* make provisioning server work again ([c7cf3b3](https://github.com/Agoric/agoric-sdk/commit/c7cf3b3e0d5e0966ce87639ca1aa36546f365e38))
* more support for hacktheorb ([b58e5cd](https://github.com/Agoric/agoric-sdk/commit/b58e5cd1c8b16467565967edbe4140a0749274d7))
* move faucet into SETUP_HOME/.. to share between chains ([76b6a5d](https://github.com/Agoric/agoric-sdk/commit/76b6a5db54ddf299a4933e5654a19f9763aa33bf))
* only create-validator from the actual node ([6c76bcc](https://github.com/Agoric/agoric-sdk/commit/6c76bccae17d91b5e66ad6b43f9d684fec7d45cc))
* prepare for --import-from=node0 ([7300c3a](https://github.com/Agoric/agoric-sdk/commit/7300c3a4cde46963802f10ae8d0eb3d4134ecdeb))
* properly docker push agoric/deployment:$(TAG) ([8afd58b](https://github.com/Agoric/agoric-sdk/commit/8afd58b5f9c1552ca564433c1cfd6f61b8f6cf2a))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* reenable Docker builds and deployment ([559ea06](https://github.com/Agoric/agoric-sdk/commit/559ea062251d73e3a6921c85f63631a50ddfad35))
* reinstate carrying forward public keys ([504a8ce](https://github.com/Agoric/agoric-sdk/commit/504a8ce6a004d08c9436ed88a39e3c63ecb5202b))
* remove controller ag-solo, as it is obsolete ([c698e4c](https://github.com/Agoric/agoric-sdk/commit/c698e4c8fc71f3a334bf546dce8d1994c2a68adf))
* remove journalbeat from build; it fails and we don't use it ([c2fed3b](https://github.com/Agoric/agoric-sdk/commit/c2fed3b2992385c5e20d9c8f26507089b546c5a3))
* remove more BOOTSTRAP_ADDRESS references ([f2141b6](https://github.com/Agoric/agoric-sdk/commit/f2141b68fe8f239e575e4a4dc7e6be70b1ffc7f0))
* remove more controller references ([c9af5a1](https://github.com/Agoric/agoric-sdk/commit/c9af5a11ac5ffa1afcbc47c6399f35945055e3b2))
* remove unnecessary Ansible step ([9bd7e61](https://github.com/Agoric/agoric-sdk/commit/9bd7e61ba48546c7ad76a20cf2db5e14d364b102))
* rename ustake -> uagstake ([ac89559](https://github.com/Agoric/agoric-sdk/commit/ac895597e57a118948d686a0f60ebf8aed18d64e))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* run ag-setup-cosmos under SES ([13c8efe](https://github.com/Agoric/agoric-sdk/commit/13c8efe6cf9ebc8c6a71b9098410c1af4162b570))
* shorten chain cadence to 2 seconds (instead of default 5) ([12a5688](https://github.com/Agoric/agoric-sdk/commit/12a568873236565491b90996c93b41b2edbdc055))
* simple fixes for chain parameters ([a90ae2f](https://github.com/Agoric/agoric-sdk/commit/a90ae2fba72e2038be4987d390f9dfb9cb163897))
* since we don't simulate, make sure our gas estimate is good ([a0a2df5](https://github.com/Agoric/agoric-sdk/commit/a0a2df5e614bc64a2ceddb4f988ba52dc611ffad))
* systematically use bin/ag-chain-cosmos ([527ae65](https://github.com/Agoric/agoric-sdk/commit/527ae655acc95ccf9fd2968e551adbe6d2453113))
* trim 300MB off of the Docker image size, and speed up builds ([01c4fc1](https://github.com/Agoric/agoric-sdk/commit/01c4fc13c764e30ebc2d8fa95b457569f524c09d))
* tweak the deployment process ([6606a67](https://github.com/Agoric/agoric-sdk/commit/6606a679c6ce4c2cedee54e39d3777b4e59bff65))
* update Docker build steps ([7c7379d](https://github.com/Agoric/agoric-sdk/commit/7c7379db95f9b09151ad17533c9fa0c5c864c54c))
* update to docker image node:lts-stretch ([ba1ad59](https://github.com/Agoric/agoric-sdk/commit/ba1ad59eac598879ebbac27f50856e24f7621a35))
* update vagrant/Dockerfile to buster and add to build ([c8da8fc](https://github.com/Agoric/agoric-sdk/commit/c8da8fc7b9194cc099bf4ec63fdadb84d8a7d8d1))
* upgrade Docker images to Debian buster ([1016cc5](https://github.com/Agoric/agoric-sdk/commit/1016cc5fa27624d2265398d8900f2d4847c9864f))
* upgrade to our --keyring-dir PR (temporarily) ([38e170d](https://github.com/Agoric/agoric-sdk/commit/38e170d42c2af74a565749d040f365905cd0d3fc))
* use `agoric set-default` instead of set-json.js ([7e1f612](https://github.com/Agoric/agoric-sdk/commit/7e1f612ff3f78c9e614cc63c9aa98e0d1f1a2dd5))
* use `gentx --client-home=...` to initialise genesis validators ([54c5a2f](https://github.com/Agoric/agoric-sdk/commit/54c5a2f2e23f7f9df254b35f2657e449d9fb847a))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* use gentx --home-client flag ([5595b41](https://github.com/Agoric/agoric-sdk/commit/5595b410377116b7a2d20d39a46ec87d2b5ea01f))
* use gentx --home-server instead of --home-client ([ed634bf](https://github.com/Agoric/agoric-sdk/commit/ed634bfbe976ca48a203b4f44b3eb0d62e1edd82))
* use nodejs instead of sed for parsing package.json ([f58df9c](https://github.com/Agoric/agoric-sdk/commit/f58df9c1ca9e94747e7f1f9fd9509b4ee0858984))
* use provisionpass for the bootstrap address ([b0c2b73](https://github.com/Agoric/agoric-sdk/commit/b0c2b73ec6ee5d0dda2d3a04c2b251a7ff0e0331))
* we now send 50agstake to each of the validators ([9a78552](https://github.com/Agoric/agoric-sdk/commit/9a78552606db91b7f678464b27261a391844916d))
* **ag-lcd:** tolerate cosmos/cosmos-sdk[#5592](https://github.com/Agoric/agoric-sdk/issues/5592) ([9eee270](https://github.com/Agoric/agoric-sdk/commit/9eee270beeeef415bad3a988c7ee890523f9d7e8))
* **ansible:** double the stakes ([21fe284](https://github.com/Agoric/agoric-sdk/commit/21fe284d05094b0ac932ae39f30878e7f97c2df3))
* **ansible:** remove state that needs regeneration ([110dcb8](https://github.com/Agoric/agoric-sdk/commit/110dcb8625eb9d4d918f02c69e92451bcc77296b))
* **chain:** state is being stored correctly again ([fe0b33d](https://github.com/Agoric/agoric-sdk/commit/fe0b33d2d33b4989f63d1e7030de61b5e886e69f))
* **deployment:** properly use agoric-sdk tag ([75dd0c3](https://github.com/Agoric/agoric-sdk/commit/75dd0c328a8aba9543d10af37408f2b4608faddc))
* **deployment:** track deployment version ([ad63fee](https://github.com/Agoric/agoric-sdk/commit/ad63fee58a55ca281a6f3b0a20392d81680ffa64))
* **deployment:** update deployment steps ([7527eb0](https://github.com/Agoric/agoric-sdk/commit/7527eb01a3fd5fd4eb4db6f7e9452ccacfe39a74))
* **deployment:** update Dockerfile for Makefile ([f5607af](https://github.com/Agoric/agoric-sdk/commit/f5607afd15742a6b5c2f064c616a2ce8bd0e6130))
* **docker:** propagate git-revision correctly ([d8e6f7e](https://github.com/Agoric/agoric-sdk/commit/d8e6f7eca73a9fe6ba5ce4f9a01d38cd768c89d1))
* **docker:** remove dependency on NPM ([d3a8050](https://github.com/Agoric/agoric-sdk/commit/d3a805029da851985ae59836f76f6a4dd794488b))
* **fluentd:** tweak the Loki records ([cf62725](https://github.com/Agoric/agoric-sdk/commit/cf627258476bbee4a297082048f6f5784e2e04fc))
* **fluentd:** update cache before running apt ([6d44e70](https://github.com/Agoric/agoric-sdk/commit/6d44e70bba2f52f62b6507b98548d26aa43443d8))
* **fluentd:** update Loki store format ([a834015](https://github.com/Agoric/agoric-sdk/commit/a834015d1e4f450ddc4a69f852005da425f70fca))
* **ustake:** stake is actually micro-stake ([1aaf14f](https://github.com/Agoric/agoric-sdk/commit/1aaf14f078d1defb09d52692e78dabb9854bbb27))



### [2.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.5.0...@agoric/deployment@2.5.1) (2023-02-17)


### Bug Fixes

* review comments ([c875ee2](https://github.com/Agoric/agoric-sdk/commit/c875ee2548c0eb599389a9c7e111a112f8c1390d))
* update docker golang version ([777c382](https://github.com/Agoric/agoric-sdk/commit/777c38284bcdaffed41e5fe6c5e62ef62e7c65b3))



## [2.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.4.0...@agoric/deployment@2.5.0) (2022-10-05)


### Features

* **telemetry:** Support slog sender in subprocess ([9fa268f](https://github.com/Agoric/agoric-sdk/commit/9fa268fc9b59d9fb26d829300d7a9d5a768e47bc))



## [2.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.3.1...@agoric/deployment@2.4.0) (2022-09-20)


### Features

* **cosmic-swingset:** Add heap snapshots ([42e43bc](https://github.com/Agoric/agoric-sdk/commit/42e43bce417a7538aa7bc6ed59320dfef45c1adb))
* add env to keep old snapshots on disk ([96e1077](https://github.com/Agoric/agoric-sdk/commit/96e1077683c64ff0c66fdfaa3993043006c8f368))
* use random snapshot memory init in integration test ([5c99976](https://github.com/Agoric/agoric-sdk/commit/5c999761e5cd0061f7eee483fcade290f98732c9))
* **telemetry:** `otel-and-flight-recorder.js` for the best of both ([a191b34](https://github.com/Agoric/agoric-sdk/commit/a191b34bd6a4b14f7280b0886fcfd44b5a42b6b5))


### Bug Fixes

* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **deployment:** `unsafe-reset-all` is a subcommand of `tendermint` ([deeb345](https://github.com/Agoric/agoric-sdk/commit/deeb3458ef3b19d771b574e0821dc1eec425b217))
* **deployment:** drive-by upgrade to Node.js 16 ([68ff922](https://github.com/Agoric/agoric-sdk/commit/68ff92257800022749494e169d62cffeaf1b53a7))



### [2.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.3.0...@agoric/deployment@2.3.1) (2022-05-28)


### Bug Fixes

* **deployment:** Do not override explicit faucet SOLO_COINS ([#5360](https://github.com/Agoric/agoric-sdk/issues/5360)) ([70fa390](https://github.com/Agoric/agoric-sdk/commit/70fa3908dde52a79658b5ef8f58c17406a030ed3))
* **vats:** make core config location independent ([9612d59](https://github.com/Agoric/agoric-sdk/commit/9612d591a4c58cf447f46e085f81dd0762b46d4a))



## [2.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.2.1...@agoric/deployment@2.3.0) (2022-05-09)


### Features

* **deployment:** Add script to run integration test locally ([e0d366a](https://github.com/Agoric/agoric-sdk/commit/e0d366a3c1445d73db55141deac5bcbb8ce0da2e))
* **deployment:** integration: record xsnap and swingStore traces ([fa669e0](https://github.com/Agoric/agoric-sdk/commit/fa669e05c98a42ca647e1603c9ba1e95bec42769))
* **dockerfile:** include otel collector ([6f5e686](https://github.com/Agoric/agoric-sdk/commit/6f5e68604409b87592b7d810e0f412a5571d5459))


### Bug Fixes

* **deployment:** default `faucet-helper.sh` to `show-rpcaddrs` ([352f6a6](https://github.com/Agoric/agoric-sdk/commit/352f6a63d31a629aa88de860916b65801ce71513))
* **deployment:** disable swingstore consistency check ([#5323](https://github.com/Agoric/agoric-sdk/issues/5323)) ([e9dc159](https://github.com/Agoric/agoric-sdk/commit/e9dc1592e2aa7b6d907c9e7bf63e0ff1b46af1d0))
* **deployment:** give out some tokens to new clients ([847da8d](https://github.com/Agoric/agoric-sdk/commit/847da8d6f35a31525923cf18ca789c8b367ad943))
* **deployment:** handle aarch64 and arm64 ([75965ee](https://github.com/Agoric/agoric-sdk/commit/75965ee3ba8e4ef42b55a710cc743ea8a874c4ef))
* **deployment:** Install ansible for current os ([4b5940f](https://github.com/Agoric/agoric-sdk/commit/4b5940f5474b0b7ce3fe0ab07f5dd75b0f40b58a))
* **deployment:** Update CI script ([#5322](https://github.com/Agoric/agoric-sdk/issues/5322)) ([efbbf54](https://github.com/Agoric/agoric-sdk/commit/efbbf54ec53e064e1038fd678fca9e88c083f312))
* **faucet-helper:** use published network config ([72b0a81](https://github.com/Agoric/agoric-sdk/commit/72b0a819c04613c510fe8b08b934cc8801aca551))



### [2.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.2.0...@agoric/deployment@2.2.1) (2022-04-18)


### Bug Fixes

* **deployment:** correct `cosmos-delegates.txt` discrepency ([e402593](https://github.com/Agoric/agoric-sdk/commit/e40259330bbde2efd74af55f1830e27fea02dd12))
* **deployment:** correct quoting in `faucet-helper.sh` ([7d58ad8](https://github.com/Agoric/agoric-sdk/commit/7d58ad831652baff4ca35f0694279da0330a29ad))
* **deployment:** faucet-helper add-egress ([27aca53](https://github.com/Agoric/agoric-sdk/commit/27aca53509ba6b88911e2c1d2de6e9b1a5a305fd))
* **docker:** increase network timeout ([57d6504](https://github.com/Agoric/agoric-sdk/commit/57d6504ba19815442832ed16d1fdfe3a6bd5ba14))
* **dockerfile:** add terrible retry logic for yarn install on failure ([9e8e9c4](https://github.com/Agoric/agoric-sdk/commit/9e8e9c49f868ed9a414a0b1fc4e9709c31763c31))



## [2.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.1.0...@agoric/deployment@2.2.0) (2022-02-24)


### Features

* **cosmic-swingset:** add tools for core-eval governance ([7368aa6](https://github.com/Agoric/agoric-sdk/commit/7368aa6c22be840733843b1da125eb659cc21d84))



## [2.1.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@2.0.0...@agoric/deployment@2.1.0) (2022-02-21)


### Features

* **deployment:** include short loadgen test in CI ([bae4ce8](https://github.com/Agoric/agoric-sdk/commit/bae4ce82a044a7ff745b5fa40815a79e522ef5e8))


### Bug Fixes

* **deployment:** capture `flight-recorder.bin` ([451a817](https://github.com/Agoric/agoric-sdk/commit/451a81775e8d60b68c072759afaed07420a2b400))
* **deployment:** use docker API instead of CLI ([0c049b4](https://github.com/Agoric/agoric-sdk/commit/0c049b4ffdd51af2b3c39541a84f7f349027a10d))



## [2.0.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.30.0...@agoric/deployment@2.0.0) (2021-12-22)


### ⚠ BREAKING CHANGES

* **deployment:** optional first block argument to `crunch.mjs`

### Features

* **deployment:** optional first block argument to `crunch.mjs` ([c03646d](https://github.com/Agoric/agoric-sdk/commit/c03646d7387200c3664e7aa03113514363a4611a))


### Bug Fixes

* **deployment:** use Docker `Cgroup Version` to init volumes ([3fa95e7](https://github.com/Agoric/agoric-sdk/commit/3fa95e77a0c79f4dfbf9651d5f295795ce7dc5df))



## [1.30.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.29.1...@agoric/deployment@1.30.0) (2021-12-02)


### Features

* **deployment:** add scripts to help find nondeterminism ([a1065c0](https://github.com/Agoric/agoric-sdk/commit/a1065c043dc721d967065fe1098ad5a0cb59a3fa))
* **deployment:** enable `ag-setup-cosmos init --noninteractive` ([e866975](https://github.com/Agoric/agoric-sdk/commit/e866975fcda19afdf14adbd1ad59fc2b353c8b06))
* **deployment:** trace KVStore activity during integration test ([a915950](https://github.com/Agoric/agoric-sdk/commit/a915950241aedd406a0df1018f22f8a517a64a26))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))


### Bug Fixes

* **deployment:** accomodate `$GOBIN` ([d75868b](https://github.com/Agoric/agoric-sdk/commit/d75868b9c05b5ede14af92f78f1ddeef95e915d8))
* **deployment:** adapt to new cosmic-swingset `install` target ([02e4f4f](https://github.com/Agoric/agoric-sdk/commit/02e4f4f4fe6c8c3a32ff4715f912e5344985722f))
* **deployment:** change token send timeout from 10m to ~3m ([1791164](https://github.com/Agoric/agoric-sdk/commit/179116480de42d032c0607c40494b40fc20832eb))
* **deployment:** get `install-deps.sh` working under Linux ([1c2effe](https://github.com/Agoric/agoric-sdk/commit/1c2effe98df72e8a2d2be917f60fbc1bb74afbb0))
* **deployment:** properly detect faucet address in faucet-helper.sh ([3b9e8b1](https://github.com/Agoric/agoric-sdk/commit/3b9e8b1d72822d373021a36a45921b42e347899e))
* **deployment:** work around bundling divergence in Dockerfile.sdk ([1170879](https://github.com/Agoric/agoric-sdk/commit/11708793b1fe174a4411c0b7f72f439e751421b6))
* **faucet:** don't fail if `cosmos-delegates.txt` doesn't exist ([f650334](https://github.com/Agoric/agoric-sdk/commit/f65033489cb824d115a6c6dc5811868e5b53aeae))



### [1.29.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.29.0...@agoric/deployment@1.29.1) (2021-10-13)

**Note:** Version bump only for package @agoric/deployment





## [1.29.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.14...@agoric/deployment@1.29.0) (2021-09-23)


### Features

* **deployment:** use latest faucet-helper.sh from testnet ([83f45f6](https://github.com/Agoric/agoric-sdk/commit/83f45f6be8112b9e74f687d9436963051d9e5308))


### Bug Fixes

* **deployment:** wait for staking tokens before creating validator ([59952d3](https://github.com/Agoric/agoric-sdk/commit/59952d3afd78ceb9b00eac5a8ccc84bef9d2ee4b))



### [1.28.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.13...@agoric/deployment@1.28.14) (2021-09-15)

**Note:** Version bump only for package @agoric/deployment





### [1.28.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.12...@agoric/deployment@1.28.13) (2021-08-21)

**Note:** Version bump only for package @agoric/deployment





### [1.28.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.11...@agoric/deployment@1.28.12) (2021-08-18)


### Bug Fixes

* **deployment:** tolerate cycling of buster release ([94cbe35](https://github.com/Agoric/agoric-sdk/commit/94cbe3595488008cdd6ec9ff1bb04f55313c2b74))
* **deployment:** update faucet urun and bootstrap supply ([7e944f7](https://github.com/Agoric/agoric-sdk/commit/7e944f71b03a6e7b640da4f87fd2f2da4a20d896))
* **deployment:** write to .ag-chain-cosmos/data/chain.slog ([35cb64e](https://github.com/Agoric/agoric-sdk/commit/35cb64e2097938a2cb48ba1397121bd444040899))



### [1.28.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.10...@agoric/deployment@1.28.11) (2021-08-17)

**Note:** Version bump only for package @agoric/deployment





### [1.28.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.9...@agoric/deployment@1.28.10) (2021-08-16)


### Bug Fixes

* remove more instances of `.cjs` files ([0f61d9b](https://github.com/Agoric/agoric-sdk/commit/0f61d9bff763aeb21c7b61010040ca5e7bd964eb))



### [1.28.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.6...@agoric/deployment@1.28.9) (2021-08-15)


### Bug Fixes

* **deployment:** fix Makefile copy-pasta and dockerignore ([c8df74b](https://github.com/Agoric/agoric-sdk/commit/c8df74bc6e56ad117e01a04298e419e7646862c5))
* **deployment:** propagate submodules to docker-build-sdk ([8af454c](https://github.com/Agoric/agoric-sdk/commit/8af454cb5851bb833924aa863f3d02cdfbbcaa8a))
* **deployment:** use proper path to build.js ([78d2d73](https://github.com/Agoric/agoric-sdk/commit/78d2d73e33311ee09eaec17fa3b5c4d393a73621))

### 0.26.10 (2021-07-28)


### Bug Fixes

* **deployment:** improve the `provision` command to be idempotent ([622bbd8](https://github.com/Agoric/agoric-sdk/commit/622bbd8c07e79fa1de3b00a55224b9b462f4f75b))
* **deployment:** only format and mount /dev/sda for digitalocean ([745f90e](https://github.com/Agoric/agoric-sdk/commit/745f90e8a40745dbb832af56789a3daa5fe787c2))
* **deployment:** properly quote JSON pubkey from Ansible ([44132fa](https://github.com/Agoric/agoric-sdk/commit/44132fad78e7a6b59a324f47d986cefe140e1c30))



### [1.28.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.6...@agoric/deployment@1.28.8) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **deployment:** improve the `provision` command to be idempotent ([622bbd8](https://github.com/Agoric/agoric-sdk/commit/622bbd8c07e79fa1de3b00a55224b9b462f4f75b))
* **deployment:** only format and mount /dev/sda for digitalocean ([745f90e](https://github.com/Agoric/agoric-sdk/commit/745f90e8a40745dbb832af56789a3daa5fe787c2))
* **deployment:** properly quote JSON pubkey from Ansible ([44132fa](https://github.com/Agoric/agoric-sdk/commit/44132fad78e7a6b59a324f47d986cefe140e1c30))



### [1.28.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.6...@agoric/deployment@1.28.7) (2021-07-28)


### Bug Fixes

* **deployment:** improve the `provision` command to be idempotent ([622bbd8](https://github.com/Agoric/agoric-sdk/commit/622bbd8c07e79fa1de3b00a55224b9b462f4f75b))
* **deployment:** only format and mount /dev/sda for digitalocean ([745f90e](https://github.com/Agoric/agoric-sdk/commit/745f90e8a40745dbb832af56789a3daa5fe787c2))
* **deployment:** properly quote JSON pubkey from Ansible ([44132fa](https://github.com/Agoric/agoric-sdk/commit/44132fad78e7a6b59a324f47d986cefe140e1c30))



### [1.28.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.5...@agoric/deployment@1.28.6) (2021-07-01)

**Note:** Version bump only for package @agoric/deployment





### [1.28.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.4...@agoric/deployment@1.28.5) (2021-06-28)

**Note:** Version bump only for package @agoric/deployment





### [1.28.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.3...@agoric/deployment@1.28.4) (2021-06-25)


### Bug Fixes

* **deployment:** ensure that the faucet is given urun ([2e046f7](https://github.com/Agoric/agoric-sdk/commit/2e046f742be5bf01a69555bceb3acff5550b6ab4))



### [1.28.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.2...@agoric/deployment@1.28.3) (2021-06-24)

**Note:** Version bump only for package @agoric/deployment





### [1.28.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.1...@agoric/deployment@1.28.2) (2021-06-23)

**Note:** Version bump only for package @agoric/deployment





### [1.28.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.28.0...@agoric/deployment@1.28.1) (2021-06-16)


### Bug Fixes

* **deployment:** many tweaks to make more robust ([16ce07d](https://github.com/Agoric/agoric-sdk/commit/16ce07d1269e66a016a0326ecc6ca4d42a76f75d))



## [1.28.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.27.2...@agoric/deployment@1.28.0) (2021-06-15)


### Features

* for Keplr support (and presumably other wallets) we need CORS ([7986548](https://github.com/Agoric/agoric-sdk/commit/7986548c528e282c129175f0292d3db6b00a9468))
* **deployment:** --genesis=FILE and unique digitalocean SSH keys ([00d69da](https://github.com/Agoric/agoric-sdk/commit/00d69dab293f166e8e17adc05b0121dd99534adf))
* **deployment:** fetch --genesis=<url> ([e706e74](https://github.com/Agoric/agoric-sdk/commit/e706e747e8cdd54ed74f525b91d2d3fc2db61254))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* remove genesis bootstrap config; use just add-genesis-account ([fdc1255](https://github.com/Agoric/agoric-sdk/commit/fdc1255d66c702e8970ecf795be191dcf2291c39))



## [1.27.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.27.1...@agoric/deployment@1.27.2) (2021-05-10)


### Bug Fixes

* **deployment:** make copy.yml copy ag-cosmos-helper by default ([2d3f5fb](https://github.com/Agoric/agoric-sdk/commit/2d3f5fbb32c294aa47453f96054778960a7f1dd7))





## [1.27.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.27.0...@agoric/deployment@1.27.1) (2021-05-05)


### Bug Fixes

* cope with getting moddable submodule from agoric-labs ([a1a2693](https://github.com/Agoric/agoric-sdk/commit/a1a26931d17ade84ae97aa3a9d0e7c5c58a74491))





# [1.27.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.5...@agoric/deployment@1.27.0) (2021-05-05)


### Bug Fixes

* adjust git-revision.txt generation ([6a8b0f2](https://github.com/Agoric/agoric-sdk/commit/6a8b0f20df17d5427b1c70273bcc170c7945dc2a))
* clean up Docker directory usage ([a97d0b3](https://github.com/Agoric/agoric-sdk/commit/a97d0b3edc1f47e04d93d37c6e999d0798903d03))
* correct faucet-helper.sh show-faucet-address and use it ([5e236e6](https://github.com/Agoric/agoric-sdk/commit/5e236e6cc0b457dc5c764d4494f4c4d8e3031f29))
* eliminate urun from cosmos bootstrap (it comes from treasury) ([16c1694](https://github.com/Agoric/agoric-sdk/commit/16c169446602a187810949748915eca31894fcb9))
* include backwards-compat /data directory links ([16feacd](https://github.com/Agoric/agoric-sdk/commit/16feacdd94400920190b6283a76968c6a61b3055))
* more Docker paths ([7783bb4](https://github.com/Agoric/agoric-sdk/commit/7783bb4740f4ea83b788fec45c1d1aa70145bba1))


### Features

* have the bank use normal purses when not on chain ([90ab888](https://github.com/Agoric/agoric-sdk/commit/90ab888c5cdc71a2322ca05ad813c6411c876a74))





## [1.26.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.4...@agoric/deployment@1.26.5) (2021-04-22)


### Bug Fixes

* faucet delegate gives 62BLD, 93RUN ([4b80400](https://github.com/Agoric/agoric-sdk/commit/4b804005d2e58acf8cc86cca5312b9312fe9b77d))
* rename cosmos-level tokens uagstake/uag to ubld/urun ([0557983](https://github.com/Agoric/agoric-sdk/commit/0557983210571c9c2ba801d68644d71641a3f790))
* reorganise deployment ([5e7f537](https://github.com/Agoric/agoric-sdk/commit/5e7f537021f747327673b6f5819324eb048a3d96))





## [1.26.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.3...@agoric/deployment@1.26.4) (2021-04-18)

**Note:** Version bump only for package @agoric/deployment





## [1.26.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.2...@agoric/deployment@1.26.3) (2021-04-16)

**Note:** Version bump only for package @agoric/deployment





## [1.26.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.1...@agoric/deployment@1.26.2) (2021-04-07)

**Note:** Version bump only for package @agoric/deployment





## [1.26.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.26.0...@agoric/deployment@1.26.1) (2021-04-06)

**Note:** Version bump only for package @agoric/deployment





# [1.26.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.25.0...@agoric/deployment@1.26.0) (2021-03-24)


### Features

* introduce separate roles for deployment placements ([a395571](https://github.com/Agoric/agoric-sdk/commit/a395571e7f8a06a4a5b7561bbcbfdcf3259454fa))





# [1.25.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.24.2...@agoric/deployment@1.25.0) (2021-03-16)


### Bug Fixes

* changes needed for ag-setup-cosmos to be usable again ([4767bf5](https://github.com/Agoric/agoric-sdk/commit/4767bf5de61f34b050ec0ba54e61c802fd0ef12c))
* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **deployment:** bump up minimum node size to 4GB RAM ([030357c](https://github.com/Agoric/agoric-sdk/commit/030357cef635508a94c92f9f34ea93df045c2625))
* properly pin the Moddable SDK version ([58333e0](https://github.com/Agoric/agoric-sdk/commit/58333e069192267fc96e30bb5272edc03b3faa04))


### Features

* **deployment:** allow networks to init new placements ([13d6c2c](https://github.com/Agoric/agoric-sdk/commit/13d6c2ccc500cbc05c51790b09d218fa2e1f0f29))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))





## [1.24.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.24.1...@agoric/deployment@1.24.2) (2021-02-22)


### Bug Fixes

* be tolerant of delegation errors ([db75f65](https://github.com/Agoric/agoric-sdk/commit/db75f651f8742340714264848c3cfb12ee72a16f))
* properly docker push agoric/deployment:$(TAG) ([8afd58b](https://github.com/Agoric/agoric-sdk/commit/8afd58b5f9c1552ca564433c1cfd6f61b8f6cf2a))
* remove journalbeat from build; it fails and we don't use it ([c2fed3b](https://github.com/Agoric/agoric-sdk/commit/c2fed3b2992385c5e20d9c8f26507089b546c5a3))





## [1.24.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.24.0...@agoric/deployment@1.24.1) (2021-02-16)


### Bug Fixes

* adapt to new cosmos-sdk ([3b12c9e](https://github.com/Agoric/agoric-sdk/commit/3b12c9e2ef33117206189ecd085f51523c7d0d87))
* increase testnet limit to allow more than 40 peers ([b72804f](https://github.com/Agoric/agoric-sdk/commit/b72804f4e0ab09af073e6aab3b5e3c6899549320))
* reenable Docker builds and deployment ([559ea06](https://github.com/Agoric/agoric-sdk/commit/559ea062251d73e3a6921c85f63631a50ddfad35))
* remove unnecessary Ansible step ([9bd7e61](https://github.com/Agoric/agoric-sdk/commit/9bd7e61ba48546c7ad76a20cf2db5e14d364b102))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* run ag-setup-cosmos under SES ([13c8efe](https://github.com/Agoric/agoric-sdk/commit/13c8efe6cf9ebc8c6a71b9098410c1af4162b570))
* simple fixes for chain parameters ([a90ae2f](https://github.com/Agoric/agoric-sdk/commit/a90ae2fba72e2038be4987d390f9dfb9cb163897))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [1.24.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.23.0...@agoric/deployment@1.24.0) (2020-12-10)


### Bug Fixes

* clear up all the paths through `agoric start` ([1b89571](https://github.com/Agoric/agoric-sdk/commit/1b89571734e9c7fd4748b1cf7b6d5a985f045ef3))
* complete the migration to dweb.crt and dweb.key ([9f2383e](https://github.com/Agoric/agoric-sdk/commit/9f2383e7d761e5f91743b3ceaffaad9f253e51cc))
* make bigdipper.sh even more robust ([00b76a3](https://github.com/Agoric/agoric-sdk/commit/00b76a3c6d06d946219e4ac65ee8b9ad089ac55c))
* more support for hacktheorb ([b58e5cd](https://github.com/Agoric/agoric-sdk/commit/b58e5cd1c8b16467565967edbe4140a0749274d7))
* trim 300MB off of the Docker image size, and speed up builds ([01c4fc1](https://github.com/Agoric/agoric-sdk/commit/01c4fc13c764e30ebc2d8fa95b457569f524c09d))
* update Docker build steps ([7c7379d](https://github.com/Agoric/agoric-sdk/commit/7c7379db95f9b09151ad17533c9fa0c5c864c54c))
* use nodejs instead of sed for parsing package.json ([f58df9c](https://github.com/Agoric/agoric-sdk/commit/f58df9c1ca9e94747e7f1f9fd9509b4ee0858984))


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





# [1.23.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.22.1-dev.0...@agoric/deployment@1.23.0) (2020-11-07)


### Bug Fixes

* prepare for --import-from=node0 ([7300c3a](https://github.com/Agoric/agoric-sdk/commit/7300c3a4cde46963802f10ae8d0eb3d4134ecdeb))
* tweak the deployment process ([6606a67](https://github.com/Agoric/agoric-sdk/commit/6606a679c6ce4c2cedee54e39d3777b4e59bff65))


### Features

* update bigdipper scripts and services ([2be854d](https://github.com/Agoric/agoric-sdk/commit/2be854debb1c45ab702fd5cfabccbfe479e7eff6))





## [1.22.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.22.0...@agoric/deployment@1.22.1-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/deployment





# [1.22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.21.2-dev.2...@agoric/deployment@1.22.0) (2020-10-11)


### Bug Fixes

* get deployment to work ([77d2c6b](https://github.com/Agoric/agoric-sdk/commit/77d2c6b47bc18a503b46949e59fc0fe6d5a14225))
* make ag-cosmos-helper's home $HOME/.ag-cosmos-helper again ([1b9ad64](https://github.com/Agoric/agoric-sdk/commit/1b9ad647916d2c8de11b5f884bb88613e95ddcaa))
* upgrade to our --keyring-dir PR (temporarily) ([38e170d](https://github.com/Agoric/agoric-sdk/commit/38e170d42c2af74a565749d040f365905cd0d3fc))
* use `gentx --client-home=...` to initialise genesis validators ([54c5a2f](https://github.com/Agoric/agoric-sdk/commit/54c5a2f2e23f7f9df254b35f2657e449d9fb847a))
* use gentx --home-client flag ([5595b41](https://github.com/Agoric/agoric-sdk/commit/5595b410377116b7a2d20d39a46ec87d2b5ea01f))
* use gentx --home-server instead of --home-client ([ed634bf](https://github.com/Agoric/agoric-sdk/commit/ed634bfbe976ca48a203b4f44b3eb0d62e1edd82))


### Features

* expose API server (0.0.0.0:1317) for deployed chain ([d910692](https://github.com/Agoric/agoric-sdk/commit/d9106926fec9250ac48dfe918e73258c0cf2af60))





## [1.21.2-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.21.2-dev.1...@agoric/deployment@1.21.2-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/deployment





## [1.21.2-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.21.2-dev.0...@agoric/deployment@1.21.2-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/deployment





## [1.21.2-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.21.1...@agoric/deployment@1.21.2-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/deployment





## [1.21.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.21.0...@agoric/deployment@1.21.1) (2020-09-16)


### Bug Fixes

* create dweb/data if it doesn't exist ([f6fcb2e](https://github.com/Agoric/agoric-sdk/commit/f6fcb2e89a205b9861ade6b0295d9c1376fc8c00))
* don't rely on validator DNS names when finding the network ([56e0cb3](https://github.com/Agoric/agoric-sdk/commit/56e0cb363af5d6130e74ee6b1b5335c200f4042e))
* excise half-fast Vagrant support ([9bbab1c](https://github.com/Agoric/agoric-sdk/commit/9bbab1c204a0c44bad2e51bcd0f7d08ad02b5a5b))





# [1.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.20.0...@agoric/deployment@1.21.0) (2020-08-31)


### Bug Fixes

* add default moniker to hosts ([08cc625](https://github.com/Agoric/agoric-sdk/commit/08cc6258d5eadadd363f79fd257ff3cacd442a0a))
* allow faucet-helper.sh to work without web access ([8439ba3](https://github.com/Agoric/agoric-sdk/commit/8439ba34ed15347428c7fcffcb8b4458d49d6863))
* always rebuild the dweb config ([517041d](https://github.com/Agoric/agoric-sdk/commit/517041dd13ca16e5b915578b0f0cf6f8f27158fd))
* create a dweb `start.sh` so we keep the same systemd service ([a58abb4](https://github.com/Agoric/agoric-sdk/commit/a58abb46bcd10adc0460312acd7f877411478d4c))
* don't hardcode Agoric parameters within Ansible scripts ([19d0e13](https://github.com/Agoric/agoric-sdk/commit/19d0e1387060b54d1cfe9892039105a2270570ed))
* force `--pruning=nothing` until we upgrade to Stargate ([9a3d54b](https://github.com/Agoric/agoric-sdk/commit/9a3d54bac54a92babe6fa1610c2a8c88f85a1e6a))
* move faucet into SETUP_HOME/.. to share between chains ([76b6a5d](https://github.com/Agoric/agoric-sdk/commit/76b6a5db54ddf299a4933e5654a19f9763aa33bf))
* only create-validator from the actual node ([6c76bcc](https://github.com/Agoric/agoric-sdk/commit/6c76bccae17d91b5e66ad6b43f9d684fec7d45cc))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* remove controller ag-solo, as it is obsolete ([c698e4c](https://github.com/Agoric/agoric-sdk/commit/c698e4c8fc71f3a334bf546dce8d1994c2a68adf))
* remove more BOOTSTRAP_ADDRESS references ([f2141b6](https://github.com/Agoric/agoric-sdk/commit/f2141b68fe8f239e575e4a4dc7e6be70b1ffc7f0))
* remove more controller references ([c9af5a1](https://github.com/Agoric/agoric-sdk/commit/c9af5a11ac5ffa1afcbc47c6399f35945055e3b2))
* since we don't simulate, make sure our gas estimate is good ([a0a2df5](https://github.com/Agoric/agoric-sdk/commit/a0a2df5e614bc64a2ceddb4f988ba52dc611ffad))
* update vagrant/Dockerfile to buster and add to build ([c8da8fc](https://github.com/Agoric/agoric-sdk/commit/c8da8fc7b9194cc099bf4ec63fdadb84d8a7d8d1))
* upgrade Docker images to Debian buster ([1016cc5](https://github.com/Agoric/agoric-sdk/commit/1016cc5fa27624d2265398d8900f2d4847c9864f))
* use `agoric set-default` instead of set-json.js ([7e1f612](https://github.com/Agoric/agoric-sdk/commit/7e1f612ff3f78c9e614cc63c9aa98e0d1f1a2dd5))


### Features

* add `ag-setup-solo` compatibility, `ag-solo setup` ([4abe446](https://github.com/Agoric/agoric-sdk/commit/4abe4468a0626c2adfd170459c26c3fe973595a0))
* add a /dev/sda -> /home filesystem for Digital Ocean ([71895fc](https://github.com/Agoric/agoric-sdk/commit/71895fcb8489535f8f29569d65aaa889f94424e0))
* add a stub for decentralised web (dweb) ([d81b1f2](https://github.com/Agoric/agoric-sdk/commit/d81b1f262f365a994e2d5e29ff0aa027ed7b2841))
* add ansible plays for shuffling configs around ([d153aa2](https://github.com/Agoric/agoric-sdk/commit/d153aa24c43fef84614653fab401ce98d20b8c02))
* add export-genesis playbook ([cba5ae0](https://github.com/Agoric/agoric-sdk/commit/cba5ae0e5cf82b61c8d95f5be57a7d9edb94e5b1))
* implement add-egress, add-delegate ([ffd474a](https://github.com/Agoric/agoric-sdk/commit/ffd474abc292fbda4f314fb1715af7b4b6c92dcd))
* move faucet account onto the controller where it is safer ([8ba1c46](https://github.com/Agoric/agoric-sdk/commit/8ba1c462b9ecd5b47c19b7fe473b49de01e268ee))
* provision without Python ([1fdc1d3](https://github.com/Agoric/agoric-sdk/commit/1fdc1d31e7684705ebaf337be19271dbcdd9cbdc))





# [1.20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.19.3...@agoric/deployment@1.20.0) (2020-06-30)


### Bug Fixes

* shorten chain cadence to 2 seconds (instead of default 5) ([12a5688](https://github.com/Agoric/agoric-sdk/commit/12a568873236565491b90996c93b41b2edbdc055))
* systematically use bin/ag-chain-cosmos ([527ae65](https://github.com/Agoric/agoric-sdk/commit/527ae655acc95ccf9fd2968e551adbe6d2453113))
* use provisionpass for the bootstrap address ([b0c2b73](https://github.com/Agoric/agoric-sdk/commit/b0c2b73ec6ee5d0dda2d3a04c2b251a7ff0e0331))


### Features

* further along the path of state export and migration ([13dc588](https://github.com/Agoric/agoric-sdk/commit/13dc588ee3502df243e5e8038406b737df21ccd8))





## [1.19.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.19.2...@agoric/deployment@1.19.3) (2020-05-17)

**Note:** Version bump only for package @agoric/deployment





## [1.19.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.19.1...@agoric/deployment@1.19.2) (2020-05-10)


### Bug Fixes

* bigdipper settings changes ([facb79d](https://github.com/Agoric/agoric-sdk/commit/facb79d89a470371c67e89cb08656ed5cfdc5348))
* index_all_keys for IBC ([f513bda](https://github.com/Agoric/agoric-sdk/commit/f513bdabd413b36a8bcab28b598eed4fef7da561))





## [1.19.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.19.0...@agoric/deployment@1.19.1) (2020-05-04)


### Bug Fixes

* fix "delegates" conditional syntax ([0a774a5](https://github.com/Agoric/agoric-sdk/commit/0a774a57be0697a8351f1a8523710f04e5368e82))
* update to docker image node:lts-stretch ([ba1ad59](https://github.com/Agoric/agoric-sdk/commit/ba1ad59eac598879ebbac27f50856e24f7621a35))





# [1.19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.19.0-alpha.0...@agoric/deployment@1.19.0) (2020-04-13)

**Note:** Version bump only for package @agoric/deployment





# [1.19.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.18.2...@agoric/deployment@1.19.0-alpha.0) (2020-04-12)


### Bug Fixes

* reinstate carrying forward public keys ([504a8ce](https://github.com/Agoric/agoric-sdk/commit/504a8ce6a004d08c9436ed88a39e3c63ecb5202b))


### Features

* use SETUP_HOME/cosmos-delegates.txt and increase defaults ([5e87ae1](https://github.com/Agoric/agoric-sdk/commit/5e87ae1c501adf5b35371c30dc999bfcea8c75e6))





## [1.18.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.18.1...@agoric/deployment@1.18.2) (2020-04-03)


### Bug Fixes

* make provisioning server work again ([c7cf3b3](https://github.com/Agoric/agoric-sdk/commit/c7cf3b3e0d5e0966ce87639ca1aa36546f365e38))





## [1.18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.18.1-alpha.0...@agoric/deployment@1.18.1) (2020-04-02)

**Note:** Version bump only for package @agoric/deployment





## [1.18.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.18.0...@agoric/deployment@1.18.1-alpha.0) (2020-04-02)


### Bug Fixes

* add `single-node` subcommand on the Docker entrypoint ([210edb6](https://github.com/Agoric/agoric-sdk/commit/210edb683280791b0e74831860c7e93176dadbed))





# 1.18.0 (2020-03-26)


### Bug Fixes

* we now send 50agstake to each of the validators ([9a78552](https://github.com/Agoric/agoric-sdk/commit/9a78552606db91b7f678464b27261a391844916d))
* **ag-lcd:** tolerate cosmos/cosmos-sdk[#5592](https://github.com/Agoric/agoric-sdk/issues/5592) ([9eee270](https://github.com/Agoric/agoric-sdk/commit/9eee270beeeef415bad3a988c7ee890523f9d7e8))
* **ansible:** remove state that needs regeneration ([110dcb8](https://github.com/Agoric/agoric-sdk/commit/110dcb8625eb9d4d918f02c69e92451bcc77296b))
* **chain:** state is being stored correctly again ([fe0b33d](https://github.com/Agoric/agoric-sdk/commit/fe0b33d2d33b4989f63d1e7030de61b5e886e69f))
* **deployment:** update deployment steps ([7527eb0](https://github.com/Agoric/agoric-sdk/commit/7527eb01a3fd5fd4eb4db6f7e9452ccacfe39a74))
* rename ustake -> uagstake ([ac89559](https://github.com/Agoric/agoric-sdk/commit/ac895597e57a118948d686a0f60ebf8aed18d64e))
* **ansible:** double the stakes ([21fe284](https://github.com/Agoric/agoric-sdk/commit/21fe284d05094b0ac932ae39f30878e7f97c2df3))
* **deployment:** properly use agoric-sdk tag ([75dd0c3](https://github.com/Agoric/agoric-sdk/commit/75dd0c328a8aba9543d10af37408f2b4608faddc))
* **deployment:** track deployment version ([ad63fee](https://github.com/Agoric/agoric-sdk/commit/ad63fee58a55ca281a6f3b0a20392d81680ffa64))
* **deployment:** update Dockerfile for Makefile ([f5607af](https://github.com/Agoric/agoric-sdk/commit/f5607afd15742a6b5c2f064c616a2ce8bd0e6130))
* **docker:** propagate git-revision correctly ([d8e6f7e](https://github.com/Agoric/agoric-sdk/commit/d8e6f7eca73a9fe6ba5ce4f9a01d38cd768c89d1))
* **docker:** remove dependency on NPM ([d3a8050](https://github.com/Agoric/agoric-sdk/commit/d3a805029da851985ae59836f76f6a4dd794488b))
* **fluentd:** tweak the Loki records ([cf62725](https://github.com/Agoric/agoric-sdk/commit/cf627258476bbee4a297082048f6f5784e2e04fc))
* **fluentd:** update cache before running apt ([6d44e70](https://github.com/Agoric/agoric-sdk/commit/6d44e70bba2f52f62b6507b98548d26aa43443d8))
* **fluentd:** update Loki store format ([a834015](https://github.com/Agoric/agoric-sdk/commit/a834015d1e4f450ddc4a69f852005da425f70fca))
* **ustake:** stake is actually micro-stake ([1aaf14f](https://github.com/Agoric/agoric-sdk/commit/1aaf14f078d1defb09d52692e78dabb9854bbb27))


### Features

* **bigdipper:** add Big Dipper config ([f98ff43](https://github.com/Agoric/agoric-sdk/commit/f98ff43e6305e609c4ddaf953ff7b021a451ffaa))
* **bootstrap:** accept explicit semver (such as --bump=1.17.0) ([b3da002](https://github.com/Agoric/agoric-sdk/commit/b3da00237234353e8acfe121118a6a41e2ef41ba))
* **deployment:** add Prometheus support for monitoring ([713f63a](https://github.com/Agoric/agoric-sdk/commit/713f63a4b3ca347ba3c65283228dc33665fc10b3)), closes [#337](https://github.com/Agoric/agoric-sdk/issues/337)
* **fluentd:** support Loki log store ([c4bffbf](https://github.com/Agoric/agoric-sdk/commit/c4bffbf6e175e8df8bc321d5e955e200118e61bf))
* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))
