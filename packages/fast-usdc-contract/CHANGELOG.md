# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u20.0 (2025-04-16)


### ⚠ BREAKING CHANGES

* makeChainAddress  -> coerceCosmosAddress

### Features

* `.depositForBurn` in `Settler` `.forward` path ([7187054](https://github.com/Agoric/agoric-sdk/commit/7187054b7bc4c3ffeb6995488f961dac6c288519))
* `ChainHub`, `withOrchestration` accept `opts.chainInfoValueShape` ([d2dc1f8](https://github.com/Agoric/agoric-sdk/commit/d2dc1f8ef8b0af78c60b1bded8fda30e2929b57c)), closes [#10434](https://github.com/Agoric/agoric-sdk/issues/10434) [#7525](https://github.com/Agoric/agoric-sdk/issues/7525)
* `FeeConfig` optionally takes `relay: Amount<nat>` ([7162eb1](https://github.com/Agoric/agoric-sdk/commit/7162eb15fdc1312cfa32d1a3117291c0845e6b55))
* `makeSupportsCttp` in `utils/cttp.ts` ([5ae3259](https://github.com/Agoric/agoric-sdk/commit/5ae32599e2f081427d0c0818b83ddc61c3a1df29))
* `Settler` uses `bank/MsgSend` when forwarding to current chain ([2250e61](https://github.com/Agoric/agoric-sdk/commit/2250e61649dba73820f799ff33309445b7dfb885))
* `withChainCapabilities` includes `cctpDestinationDomain` ([618d0be](https://github.com/Agoric/agoric-sdk/commit/618d0be136316fbd95be8e6205da1989edb48e60))
* advancer support for CCTP ([55d68aa](https://github.com/Agoric/agoric-sdk/commit/55d68aa925af571709fe49884d887b4f79b914a2))
* CAIP-10 destinations ([3c16d47](https://github.com/Agoric/agoric-sdk/commit/3c16d474a9d1e4ea3321046287dcce58653dcde5))
* FastUSDC registers cctp chains ([6e269f4](https://github.com/Agoric/agoric-sdk/commit/6e269f4efd1ff2d53609346e375e3215d5392eac))
* getChainInfoByChainId ([8ce4f78](https://github.com/Agoric/agoric-sdk/commit/8ce4f78793d2daca8b7ef4e14f605b9eaa94ba4d))
* makeChainAddress  -> coerceCosmosAddress ([7df1a4a](https://github.com/Agoric/agoric-sdk/commit/7df1a4ab679186832411df65379e9a515b12814c))
* store `NobleICA` in `NOBLE_ICA_BAGGAGE_KEY` ([45c9401](https://github.com/Agoric/agoric-sdk/commit/45c940124e4d27d054d80900e8011d65ce97af70))
* upgrade FUSDC chainHub ([6414c7f](https://github.com/Agoric/agoric-sdk/commit/6414c7fb46c5060cf090e5685b9b477684ad0daf))


### Bug Fixes

* `icaEnabled: false` for agoric ([b3b0102](https://github.com/Agoric/agoric-sdk/commit/b3b01027f558b81824629bdf7280b1a68443603a))
* `icaEnabled` codegen ([dd23748](https://github.com/Agoric/agoric-sdk/commit/dd237485d934ffd2a66af99f54f6f914e4d92fa5))
* advancer vow handling ([6306fa4](https://github.com/Agoric/agoric-sdk/commit/6306fa4c8afe6f699eac407c7f576760a8cbc422))
* **types:** discriminate `ChainInfo` union on `namespace` ([0f9f3fc](https://github.com/Agoric/agoric-sdk/commit/0f9f3fcbdd9da33b2eca1c02a2f7189c5405e8ff))
