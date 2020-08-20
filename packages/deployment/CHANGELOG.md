# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deployment@1.20.0...@agoric/deployment@1.21.0) (2020-08-20)


### Bug Fixes

* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* remove controller ag-solo, as it is obsolete ([c698e4c](https://github.com/Agoric/agoric-sdk/commit/c698e4c8fc71f3a334bf546dce8d1994c2a68adf))
* remove more controller references ([c9af5a1](https://github.com/Agoric/agoric-sdk/commit/c9af5a11ac5ffa1afcbc47c6399f35945055e3b2))
* use `agoric set-default` instead of set-json.js ([7e1f612](https://github.com/Agoric/agoric-sdk/commit/7e1f612ff3f78c9e614cc63c9aa98e0d1f1a2dd5))


### Features

* add ansible plays for shuffling configs around ([d153aa2](https://github.com/Agoric/agoric-sdk/commit/d153aa24c43fef84614653fab401ce98d20b8c02))
* add export-genesis playbook ([cba5ae0](https://github.com/Agoric/agoric-sdk/commit/cba5ae0e5cf82b61c8d95f5be57a7d9edb94e5b1))





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
