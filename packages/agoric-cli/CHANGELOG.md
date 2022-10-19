# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.18.2](https://github.com/Agoric/agoric-sdk/compare/agoric@0.18.1...agoric@0.18.2) (2022-10-18)

**Note:** Version bump only for package agoric





### [0.18.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.18.0...agoric@0.18.1) (2022-10-08)


### Bug Fixes

* **cli:** wallet against localhost ([3214477](https://github.com/Agoric/agoric-sdk/commit/32144772ce336718eb487cdbc2b971f6042fac2f))
* strike "Initial" from Economic Committee ([0f3ce16](https://github.com/Agoric/agoric-sdk/commit/0f3ce1695635551b800f04e0e232d25e16c8f562))



## [0.18.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.17.0...agoric@0.18.0) (2022-10-05)


### Features

* **agoric-cli:** proposeChangeMintLimit ([#6278](https://github.com/Agoric/agoric-sdk/issues/6278)) ([7165dea](https://github.com/Agoric/agoric-sdk/commit/7165deabc5a6bfef04bb7da4baa3bfcee191ee02))
* **agoric-cli:** support --home, --keyring-backend ([#6316](https://github.com/Agoric/agoric-sdk/issues/6316)) ([b4ed09b](https://github.com/Agoric/agoric-sdk/commit/b4ed09b92f03abdaeb8f4befd31b11e0d3586aa7))
* **cli:** show status of invitations ([8506e6d](https://github.com/Agoric/agoric-sdk/commit/8506e6d87ef331e781c9d2e2251fdcf48e784e04))
* **cli:** use new wallet.current node ([71effe7](https://github.com/Agoric/agoric-sdk/commit/71effe758c28181b8709ae4ccf025fcec7bb8a38))
* more explicit previous offer args ([2faeb29](https://github.com/Agoric/agoric-sdk/commit/2faeb290c737e48fd26d3c1bb49b33c49c1931af))


### Bug Fixes

* avoid colliding with 'agoric' chain, e.g. in Keplr ([692084c](https://github.com/Agoric/agoric-sdk/commit/692084ce9328b11e23ab8b46025f83eb8d1b5b3d))
* make it possible to set decimalPlaces when calling startPSM ([#6348](https://github.com/Agoric/agoric-sdk/issues/6348)) ([46aa80e](https://github.com/Agoric/agoric-sdk/commit/46aa80e1f8d8a73a8a7853ebcd937f5c2df64a42))
* **agoric-cli:** don't crash on non-contract offers ([f5fe1ee](https://github.com/Agoric/agoric-sdk/commit/f5fe1ee60fb916db005ce19d5f0e56a2b7a485f0))
* **cli:** wallet show latest ([415761f](https://github.com/Agoric/agoric-sdk/commit/415761f7156314b2413ee78624447302ab50cf51))



## [0.17.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.16.0...agoric@0.17.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **legacy-smart-wallet:** remove dead package
* **run-protocol:** rename to inter-protocol

### Features

* add dd-trace to dependencies ([5a79dfb](https://github.com/Agoric/agoric-sdk/commit/5a79dfbbd02fa97b3f750832e2304be914814c27))
* **agoric:** new `stream` command ([a89d537](https://github.com/Agoric/agoric-sdk/commit/a89d537b0ac3a7e3f2cbc60a6bb075031261d826))
* **agoric-cli:** `cache` deploy script endowment ([4aa0221](https://github.com/Agoric/agoric-sdk/commit/4aa02218b802be4c49886e9492244d35777585c0))
* **agoric-cli:** Add agoric publish subcommand ([b4a8c7d](https://github.com/Agoric/agoric-sdk/commit/b4a8c7da7c5a1aebc4c651266d4082a5d5251a81))
* **agoric-cli:** agops tool ([d3d114b](https://github.com/Agoric/agoric-sdk/commit/d3d114b52e20fbed1a76031e383eb268d7a72e4e))
* **agoric-cli:** Reveal block heights to agoric follow, opt-in for lossy ([a19787b](https://github.com/Agoric/agoric-sdk/commit/a19787bf4f0e22fe781eb60868a57f7759f88c21))
* **agoric-cli:** wallet command ([a41644f](https://github.com/Agoric/agoric-sdk/commit/a41644f27d6ab886434a542adde01d203124c966))
* **chain-streams:** plumb through retry attempt counter ([345adc4](https://github.com/Agoric/agoric-sdk/commit/345adc43a9d5d478b631c8d9715ed90f647f54dd))
* **cli:** balance display set ([1ef4970](https://github.com/Agoric/agoric-sdk/commit/1ef49706ecef468f25723f34f4ec4d177df00e58))
* **cli:** psm governance ([19cf0fb](https://github.com/Agoric/agoric-sdk/commit/19cf0fbed58d7b93d949ffa2a97d2d386ecd1d32))
* **cli:** wallet provision ([cda3377](https://github.com/Agoric/agoric-sdk/commit/cda33775de869a72cb5c6ab5c97c326312171a3f))
* **cli:** wallet send non-interactive ([72b351e](https://github.com/Agoric/agoric-sdk/commit/72b351e09704e12c4bd511e6eb8444f99dd43952))
* contract for single on-chain wallet ([0184a89](https://github.com/Agoric/agoric-sdk/commit/0184a89403a3719f21dc61de37865512cdc819ae))


### Bug Fixes

* **agoric-cli:** Compensate in agoric follow for decoder signature change ([46e5291](https://github.com/Agoric/agoric-sdk/commit/46e529102af230a337ef27822dcf3aa17f47602e))
* **agoric-cli:** Follow-up: conditionally coerce RPC addresses ([9fa440e](https://github.com/Agoric/agoric-sdk/commit/9fa440eaf4c99951e1936855ed3c51e0f8c0962b))
* **agoric-cli:** Follow-up: heuristic for distinguishing bare hostnames from URLs ([908f723](https://github.com/Agoric/agoric-sdk/commit/908f72396273207a568425060390f262b9060b78))
* **agoric-cli:** Follow-up: thread random as power ([39e67c4](https://github.com/Agoric/agoric-sdk/commit/39e67c4f2cc9ef9f79cc88a5f69008003c98f4d4))
* **agoric-cli:** perf watch ([c14aca6](https://github.com/Agoric/agoric-sdk/commit/c14aca60a05f5dec74d3e2152c580578a5ed962c))
* **agoric-cli:** psm giveMinted ([c6ef58c](https://github.com/Agoric/agoric-sdk/commit/c6ef58ca59cb5a419cf809ef74c9cc92eb084908))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **agoric-cli:** publishBundle types ([#5459](https://github.com/Agoric/agoric-sdk/issues/5459)) ([5aafc8c](https://github.com/Agoric/agoric-sdk/commit/5aafc8ce1f1babd76c2389c836bd952888a80a65))
* **agoric-cli:** Thread rpcAddresses for Cosmos publishBundle ([06344c6](https://github.com/Agoric/agoric-sdk/commit/06344c648afefbfaad108210daa8b81cb1214bd7))
* **agoric-cli:** use the new casting API ([99060de](https://github.com/Agoric/agoric-sdk/commit/99060defdcead99b7d2f153383537e752256c219))
* **casting:** correct backoff timer logic ([1b41ef5](https://github.com/Agoric/agoric-sdk/commit/1b41ef56bec54f89296376a0677c421f66baabba))
* missed one ([#5573](https://github.com/Agoric/agoric-sdk/issues/5573)) ([24506ab](https://github.com/Agoric/agoric-sdk/commit/24506abb7ab9f59b14b7489c15efdeae7fbd1a63))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))


### Miscellaneous Chores

* **legacy-smart-wallet:** remove dead package ([bb56ce8](https://github.com/Agoric/agoric-sdk/commit/bb56ce8ed0556949c5e434734cedf113ae649fdb))



## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.15.1...agoric@0.16.0) (2022-05-28)


### Features

* **agoric-cli:** `deploy` accepts `--hostport=URL` ([512eefe](https://github.com/Agoric/agoric-sdk/commit/512eefe50318cc31abcb28cc502ae6cdac9eea8e))
* **agoric-cli:** Inject publishBundle and listConnections to deploy scripts ([69647a2](https://github.com/Agoric/agoric-sdk/commit/69647a274e8450112f98638a13f4afb0effdd47d))
* **chain-config:** set distribution fraction to 10% ([d4e47bc](https://github.com/Agoric/agoric-sdk/commit/d4e47bc0eda442754e36e9d5bf399e61b26d086a))
* **vats:** decentral-economy-config to launch full economy at bootstrap ([ed49ed9](https://github.com/Agoric/agoric-sdk/commit/ed49ed9d9aa594de3018887280856f0b80712c54))


### Bug Fixes

* **agoric-cli:** Portable file path to URL in deploy ([9d2788d](https://github.com/Agoric/agoric-sdk/commit/9d2788d29ca9ef071c657c4de0a4a5536ff53b7d))
* default missed signed blocks should be higher ([cd82ddc](https://github.com/Agoric/agoric-sdk/commit/cd82ddccceae1dbcc45442da8a4fbfc705ce4524))
* **deploy:** enforce `--hostport` URLs use `/private/captp` ([b74755e](https://github.com/Agoric/agoric-sdk/commit/b74755e446514f4834f407974d992994daf9a6a1))



### [0.15.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.15.0...agoric@0.15.1) (2022-05-09)


### Bug Fixes

* **agoric-cli:** Fully validate agoric start portNum ([#5146](https://github.com/Agoric/agoric-sdk/issues/5146)) ([4aaa709](https://github.com/Agoric/agoric-sdk/commit/4aaa7095c005a2423f2e9b20b945800382484053))
* **agoric-cli:** path handling ([1bbde6d](https://github.com/Agoric/agoric-sdk/commit/1bbde6d63cbff35c0b7d6bcf4c0475c387f9efd0))



## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.14.1...agoric@0.15.0) (2022-04-18)


### Features

* **deploy:** add a `lookup(...path)` deploy power ([7a277c3](https://github.com/Agoric/agoric-sdk/commit/7a277c32ccbffe6f0f9e102e44fa807f181629c2))


### Bug Fixes

* **agoric:** `pathResolve` also resolves module specifiers ([d83dc64](https://github.com/Agoric/agoric-sdk/commit/d83dc644d91c50b2ab5bbcb45c547956db9fec3f))
* **agoric-cli:** default voting period of 36h ([4e9dac6](https://github.com/Agoric/agoric-sdk/commit/4e9dac69d830f7db934e2b5aeccc89d648f0a85e))
* **agoric-cli:** honour `local-chain --no-restart` ([f2a0115](https://github.com/Agoric/agoric-sdk/commit/f2a011537d9d44489d6ad705f45b6c392537f985))
* **agoric-cli:** increase max mempool transaction size ([2859856](https://github.com/Agoric/agoric-sdk/commit/2859856189f9eca24ef353fde543db0f6e7221d6))
* **deploy:** make `lookup` compatible with `agoricdev-8` ([3aee329](https://github.com/Agoric/agoric-sdk/commit/3aee3295bba3085f6b03ccb0a97f56b610f8528b))



### [0.14.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.14.0...agoric@0.14.1) (2022-02-24)

**Note:** Version bump only for package agoric





## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.21...agoric@0.14.0) (2022-02-21)


### ⚠ BREAKING CHANGES

* **agoric-cli:** use `transfer` port for `ibc-go.transfer`
* **agoric-cli:** start Docker for `--docker-tag`, not `--sdk`

### Features

* **agoric:** allow non-SDK agoric-cli to install packages in dapps ([5ca243c](https://github.com/Agoric/agoric-sdk/commit/5ca243cc666f577e7b3db90683db8908dec76403))
* **agoric:** automatically build for `agoric cosmos ...` ([0e0e193](https://github.com/Agoric/agoric-sdk/commit/0e0e193e25d06bc1424a8a317ce49f99597b882f))
* **agoric:** honour `agoric start local-solo --no-restart` ([53fd973](https://github.com/Agoric/agoric-sdk/commit/53fd9734575dd579fd22726af8fdbca3989a8b38))
* **agoric:** implement `agoric run script -- script-args...` ([fd3938e](https://github.com/Agoric/agoric-sdk/commit/fd3938e1d918f921be2707259ee6ac56ad557a88))


### Bug Fixes

* **agoric-cli:** use `transfer` port for `ibc-go.transfer` ([dd727ef](https://github.com/Agoric/agoric-sdk/commit/dd727ef788a4ce7238916e0751e5b8060e3a445a))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* **agoric:** don't write command to stdout (it breaks pipelines) ([fa77c71](https://github.com/Agoric/agoric-sdk/commit/fa77c715f4fa9b5025ba4fc03e2cfc3bcce12d07))
* **agoric-cli:** detect `agoric start` early exit ([b4f89ed](https://github.com/Agoric/agoric-sdk/commit/b4f89edc59659fcce6db88b58f7c8d4aa19e3e0f))
* **agoric-cli:** find `agoric start` packages in to directory ([1818093](https://github.com/Agoric/agoric-sdk/commit/18180937f4791e5b72efd28dfaa7b3364e8c682f))
* **agoric-cli:** implement `start --rebuild` and use it ([72f5452](https://github.com/Agoric/agoric-sdk/commit/72f54521f565b395926908811ae60e68f6448b92))
* **agoric-cli:** start Docker for `--docker-tag`, not `--sdk` ([1abde9b](https://github.com/Agoric/agoric-sdk/commit/1abde9b5e32438bf88f29e1280411a5e19a43015))
* **agoric-cli:** update `package.json` to publish correctly ([e670f1a](https://github.com/Agoric/agoric-sdk/commit/e670f1ac4463cf6b6332348e410c4658bfaacf53))
* **agoric-cli:** use `https://github.com` instead of `git://...` ([44e90b0](https://github.com/Agoric/agoric-sdk/commit/44e90b0bac378c77f14c2a7a7f1e93816a4c66c9))
* **anylogger:** coherent DEBUG levels, `$DEBUG` always says more ([5e482fe](https://github.com/Agoric/agoric-sdk/commit/5e482feb3912a0a3dd409d5f028ebe17e6b8ec0b))



### [0.13.21](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.20...agoric@0.13.21) (2021-12-22)


### Features

* **agoric-cli:** `install <TAG>` forces redownload of <TAG> ([c41be9d](https://github.com/Agoric/agoric-sdk/commit/c41be9d2c9d5808d836bdf8d2def290567e91e32))


### Bug Fixes

* **agoric-cli:** make `agoric --no-sdk install` work as well ([e852ee5](https://github.com/Agoric/agoric-sdk/commit/e852ee5aaf87d31a9c5e68b212ffc0c345d2b9d0))
* **cosmos:** don't twiddle the genesis params, set them explicitly ([c9c8d81](https://github.com/Agoric/agoric-sdk/commit/c9c8d81f476a0df7559eae35c0dd323cd26a9d7b))



### [0.13.20](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.19...agoric@0.13.20) (2021-12-02)


### Features

* **agoric-cli:** allow `--no-sdk` to override `--sdk` ([956a934](https://github.com/Agoric/agoric-sdk/commit/956a934f6654f92227eb93bdc50ad25481769c15))
* **agoric-cli:** allow deploy `bundleSource` to have `options` ([52d801b](https://github.com/Agoric/agoric-sdk/commit/52d801b3cf343b8c1d754c204e9dd295214f5ccb))
* **agoric-cli:** enable the `agoric start --debug` option ([4f89a5b](https://github.com/Agoric/agoric-sdk/commit/4f89a5bc2250fb0d5cf64e937d2335b1a3857c7a))
* **agoric-cli:** fill out the default denom metadata ([663c4c9](https://github.com/Agoric/agoric-sdk/commit/663c4c91d689aff6f99db36046672447b97f2ca5))
* **agoric-cli:** use `agoric install beta` to select that SDK ([75c2d90](https://github.com/Agoric/agoric-sdk/commit/75c2d90b311b1d66c43cd1f457069a3aa9933578))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))


### Bug Fixes

* **agoric-cli:** only use `docker -it` when connected to a terminal ([9e18754](https://github.com/Agoric/agoric-sdk/commit/9e1875421b350132b82a5e8b45703c3a47783e45))
* **agoric-cli:** use CXXFLAGS for Node 16 ([dd22da9](https://github.com/Agoric/agoric-sdk/commit/dd22da944592983dee61ee8346f0ae95b1da12a7))
* **deps:** remove explicit `@agoric/babel-standalone` ([4f22453](https://github.com/Agoric/agoric-sdk/commit/4f22453a6f2de1a2c27ae8ad0d11b13116890dab))



### [0.13.19](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.18...agoric@0.13.19) (2021-10-13)

**Note:** Version bump only for package agoric





### [0.13.18](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.17...agoric@0.13.18) (2021-09-23)


### Features

* **solo:** make client objects appear earlier, parallelise chain ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5937389c57e139bc1302fa435edd2e674))



### [0.13.17](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.16...agoric@0.13.17) (2021-09-15)


### Bug Fixes

* **agoric-cli:** don't use `Date.now()` ambiently ([a54a3ae](https://github.com/Agoric/agoric-sdk/commit/a54a3ae4a13ee4ff0b10fe835e51b86b0d5da54d))
* **chain-config:** increase timeouts to prevent RPC EOF errors ([d731195](https://github.com/Agoric/agoric-sdk/commit/d731195b5768017d9c5d158fd9f13da731af3544))
* **deploy:** use `@endo/captp` epochs to mitigate crosstalk ([f2b5ba4](https://github.com/Agoric/agoric-sdk/commit/f2b5ba4bc29ca48e00f32982c713de3ec972e879))



### [0.13.16](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.15...agoric@0.13.16) (2021-08-18)


### Features

* **agoric:** allow querying deploy state without running scripts ([1010ede](https://github.com/Agoric/agoric-sdk/commit/1010ede160059a404494a40f692909b959c70057))


### Bug Fixes

* **cosmic-swingset:** provide 50 RUN to provisioned clients ([ae092a4](https://github.com/Agoric/agoric-sdk/commit/ae092a47ad67163f42cde527066c29884320421a))



### [0.13.15](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.14...agoric@0.13.15) (2021-08-17)


### Features

* **agoric-cli:** Support Node.js ESM deploy scripts ([#3686](https://github.com/Agoric/agoric-sdk/issues/3686)) ([e779500](https://github.com/Agoric/agoric-sdk/commit/e7795004a281876944a3a6270aa647878735f493))


### Bug Fixes

* Remove superfluous -S for env in shebangs ([0b897ab](https://github.com/Agoric/agoric-sdk/commit/0b897ab04941ce1b690459e3386fd2c02d860f45))
* **agoric-cli:** upgrade empty minimum-gas-prices to 0urun ([1b2f6ff](https://github.com/Agoric/agoric-sdk/commit/1b2f6ff4bf16024d3de7c9d424f8032709b7157d))



### [0.13.14](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.13...agoric@0.13.14) (2021-08-16)

**Note:** Version bump only for package agoric





### [0.13.13](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.10...agoric@0.13.13) (2021-08-15)


### Features

* **vbank:** add governance and query methods ([c80912e](https://github.com/Agoric/agoric-sdk/commit/c80912e6110b8d45d6b040ee9f3d9c1addaab804))


### Bug Fixes

* **agoric-cli:** use 'yarn workspaces' instead of hard-coded list ([e5157e6](https://github.com/Agoric/agoric-sdk/commit/e5157e6d12748ad2645aa3d5cdb2ff3d60b9ace1))
* **agoric-cli:** use SDK binaries rather than relying on $PATH ([01da194](https://github.com/Agoric/agoric-sdk/commit/01da194869debb891c223580c4ff02a1845f6aaf))
* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))

### 0.26.10 (2021-07-28)


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.13.12](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.10...agoric@0.13.12) (2021-08-14)


### Features

* **vbank:** add governance and query methods ([c80912e](https://github.com/Agoric/agoric-sdk/commit/c80912e6110b8d45d6b040ee9f3d9c1addaab804))


### Bug Fixes

* **agoric-cli:** use 'yarn workspaces' instead of hard-coded list ([e5157e6](https://github.com/Agoric/agoric-sdk/commit/e5157e6d12748ad2645aa3d5cdb2ff3d60b9ace1))
* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))

### 0.26.10 (2021-07-28)


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.13.11](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.10...agoric@0.13.11) (2021-07-28)


### Bug Fixes

* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))



### [0.13.10](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.9...agoric@0.13.10) (2021-07-01)

**Note:** Version bump only for package agoric





### [0.13.9](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.8...agoric@0.13.9) (2021-06-28)

**Note:** Version bump only for package agoric





### [0.13.8](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.7...agoric@0.13.8) (2021-06-25)

**Note:** Version bump only for package agoric





### [0.13.7](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.6...agoric@0.13.7) (2021-06-24)

**Note:** Version bump only for package agoric





### [0.13.6](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.5...agoric@0.13.6) (2021-06-24)

**Note:** Version bump only for package agoric





### [0.13.5](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.4...agoric@0.13.5) (2021-06-23)

**Note:** Version bump only for package agoric





### [0.13.4](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.3...agoric@0.13.4) (2021-06-16)


### Bug Fixes

* **deployment:** many tweaks to make more robust ([16ce07d](https://github.com/Agoric/agoric-sdk/commit/16ce07d1269e66a016a0326ecc6ca4d42a76f75d))



### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.2...agoric@0.13.3) (2021-06-15)


### Features

* for Keplr support (and presumably other wallets) we need CORS ([7986548](https://github.com/Agoric/agoric-sdk/commit/7986548c528e282c129175f0292d3db6b00a9468))
* new access-token package for encapsulation from swing-store ([aa52d2e](https://github.com/Agoric/agoric-sdk/commit/aa52d2ea54ec679889db9abdb8cdd6639824f50e))
* remove .jsonlines hack from simple swing store ([ef87997](https://github.com/Agoric/agoric-sdk/commit/ef87997a1519b18f23656b57bf38055fea203f9a))
* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric-sdk/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))
* remove genesis bootstrap config; use just add-genesis-account ([fdc1255](https://github.com/Agoric/agoric-sdk/commit/fdc1255d66c702e8970ecf795be191dcf2291c39))



## [0.13.2](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.1...agoric@0.13.2) (2021-05-10)

**Note:** Version bump only for package agoric





## [0.13.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.13.0...agoric@0.13.1) (2021-05-05)

**Note:** Version bump only for package agoric





# [0.13.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.13...agoric@0.13.0) (2021-05-05)


### Bug Fixes

* **agoric-cli:** hardcode vpurse genesis state with faucet address ([04b004c](https://github.com/Agoric/agoric-sdk/commit/04b004cacde1968bbaf9476111ec19e0403794f2))
* **agoric-cli:** increase integration-test timeout ([942c2a2](https://github.com/Agoric/agoric-sdk/commit/942c2a29b9805fb095eb4afbf99290246ad16379)), closes [#1343](https://github.com/Agoric/agoric-sdk/issues/1343)
* **agoric-cli:** use new solo package ([0780be8](https://github.com/Agoric/agoric-sdk/commit/0780be829d1a124ac3429ee57ef617bfd4f1d9cc))


### Features

* **agoric:** set-defaults --bootstrap-address and friends ([f37adcf](https://github.com/Agoric/agoric-sdk/commit/f37adcf88ad9f59e3ff203db63810b15ed98ba3c))
* have the bank use normal purses when not on chain ([90ab888](https://github.com/Agoric/agoric-sdk/commit/90ab888c5cdc71a2322ca05ad813c6411c876a74))





## [0.12.13](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.12...agoric@0.12.13) (2021-04-22)


### Bug Fixes

* rename cosmos-level tokens uagstake/uag to ubld/urun ([0557983](https://github.com/Agoric/agoric-sdk/commit/0557983210571c9c2ba801d68644d71641a3f790))
* reorganise deployment ([5e7f537](https://github.com/Agoric/agoric-sdk/commit/5e7f537021f747327673b6f5819324eb048a3d96))





## [0.12.12](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.11...agoric@0.12.12) (2021-04-18)

**Note:** Version bump only for package agoric





## [0.12.11](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.10...agoric@0.12.11) (2021-04-16)

**Note:** Version bump only for package agoric





## [0.12.10](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.9...agoric@0.12.10) (2021-04-14)


### Bug Fixes

* small tweaks needed for agorictest-8 ([b8d2ec0](https://github.com/Agoric/agoric-sdk/commit/b8d2ec008b59f0de68602a4338ceafa6a3a92e2d))





## [0.12.9](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.8...agoric@0.12.9) (2021-04-13)

**Note:** Version bump only for package agoric





## [0.12.8](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.7...agoric@0.12.8) (2021-04-07)

**Note:** Version bump only for package agoric





## [0.12.7](https://github.com/Agoric/agoric-sdk/compare/agoric@0.12.0...agoric@0.12.7) (2021-04-06)


### Bug Fixes

* bump max validators to 150 ([4abd700](https://github.com/Agoric/agoric-sdk/commit/4abd7008139b3d5bb1de3add5466a16953a156d9))





# [0.12.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.11.3...agoric@0.12.0) (2021-03-24)


### Features

* introduce separate roles for deployment placements ([a395571](https://github.com/Agoric/agoric-sdk/commit/a395571e7f8a06a4a5b7561bbcbfdcf3259454fa))





## [0.11.3](https://github.com/Agoric/agoric-sdk/compare/agoric@0.11.2...agoric@0.11.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **agoric-cli:** remove package links before running yarn install ([9573d44](https://github.com/Agoric/agoric-sdk/commit/9573d4484143276c8bb5341c0984bc4bfe37f77c))
* use os.homedir() to properly cope with Windows ([fcf93ad](https://github.com/Agoric/agoric-sdk/commit/fcf93ad6eb137d9a055995d1b369a0d23c925aff))





## [0.11.2](https://github.com/Agoric/agoric-sdk/compare/agoric@0.11.1...agoric@0.11.2) (2021-02-22)


### Bug Fixes

* **agoric-cli:** Allow path.sep to be \ when we use it in a RegExp ([c0ed576](https://github.com/Agoric/agoric-sdk/commit/c0ed5769d292a7842e5047a002e4410e91735045))
* **agoric-cli:** Don't exit agoric open until the browser loads ([a28548b](https://github.com/Agoric/agoric-sdk/commit/a28548b50912f3b0303594bbd94bd945d46a6caf))





## [0.11.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.11.0...agoric@0.11.1) (2021-02-16)


### Bug Fixes

* adapt to new cosmos-sdk ([3b12c9e](https://github.com/Agoric/agoric-sdk/commit/3b12c9e2ef33117206189ecd085f51523c7d0d87))
* add more metrics ([e3223fb](https://github.com/Agoric/agoric-sdk/commit/e3223fb25a672e002128e9a4d13d3a0da62cb872))
* don't hang if our provides aren't needed ([ebfc6a8](https://github.com/Agoric/agoric-sdk/commit/ebfc6a8cafb0f0051ee504cc8caad4c9a3cc66a6))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* simple fixes for chain parameters ([a90ae2f](https://github.com/Agoric/agoric-sdk/commit/a90ae2fba72e2038be4987d390f9dfb9cb163897))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.10.1...agoric@0.11.0) (2020-12-10)


### Bug Fixes

* don't reset x/capability state on new chains; it's sensitive ([6ba739e](https://github.com/Agoric/agoric-sdk/commit/6ba739e01abc01f32ef9449f78e3bb11ab29b7ff))
* **chain-params:** 5s blocks to account for global round-trip time ([6fac324](https://github.com/Agoric/agoric-sdk/commit/6fac324dc619ec452ffd33f40f24ef6496f732f3))
* back off retrying to provision to prevent excessive load ([422b4da](https://github.com/Agoric/agoric-sdk/commit/422b4da4bd4caee0fe0aedb2e615e02180e28c37))
* build wallet URL with a trailing slash ([f76ad22](https://github.com/Agoric/agoric-sdk/commit/f76ad22a7fffda81425651731f47977ab0fcbd8c))
* clear up all the paths through `agoric start` ([1b89571](https://github.com/Agoric/agoric-sdk/commit/1b89571734e9c7fd4748b1cf7b6d5a985f045ef3))
* localhost IBC client wishful thinking ([0653c03](https://github.com/Agoric/agoric-sdk/commit/0653c03faa51494e49de0458a3d586b04fcc09d2))
* minor tweaks for dapp-oracle ([b8169c1](https://github.com/Agoric/agoric-sdk/commit/b8169c1f39bc0c0d7c07099df2ac23ee7df05733))
* more support for hacktheorb ([b58e5cd](https://github.com/Agoric/agoric-sdk/commit/b58e5cd1c8b16467565967edbe4140a0749274d7))
* report when there is a spawn error from the Agoric cli ([9073526](https://github.com/Agoric/agoric-sdk/commit/9073526e45c0df34820edad2de52220e634f76fa))


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* implement agoric --docker-tag=TAG ([afac575](https://github.com/Agoric/agoric-sdk/commit/afac575fbcfcce0e91b5f0b108eca46c77197f9a))





## [0.10.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.10.1-dev.0...agoric@0.10.1) (2020-11-07)


### Bug Fixes

* be robust for local chain to start ([6cd7868](https://github.com/Agoric/agoric-sdk/commit/6cd78684ddaeb5064578a2fc5d305b7d1c57682c))
* get local-chain and local-solo working without SDK ([4dbe9e2](https://github.com/Agoric/agoric-sdk/commit/4dbe9e2ed450743db465b4e31a58ed51bc064079))
* prepare for --import-from=node0 ([7300c3a](https://github.com/Agoric/agoric-sdk/commit/7300c3a4cde46963802f10ae8d0eb3d4134ecdeb))
* properly implement block cadence ([b2d9446](https://github.com/Agoric/agoric-sdk/commit/b2d9446219c722a7b68e8e1835034aa7e4b8965c))
* properly return .pluginRoot when deploying plugins ([2ed6a96](https://github.com/Agoric/agoric-sdk/commit/2ed6a966d9b0a1e4183b675c7869fb7e24823639))





## [0.10.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.10.0...agoric@0.10.1-dev.0) (2020-10-19)


### Bug Fixes

* **agoric-cli:** correct missing installation of ui subdirectory ([4b073c2](https://github.com/Agoric/agoric-sdk/commit/4b073c2aa1b9d0a7a43028978775bd2273b359c8))





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.9.1-dev.2...agoric@0.10.0) (2020-10-11)


### Bug Fixes

* be more explicit when provision-one doesn't return JSON ([0f0df62](https://github.com/Agoric/agoric-sdk/commit/0f0df6282a1ae6586f0d19b6be89ce8e05c14e19))
* remove obsolete `--home-client` ([f97171a](https://github.com/Agoric/agoric-sdk/commit/f97171a001842e2777cf4e437d1ec8cf086ca1b9))
* upgrade to our --keyring-dir PR (temporarily) ([38e170d](https://github.com/Agoric/agoric-sdk/commit/38e170d42c2af74a565749d040f365905cd0d3fc))
* use `gentx --client-home=...` to initialise genesis validators ([54c5a2f](https://github.com/Agoric/agoric-sdk/commit/54c5a2f2e23f7f9df254b35f2657e449d9fb847a))
* use gentx --home-client flag ([5595b41](https://github.com/Agoric/agoric-sdk/commit/5595b410377116b7a2d20d39a46ec87d2b5ea01f))
* use gentx --home-server instead of --home-client ([ed634bf](https://github.com/Agoric/agoric-sdk/commit/ed634bfbe976ca48a203b4f44b3eb0d62e1edd82))


### Features

* allow deploy scripts to see the deployment host and port ([7ab7108](https://github.com/Agoric/agoric-sdk/commit/7ab71084c683b06a3c5d840ec618599d4366a905))
* **agoric-cli:** add --no-browser option to open ([fb8607d](https://github.com/Agoric/agoric-sdk/commit/fb8607d7325de5742833af5e24aaf050bf65d67e))





## [0.9.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/agoric@0.9.1-dev.1...agoric@0.9.1-dev.2) (2020-09-18)

**Note:** Version bump only for package agoric





## [0.9.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.9.1-dev.0...agoric@0.9.1-dev.1) (2020-09-18)

**Note:** Version bump only for package agoric





## [0.9.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.9.0...agoric@0.9.1-dev.0) (2020-09-18)

**Note:** Version bump only for package agoric





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.8.0...agoric@0.9.0) (2020-09-16)


### Bug Fixes

* change webkey -> accessToken and polish usage ([0362abe](https://github.com/Agoric/agoric-sdk/commit/0362abe1f6aa1322d50826e77c052881d940f72e))
* excise half-fast Vagrant support ([9bbab1c](https://github.com/Agoric/agoric-sdk/commit/9bbab1c204a0c44bad2e51bcd0f7d08ad02b5a5b))
* have accessToken use a database in ~/.agoric, not network ([bc9cf83](https://github.com/Agoric/agoric-sdk/commit/bc9cf83273b01b76006d69e4ea47b9efbee358dd))
* implement robust plugin persistence model ([2de552e](https://github.com/Agoric/agoric-sdk/commit/2de552ed4a4b25e5fcc641ff5e80afd5af1d167d))
* make generateAccessToken URL-safe by default ([722f811](https://github.com/Agoric/agoric-sdk/commit/722f811001a16d62e69af76de8a889e6eac4a48f))
* minor updates from PR review ([aa37b4f](https://github.com/Agoric/agoric-sdk/commit/aa37b4f4439faa846ced5653c7963798f44e872e))
* SECURITY: use a private on-disk webkey for trusted auth ([f769d95](https://github.com/Agoric/agoric-sdk/commit/f769d95031f8e0b2003d31f0554dce17d6440f1b))


### Features

* agoric deploy --allow-unsafe-plugins ([d2a545e](https://github.com/Agoric/agoric-sdk/commit/d2a545ed73b4403f9d85d5ff89637e2470ecdb29))
* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric-sdk/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.7.0...agoric@0.8.0) (2020-08-31)


### Bug Fixes

* clear up and solve the races around ag-solo initialisation ([f6482ac](https://github.com/Agoric/agoric-sdk/commit/f6482ac7f5f01cc4c7626610e81c191fd939c69a))
* don't reinstall the wallet unless it's the first time ([8637331](https://github.com/Agoric/agoric-sdk/commit/8637331e490859a8f7a318a95813de04872a964a))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* explicitly use utf-8 ([5971544](https://github.com/Agoric/agoric-sdk/commit/59715442413ab69e874d3725eba23b82a777982f))
* force `--pruning=nothing` until we upgrade to Stargate ([9a3d54b](https://github.com/Agoric/agoric-sdk/commit/9a3d54bac54a92babe6fa1610c2a8c88f85a1e6a))
* get fake-chain working again, also with async commit ([8b30196](https://github.com/Agoric/agoric-sdk/commit/8b30196f54f6a608c4c0e3e4587e3500e4e67ffd))
* open-code the `yarn link` operation for silence and speed ([3b2671e](https://github.com/Agoric/agoric-sdk/commit/3b2671eea59c52a16298dea2af2a6ba5e7ec42c0))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* remove dynamic role from sim-chain ([1a3dd57](https://github.com/Agoric/agoric-sdk/commit/1a3dd57415c452f9527d9ccfe2c2f81429fd3e23))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* since we don't simulate, make sure our gas estimate is good ([a0a2df5](https://github.com/Agoric/agoric-sdk/commit/a0a2df5e614bc64a2ceddb4f988ba52dc611ffad))
* stop depending on config.toml contents in set-defaults ([0dca9ff](https://github.com/Agoric/agoric-sdk/commit/0dca9ffa3cf61bf46d633497a538b8b58bee08ca))
* upgrade Docker images to Debian buster ([1016cc5](https://github.com/Agoric/agoric-sdk/commit/1016cc5fa27624d2265398d8900f2d4847c9864f))
* **agoric-cli:** only create yarn links in _agstate/yarn-links ([bb80fb2](https://github.com/Agoric/agoric-sdk/commit/bb80fb255da8dee9347b674d2661f37030d19860))
* **agoric-cli:** yarn link after yarn install ([aea7f93](https://github.com/Agoric/agoric-sdk/commit/aea7f931e710affe08beaabd039ef69c41e51bf1))


### Features

* **agoric-cli:** quieter deployment progress ([11b60c1](https://github.com/Agoric/agoric-sdk/commit/11b60c10bdaec1ecccebb42f88f93d22cdcdbe8c))
* defer the wallet UI until the start process ([18ee099](https://github.com/Agoric/agoric-sdk/commit/18ee0990836280478917265bbab966dee15e3dfe))
* **agoric:** make `agoric --sdk install` use `yarn link` ([3a53185](https://github.com/Agoric/agoric-sdk/commit/3a53185510b307bdc048255f27f7493999693886))
* **agoric-cli:** update package.jsons during install ([a4ff356](https://github.com/Agoric/agoric-sdk/commit/a4ff356b42a52b47bc8ab7c4dba02fb5ade30f4b))
* **cosmic-swingset:** send powerFlags from tx provision-one ([5b68af5](https://github.com/Agoric/agoric-sdk/commit/5b68af594b5c8ea0732eb70aeae8ed5139b7b6cb))
* add `agoric set-defaults` ([98e5fe9](https://github.com/Agoric/agoric-sdk/commit/98e5fe910cbf895d1f6b65d257b8530c1cb933f4))
* allow the specification of `--persistent-peers` ([2a86410](https://github.com/Agoric/agoric-sdk/commit/2a86410d3f439918009648ec9458f6cfd751a38b))
* reintroduce anylogger as the console endowment ([98cd5cd](https://github.com/Agoric/agoric-sdk/commit/98cd5cd5c59e9121169bb8104b70c63ccc7f5f01))
* separate generation/writing of config.toml from genesis.json ([eabe493](https://github.com/Agoric/agoric-sdk/commit/eabe4939893fac124719cf5bdc68761f95cf09e3))





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.6.2...agoric@0.7.0) (2020-06-30)


### Bug Fixes

* adjust agoric-cli genesis and config.toml params ([41614a6](https://github.com/Agoric/agoric-sdk/commit/41614a64cb0943b03b9f805c2aca82ae25acd880))
* make CHAIN_PORT configurable ([a3e76cb](https://github.com/Agoric/agoric-sdk/commit/a3e76cbd076979eeaca8bd0f901a3a388d610b19))
* tweak the config.toml for local-chain ([a1e815b](https://github.com/Agoric/agoric-sdk/commit/a1e815bd7632574a2e3012651974182f536a9288))


### Features

* add `agoric start local-solo` ([15165b4](https://github.com/Agoric/agoric-sdk/commit/15165b4d069b966e2dae35a38ef8d1b3518802e7))
* add agoric start local-chain ([b2238aa](https://github.com/Agoric/agoric-sdk/commit/b2238aab3121e373ff31c2ef1d04a9597ac80bec))
* implement `agoric cosmos ...` ([0587c6a](https://github.com/Agoric/agoric-sdk/commit/0587c6aec539cd6c7adb9fab4b3edddadf56c870))
* set the parameters for starting with an exported genesis ([9b62335](https://github.com/Agoric/agoric-sdk/commit/9b623352b9740929f0ce6bf41d0f4a6684c0538e))





## [0.6.2](https://github.com/Agoric/agoric-sdk/compare/agoric@0.6.1...agoric@0.6.2) (2020-05-17)


### Bug Fixes

* remove many build steps ([6c7d3bb](https://github.com/Agoric/agoric-sdk/commit/6c7d3bb0c70277c22f8eda40525d7240141a5434))





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/agoric@0.6.0...agoric@0.6.1) (2020-05-10)

**Note:** Version bump only for package agoric





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.5.0...agoric@0.6.0) (2020-05-04)


### Bug Fixes

* change default dapp to dapp-encouragement ([#939](https://github.com/Agoric/agoric-sdk/issues/939)) ([0a2c97a](https://github.com/Agoric/agoric-sdk/commit/0a2c97ae71059a0af5da55a6a2bacbaad10cddc5))
* don't use the (nonexistent) _agstate/agoric-wallet anymore ([0b739a6](https://github.com/Agoric/agoric-sdk/commit/0b739a64991e1319ac96d12bd76c9a36d408625b))
* get working with latest relayer ([3d39496](https://github.com/Agoric/agoric-sdk/commit/3d394963ce16556a639bf6f4118c5e91377b6bcc))
* implement nestedEvaluate where it was missing ([8f7d17f](https://github.com/Agoric/agoric-sdk/commit/8f7d17fe6a0c452df8c701c708d73cc79144071c))
* remove unnecessary files ([a13e937](https://github.com/Agoric/agoric-sdk/commit/a13e9375bccd6ff03e814745ca489fead21956f8))


### Features

* add Presence, getInterfaceOf, deepCopyData to marshal ([aac1899](https://github.com/Agoric/agoric-sdk/commit/aac1899b6cefc4241af04911a92ffc50fbac3429))
* symlink wallet from agoric-sdk or NPM for all ag-solos ([fdade37](https://github.com/Agoric/agoric-sdk/commit/fdade3773ae270d1ecbcf79f05d8b58c580e2350))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.5.0-alpha.0...agoric@0.5.0) (2020-04-13)

**Note:** Version bump only for package agoric





# [0.5.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.4.5...agoric@0.5.0-alpha.0) (2020-04-12)


### Features

* introduce a wrapper around ag-solo to start in inspect mode ([93e4887](https://github.com/Agoric/agoric-sdk/commit/93e488790da490d997c7d707b1340fc7be5b33b7))
* retry the CapTP Websocket if it failed ([be4bd4e](https://github.com/Agoric/agoric-sdk/commit/be4bd4e39b0e86279cd2e92380b6ee19270abd5e))





## [0.4.5](https://github.com/Agoric/agoric-sdk/compare/agoric@0.4.5-alpha.0...agoric@0.4.5) (2020-04-02)

**Note:** Version bump only for package agoric





## [0.4.5-alpha.0](https://github.com/Agoric/agoric-sdk/compare/agoric@0.4.3...agoric@0.4.5-alpha.0) (2020-04-02)


### Bug Fixes

* run "yarn install" in the ui directory ([62bfe8d](https://github.com/Agoric/agoric-sdk/commit/62bfe8d4e634b35d7f830f6aef1b3f3a7134cc06))
* use commander for better help output ([d9e8349](https://github.com/Agoric/agoric-sdk/commit/d9e83493a4a6a1e2312bc3c300d83f604c70b755))





# 0.4.0 (2020-03-26)


### Bug Fixes

* accomodate modified offer ids ([38d367d](https://github.com/Agoric/agoric/commit/38d367dedcba143524b4668573f11b757233401b))
* address PR comments ([b9ed6b5](https://github.com/Agoric/agoric/commit/b9ed6b5a510433af968ba233d4e943b939defa1b))
* allow disabling of logging by setting DEBUG='' ([131c1c6](https://github.com/Agoric/agoric/commit/131c1c64f646f2fa3adece698d1da240dc969f03))
* fix discrepencies revealed by the agoric-cli test ([422b019](https://github.com/Agoric/agoric/commit/422b01946481f549e15c8d36270146e5729855f7))
* make the changes needed to cancel pending offers ([b4caa9e](https://github.com/Agoric/agoric/commit/b4caa9ed26489ad39651b4717d09bd9f84557480))
* make the fake-chain better ([b4e5b02](https://github.com/Agoric/agoric/commit/b4e5b02ca8fc5b6df925391f3b0a2d6faecbdb73))
* polish the wallet and dApp UIs ([292291f](https://github.com/Agoric/agoric/commit/292291f234646cdb0685dbf63cf0a75a2491018c))
* properly kill off child processes on SIGHUP ([93b71cd](https://github.com/Agoric/agoric/commit/93b71cd6b894cbd37dab39b6946ed8e6d47ab2a6))
* reenable package.json substitutions ([10bece7](https://github.com/Agoric/agoric/commit/10bece74cdb9608f069d7f2b4c3534368ce2ea5d))
* regression in `agoric start --reset` ([206ecd0](https://github.com/Agoric/agoric/commit/206ecd088f1bc2bb33c15c3f8c134fe2d8b4f39e))
* rename .agwallet and .agservers into _agstate ([a82d44f](https://github.com/Agoric/agoric/commit/a82d44fe370d32f8383e4558c7b03f3d13a2f163))
* revert usage of SIGHUP to SIGINT ([2948400](https://github.com/Agoric/agoric/commit/294840026ef81bd19407c91bb92b68e4b5e13198))
* run mkdir with recursive option to prevent exceptions ([a01fa04](https://github.com/Agoric/agoric/commit/a01fa04c2955e0f00f3bc29aa3862c2440a23c8e)), closes [#662](https://github.com/Agoric/agoric/issues/662)
* silence the builtin modules warning in agoric-cli deploy ([9043516](https://github.com/Agoric/agoric/commit/904351655f8acedd5720e5f0cc3ace83b5cf6192))
* **ag-solo:** reenable the ag-solo bundle command ([6126774](https://github.com/Agoric/agoric/commit/6126774fd3f102cf575a430dfddb3a0c6adcf0f5)), closes [#606](https://github.com/Agoric/agoric/issues/606)
* **agoric-cli:** changes to make `agoric --sdk` basically work again ([#459](https://github.com/Agoric/agoric/issues/459)) ([1dc046a](https://github.com/Agoric/agoric/commit/1dc046a02d5e616d33f48954e307692b43008442))
* **agoric-cli:** install the SDK symlink if requested ([f7fd68f](https://github.com/Agoric/agoric/commit/f7fd68f8aa301a14a110f403c1970d0bd1c1a51f))
* **captp:** use new @endo/eventual-send interface ([d1201a1](https://github.com/Agoric/agoric/commit/d1201a1a1de324ae5e21736057f3bb03f97d2bc7))
* **cli:** improve install, template, fake-chain ([0890171](https://github.com/Agoric/agoric/commit/08901713bd3db18b52ed1793efca21b459e3713e))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/agoric/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **init:** handle symbolic links and ignored files properly ([2d6b876](https://github.com/Agoric/agoric/commit/2d6b87604d6a1bc97028a89f1f3b8c59a7f3a991))
* **security:** update serialize-javascript dependency ([#340](https://github.com/Agoric/agoric/issues/340)) ([970edd3](https://github.com/Agoric/agoric/commit/970edd31a8caa36235fad860b3b0ee8995042d7a))
* **start:** eliminate default fake delay, and add --delay option ([28ce729](https://github.com/Agoric/agoric/commit/28ce7298370ec81ae37dcc15db3b162974eea39a)), closes [#572](https://github.com/Agoric/agoric/issues/572)
* **start:** parse `--pull` properly ([a5ac2c9](https://github.com/Agoric/agoric/commit/a5ac2c956c47e94ef79be53b683d48e8146a7b05))
* **SwingSet:** passing all tests ([341718b](https://github.com/Agoric/agoric/commit/341718be335e16b58aa5e648b51a731ea065c1d6))


### Features

* add anylogger support ([4af822d](https://github.com/Agoric/agoric/commit/4af822d0433ac2b0d0fd53298e8dc9c7347a3e11))
* default to silent unles `DEBUG=agoric` ([2cf5cd8](https://github.com/Agoric/agoric/commit/2cf5cd8ec66d1ee38f351be8b2e3c808afd554a9))
* implement wallet bridge separately from wallet user ([41c1278](https://github.com/Agoric/agoric/commit/41c12789c1fd230fa8442db9e3979d0c7372025a))
* **init:** use --dapp-template (default @agoric/dapp-simple-exchange) ([3bdf8ff](https://github.com/Agoric/agoric/commit/3bdf8ff4476279fbb158953ec115939794d4488e))
* **link-cli:** install the Agoric CLI locally ([5e38c5a](https://github.com/Agoric/agoric/commit/5e38c5a333a09ceb7429b2a843d7e66ebb56dfc6))
* **start:** implement `agoric start testnet` ([cbfb306](https://github.com/Agoric/agoric/commit/cbfb30604b8c2781e564bb250dd58d08c7d57b3c))
