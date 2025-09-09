# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u22.0 (2025-09-08)

### ⚠ BREAKING CHANGES

* makeChainAddress  -> coerceCosmosAddress

### Features

* `.depositForBurn` in `Settler` `.forward` path ([7187054](https://github.com/Agoric/agoric-sdk/commit/7187054b7bc4c3ffeb6995488f961dac6c288519))
* `ChainHub`, `withOrchestration` accept `opts.chainInfoValueShape` ([d2dc1f8](https://github.com/Agoric/agoric-sdk/commit/d2dc1f8ef8b0af78c60b1bded8fda30e2929b57c)), closes [#10434](https://github.com/Agoric/agoric-sdk/issues/10434) [#7525](https://github.com/Agoric/agoric-sdk/issues/7525)
* `FeeConfig` optionally takes `relay: Amount<nat>` ([7162eb1](https://github.com/Agoric/agoric-sdk/commit/7162eb15fdc1312cfa32d1a3117291c0845e6b55))
* `insertIntoSortedArray` ([731771b](https://github.com/Agoric/agoric-sdk/commit/731771b6fbbe81cf62130991473cd0fd8c4c01cf))
* `makeSupportsCttp` in `utils/cttp.ts` ([5ae3259](https://github.com/Agoric/agoric-sdk/commit/5ae32599e2f081427d0c0818b83ddc61c3a1df29))
* `pendingSettleTxs` schema supports batch matching ([62a617b](https://github.com/Agoric/agoric-sdk/commit/62a617b1ac788a531cc6fec812e6bc1c6e00a50c))
* `Settler` uses `bank/MsgSend` when forwarding to current chain ([2250e61](https://github.com/Agoric/agoric-sdk/commit/2250e61649dba73820f799ff33309445b7dfb885))
* `withChainCapabilities` includes `cctpDestinationDomain` ([618d0be](https://github.com/Agoric/agoric-sdk/commit/618d0be136316fbd95be8e6205da1989edb48e60))
* add axelar gmp core-eval and bootstrap tests ([e0d7ef8](https://github.com/Agoric/agoric-sdk/commit/e0d7ef82f1fc4ea42c6fc8ae7faaf5c74de8e36e))
* add settlement-matching utilities for USDC transactions ([7639a10](https://github.com/Agoric/agoric-sdk/commit/7639a1058a92d0c3eddb9a0940c842f2b8d55b1a))
* advancer support for CCTP ([55d68aa](https://github.com/Agoric/agoric-sdk/commit/55d68aa925af571709fe49884d887b4f79b914a2))
* attempt once per failure ([ed08daf](https://github.com/Agoric/agoric-sdk/commit/ed08daf9b345570ed84462c31a430a98ea3c3966))
* CAIP-10 destinations ([3c16d47](https://github.com/Agoric/agoric-sdk/commit/3c16d474a9d1e4ea3321046287dcce58653dcde5))
* ChainHub helper logging optional ([8e54a72](https://github.com/Agoric/agoric-sdk/commit/8e54a7270a11ad7cb4f064a90f2f41a1da000d5f))
* FastUSDC registers cctp chains ([6e269f4](https://github.com/Agoric/agoric-sdk/commit/6e269f4efd1ff2d53609346e375e3215d5392eac))
* FORWARD_SKIPPED state ([62a1c7b](https://github.com/Agoric/agoric-sdk/commit/62a1c7b10b24839b63e657f18baaf581e62a9cc1))
* getChainInfoByChainId ([8ce4f78](https://github.com/Agoric/agoric-sdk/commit/8ce4f78793d2daca8b7ef4e14f605b9eaa94ba4d))
* makeChainAddress  -> coerceCosmosAddress ([7df1a4a](https://github.com/Agoric/agoric-sdk/commit/7df1a4ab679186832411df65379e9a515b12814c))
* match a mint to multiple txs ([46d09a7](https://github.com/Agoric/agoric-sdk/commit/46d09a7f249d502b77454a87491b0b2044e2dce6))
* minUusdc option for remediateMintedEarly ([b4e3279](https://github.com/Agoric/agoric-sdk/commit/b4e327916431e75ef78e9bbfbb676edc2f1d4028))
* remediate undetected batches ([a946143](https://github.com/Agoric/agoric-sdk/commit/a94614391b69da3fb67f6b6684f5f50939c759f4))
* retry ForwardFailed ([a6c03e0](https://github.com/Agoric/agoric-sdk/commit/a6c03e080238219422716191572992897a51d0e6))
* RouteHealth ([706723e](https://github.com/Agoric/agoric-sdk/commit/706723e95f341e52993af9deafdcd28bbad2a021))
* sendFromSettlementAccount ([edc01c5](https://github.com/Agoric/agoric-sdk/commit/edc01c5bcdd1917ece49bf11ad447339961650dc))
* setupOrchestrationTest ([f082099](https://github.com/Agoric/agoric-sdk/commit/f08209916d9fe97f8df5a333e3e12ddf695d2421))
* store `NobleICA` in `NOBLE_ICA_BAGGAGE_KEY` ([45c9401](https://github.com/Agoric/agoric-sdk/commit/45c940124e4d27d054d80900e8011d65ce97af70))
* upgrade FUSDC chainHub ([6414c7f](https://github.com/Agoric/agoric-sdk/commit/6414c7fb46c5060cf090e5685b9b477684ad0daf))

### Bug Fixes

* `icaEnabled: false` for agoric ([b3b0102](https://github.com/Agoric/agoric-sdk/commit/b3b01027f558b81824629bdf7280b1a68443603a))
* `icaEnabled` codegen ([dd23748](https://github.com/Agoric/agoric-sdk/commit/dd237485d934ffd2a66af99f54f6f914e4d92fa5))
* `Observed` is not a `PendingTxStatus` ([c82e75c](https://github.com/Agoric/agoric-sdk/commit/c82e75c0159e9e074d81f354f08c43089f7a1557))
* advancer vow handling ([6306fa4](https://github.com/Agoric/agoric-sdk/commit/6306fa4c8afe6f699eac407c7f576760a8cbc422))
* **fast-usdc:** forward timeout longer (10m) than advance timeout ([a20552c](https://github.com/Agoric/agoric-sdk/commit/a20552cbcadb665b10fe307914f994c3ef3c54c2))
* repay liquidity pool on depositForBurn failure ([2be005b](https://github.com/Agoric/agoric-sdk/commit/2be005b0eaa3de364f0550232f1581f747f46f2f))
* **test:** `bobFulfills` condition ([9cf1d00](https://github.com/Agoric/agoric-sdk/commit/9cf1d0032894fc2492af741efa18e0edf46d4f45))
* **test:** `inspectLogs` returns pure data, not a reference ([e75b531](https://github.com/Agoric/agoric-sdk/commit/e75b531e3e19817dad5eb6ea4c3d3fe9391495c7))
* **types:** discriminate `ChainInfo` union on `namespace` ([0f9f3fc](https://github.com/Agoric/agoric-sdk/commit/0f9f3fcbdd9da33b2eca1c02a2f7189c5405e8ff))
* unsettled vows from before CAIP-10 ([1169a79](https://github.com/Agoric/agoric-sdk/commit/1169a791a9a5623d53979c4a02305563f10ce988))
