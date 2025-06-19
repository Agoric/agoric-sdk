# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### 0.1.1-u21.0 (2025-06-19)


### Features

* `FeeConfig` optionally takes `relay: Amount<nat>` ([7162eb1](https://github.com/Agoric/agoric-sdk/commit/7162eb15fdc1312cfa32d1a3117291c0845e6b55))
* `FUSDC` includes `FeeConfig.destinationOverrides` values ([ba71b36](https://github.com/Agoric/agoric-sdk/commit/ba71b36a13d09ef71e291fafde56c5d2aa67e350))
* `Settler` uses `bank/MsgSend` when forwarding to current chain ([2250e61](https://github.com/Agoric/agoric-sdk/commit/2250e61649dba73820f799ff33309445b7dfb885))
* eval to reimburse opco ([4b443e1](https://github.com/Agoric/agoric-sdk/commit/4b443e16f7c80e549bf8db12b9484466a23c68cf))
* FastUSDC registers cctp chains ([6e269f4](https://github.com/Agoric/agoric-sdk/commit/6e269f4efd1ff2d53609346e375e3215d5392eac))
* remediate unmatched batch in next upgrade ([c0d77b2](https://github.com/Agoric/agoric-sdk/commit/c0d77b264d81f72f8772d728941ad8be1551f496))
* retry ForwardFailed ([a6c03e0](https://github.com/Agoric/agoric-sdk/commit/a6c03e080238219422716191572992897a51d0e6))
* take uusdc instead of USDC unit ([ce4ad4b](https://github.com/Agoric/agoric-sdk/commit/ce4ad4b7a86317fb9dbb3cb15a3440502f7cf14e))
* upgrade FUSDC chainHub ([6414c7f](https://github.com/Agoric/agoric-sdk/commit/6414c7fb46c5060cf090e5685b9b477684ad0daf))
* withCosmosChainId ([2e72f6c](https://github.com/Agoric/agoric-sdk/commit/2e72f6c152074d59a3e0f52b79303cba509dda98))


### Bug Fixes

* `icaEnabled: false` for agoric ([b3b0102](https://github.com/Agoric/agoric-sdk/commit/b3b01027f558b81824629bdf7280b1a68443603a))
* advancer vow handling ([6306fa4](https://github.com/Agoric/agoric-sdk/commit/6306fa4c8afe6f699eac407c7f576760a8cbc422))
* **fast-usdc-deploy:** Thread exports for esbuild contract bundle ([ac99245](https://github.com/Agoric/agoric-sdk/commit/ac9924597f11b2d695add188fd9a08dcefeecc7a))
* **types:** discriminate `ChainInfo` union on `namespace` ([0f9f3fc](https://github.com/Agoric/agoric-sdk/commit/0f9f3fcbdd9da33b2eca1c02a2f7189c5405e8ff))
