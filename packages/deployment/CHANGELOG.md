# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
