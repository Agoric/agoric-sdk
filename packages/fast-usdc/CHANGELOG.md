# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u18.0 (2024-12-24)


### Features

* error on conflicting evidence ([cd2a40c](https://github.com/Agoric/agoric-sdk/commit/cd2a40c0e4e5923510e7c77edc710b6c7ba8bc8c))
* **fast-usdc:** add FastLP/ufastlp to vbank ([ae1963e](https://github.com/Agoric/agoric-sdk/commit/ae1963e9f73f159be2fab93920fcceeb9ebc555d))
* **fast-usdc:** detect transfer completion in cli ([2828444](https://github.com/Agoric/agoric-sdk/commit/28284443141f700d2214c42d8d7b983b40f569fc))
* **fast-usdc:** support risk assessment arg ([ff6737a](https://github.com/Agoric/agoric-sdk/commit/ff6737a574e4a2efccda226780ed09e3fb4076b3))
* operator majority logic ([bc28201](https://github.com/Agoric/agoric-sdk/commit/bc28201f60978263d4c88375130da15128f8fd5c))
* record fee split in transaction ([8846972](https://github.com/Agoric/agoric-sdk/commit/884697238ad5f8a112ed24616b10c3b3a94af737))

## 0.35.0-u18.4 (2024-12-17)


### ⚠ BREAKING CHANGES

* remove agoricNames from VstorageKit

### Features

* consistent publishTxnRecord (record) ([dbf3934](https://github.com/Agoric/agoric-sdk/commit/dbf39340c75d9e01af2ee9ceccac327660af94a6))
* deleteCompletedTxs ([f0078ee](https://github.com/Agoric/agoric-sdk/commit/f0078ee5668de2f1bba6f0544ea5629ccc8c9d28))
* **fast-usdc:** cli for lp deposit and withdraw ([4c0c372](https://github.com/Agoric/agoric-sdk/commit/4c0c37234fc2ddd1e83c0d0f3693c33a05163f5b))
* **fast-usdc:** limited operation before connecting to noble ([eb82ae3](https://github.com/Agoric/agoric-sdk/commit/eb82ae37c9ec3327f38122c5c8f51d8f5942c9c6))
* include 'sender' in CctpTxEvidence ([f99e7b8](https://github.com/Agoric/agoric-sdk/commit/f99e7b8152fe686a100618b9cdfa4a8ced156dd2))
* publish CctpTxEvidence ([2916c8f](https://github.com/Agoric/agoric-sdk/commit/2916c8f43b23a6c4d38796dd7135e9d712d12f8c))
* publish OBSERVED with first evidence ([7e62d8f](https://github.com/Agoric/agoric-sdk/commit/7e62d8f811e212f8160c36a3b954aee8c0e1fb90))
* simplify seenTxs key ([fd05a7e](https://github.com/Agoric/agoric-sdk/commit/fd05a7ecd0fc2847380506d2a90fe79079511457))
* **types:** TransactionRecord ([ccb9e28](https://github.com/Agoric/agoric-sdk/commit/ccb9e28a92c17ce3362ac5898acb80128614edab))
* vstorage status --> txns ([aebb4d7](https://github.com/Agoric/agoric-sdk/commit/aebb4d792317f6964a8150324548b69cec2eb505))


### Bug Fixes

* do not stringify logs ([d04c5ea](https://github.com/Agoric/agoric-sdk/commit/d04c5eac94e1954456cd23e9006e9f4daabb3759))
* vstorage fastUsdc path ([1f47164](https://github.com/Agoric/agoric-sdk/commit/1f47164a792b64f5b4a27992156646d87670782c))


### Miscellaneous Chores

* remove agoricNames from VstorageKit ([1c69d39](https://github.com/Agoric/agoric-sdk/commit/1c69d39c6b5571e8501cd4be8d32e3d1bd9d3844))

## 0.35.0-u18.3 (2024-12-09)


### ⚠ BREAKING CHANGES

* `getAsset` and `getDenomInfo` require `srcChainName` param

### Features

* `getAsset` and `getDenomInfo` require `srcChainName` param ([fc802ad](https://github.com/Agoric/agoric-sdk/commit/fc802adc06082eb0618f4a2d58d91ac380512352))
* assetInfo as array of entries ([51e7a9c](https://github.com/Agoric/agoric-sdk/commit/51e7a9c3e3fb2cde44db2ffce817f353a17e76a3))
* **fast-usdc:** core-eval to update feed policy ([db283e1](https://github.com/Agoric/agoric-sdk/commit/db283e160159f78e15c6b92e7041d09b4e6add61))
* **fast-usdc:** operator attest cli command ([448aa3a](https://github.com/Agoric/agoric-sdk/commit/448aa3a194b55ebeb5423f0027c543f8c6807239))
* **fast-usdc:** publish feeConfig to vstorage ([08b2e13](https://github.com/Agoric/agoric-sdk/commit/08b2e13921514258de566c52aeda737a28ed44c7))
* **fast-usdc:** settler disburses or forwards funds ([17b0423](https://github.com/Agoric/agoric-sdk/commit/17b04238a73ff14a2617e73cf03c52d79d733ebc))
* **fast-usdc:** write chain policies to vstorage ([#10532](https://github.com/Agoric/agoric-sdk/issues/10532)) ([9d6cff1](https://github.com/Agoric/agoric-sdk/commit/9d6cff17bb95ce5557758da242ca4646a87ac5b0))
* **fast-usdc:** write status updates to vstorage ([#10552](https://github.com/Agoric/agoric-sdk/issues/10552)) ([419df4e](https://github.com/Agoric/agoric-sdk/commit/419df4ee7ce03499f30e7327c74e95a338201023))
* operator accept cmd ([ae2cf1e](https://github.com/Agoric/agoric-sdk/commit/ae2cf1e461a63deb39dc01c35cea564cf1d5527b))
* parameterize fusdc with chainInfo and assetInfo ([e5a8b64](https://github.com/Agoric/agoric-sdk/commit/e5a8b6489368f0bf3a099ce4c5ddf9607a6192c1))
* scaffold operator commands ([36375fd](https://github.com/Agoric/agoric-sdk/commit/36375fd2ecf41fc171133186969a29d872e8012b))


### Bug Fixes

* `brandKey` not part of `DenomDetail` ([9a65478](https://github.com/Agoric/agoric-sdk/commit/9a654781d53576ae0b3d1fa37f7a96579bfda848))

## 0.35.0-u18.2 (2024-11-21)


### Features

* `Advancer` uses `borrower` facet ([35eb7ad](https://github.com/Agoric/agoric-sdk/commit/35eb7ad48377f11dab8c717c442653f99587a816))
* integrate `Advancer` with contract ([c5d67af](https://github.com/Agoric/agoric-sdk/commit/c5d67af2b04808e6928b4c8c1e9fdda79c8ac847))
* liquidity pool borrower and repayer facets ([3117eef](https://github.com/Agoric/agoric-sdk/commit/3117eef0eb604e6e267074648382bca23377f2ea))

## 0.35.0-u18.1 (2024-11-19)


### Features

* `Advancer` exo behaviors ([4cd2f3f](https://github.com/Agoric/agoric-sdk/commit/4cd2f3f140ce1c7ea1dcb11fc4fc3c6b31cf2410)), closes [#10390](https://github.com/Agoric/agoric-sdk/issues/10390)
* `CctpTxEvidenceShape`, `PendingTxShape` typeGuards ([5a7b3d2](https://github.com/Agoric/agoric-sdk/commit/5a7b3d25cb7853e9109f74a7b45feb29b8ff69fe))
* `getQueryParams` takes shape parameter ([99707ef](https://github.com/Agoric/agoric-sdk/commit/99707ef60e1ca5f554f3622f7d7f9b1df89c54c7))
* `StatusManager` scaffold ([980463f](https://github.com/Agoric/agoric-sdk/commit/980463f422a674676f0faf036c4bfae930824482))
* `StatusManager` tracks `seenTxs` ([f3d1e36](https://github.com/Agoric/agoric-sdk/commit/f3d1e367ce2284338147866af586bed8ed9fc86b))
* `TxStatus` const for `StatusManager` states ([1376020](https://github.com/Agoric/agoric-sdk/commit/1376020656a57ee341b5f76f9ce127e76fc657bd))
* advancer with fees ([087f3a8](https://github.com/Agoric/agoric-sdk/commit/087f3a84a266fd0061f6d35c7b51f193de308f95))
* defineInertInvitation ([f756412](https://github.com/Agoric/agoric-sdk/commit/f7564122258e5bdc868d7b3550c4587807015d76))
* **fast-usdc:** .start.js core-eval w/oracle invitations ([7b6820a](https://github.com/Agoric/agoric-sdk/commit/7b6820a6585de3335e5ce2d4aa6d90f238d1fe9d))
* **fast-usdc:** add cli config and args for deposit and withdraw ([#10487](https://github.com/Agoric/agoric-sdk/issues/10487)) ([fb2d05c](https://github.com/Agoric/agoric-sdk/commit/fb2d05c0d755e1ad68aed1ae1112ea4973aad92e))
* **fast-usdc:** deposit, withdraw liquidity in exchange for shares ([5ae543d](https://github.com/Agoric/agoric-sdk/commit/5ae543d0983e6f27956c189e8a86355180d8c724))
* **fast-usdc:** implement config cli command ([d121e1d](https://github.com/Agoric/agoric-sdk/commit/d121e1d453a877352b133aa149c2f41ad44baae9))
* **fast-usdc:** implement transfer cli command ([504818f](https://github.com/Agoric/agoric-sdk/commit/504818fc5758c312371ae427b7899976f5158055))
* **fast-usdc:** stub config cli command ([81e14b2](https://github.com/Agoric/agoric-sdk/commit/81e14b2f602237dc68b9f406672332c5c5d90d75))
* **fast-usdc:** stub transfer cli command ([1b64d82](https://github.com/Agoric/agoric-sdk/commit/1b64d82e3db9d7a95461502ef6f7ee136a5eca19))
* feed access controls ([8f4a66d](https://github.com/Agoric/agoric-sdk/commit/8f4a66d75dc4b79b698f7eee85b7d93de745045a))
* makeTestPushInvitation handles evidence ([7e99cfa](https://github.com/Agoric/agoric-sdk/commit/7e99cfa02cb067a7c3899259edda2f79bf9ba7dc))
* minimal `addressTools` for query param parsing ([6f97e13](https://github.com/Agoric/agoric-sdk/commit/6f97e137ba466db06354c6023a502106559028ea))
* operators evidence flows through feed ([2161a6f](https://github.com/Agoric/agoric-sdk/commit/2161a6fd69c31f6f16ae8e8716e1a07e92db5d34))
* publish when all oracle operators agree ([d06ae2b](https://github.com/Agoric/agoric-sdk/commit/d06ae2b52db53ad45db1423cc3297954dd3a7e44))
* TransactionFeedKit ([8eb7dee](https://github.com/Agoric/agoric-sdk/commit/8eb7dee8f70facf8fb0b36c36d630c4153f4c722))
* uniform configuration with LegibleCapData ([968903a](https://github.com/Agoric/agoric-sdk/commit/968903a86897df5f8e2aa570e325a38c4077d850))


### Bug Fixes

* **fast-usdc:** ensure cli non-zero exit code on failure ([6c0e77b](https://github.com/Agoric/agoric-sdk/commit/6c0e77b3272f3f00d9e2a8100b153f6e198664d6))
* **fast-usdc:** fix url encoding ([d46cefd](https://github.com/Agoric/agoric-sdk/commit/d46cefdd869a09a2548257d6a05eddc55c6cf6ab))
* **fast-usdc:** use correct address format in cli ([d225974](https://github.com/Agoric/agoric-sdk/commit/d2259741a6b7a1fbca4938ceebc3acd773445e04))

## 0.35.0-u18.0 (2024-10-31)


### Features

* add CLI for fast-usdc package ([92bc5b1](https://github.com/Agoric/agoric-sdk/commit/92bc5b127e1cf1806da79589bd6e9d9e87cd5944))



### [0.1.1-u18.5](https://github.com/Agoric/agoric-sdk/compare/fast-usdc@0.1.1-u18.4...fast-usdc@0.1.1-u18.5) (2024-12-17)

**Note:** Version bump only for package fast-usdc





### [0.1.1-u18.4](https://github.com/Agoric/agoric-sdk/compare/fast-usdc@0.1.1-u18.3...fast-usdc@0.1.1-u18.4) (2024-12-13)

**Note:** Version bump only for package fast-usdc





### [0.1.1-u18.3](https://github.com/Agoric/agoric-sdk/compare/fast-usdc@0.1.1-u18.2...fast-usdc@0.1.1-u18.3) (2024-12-09)

**Note:** Version bump only for package fast-usdc





### [0.1.1-u18.2](https://github.com/Agoric/agoric-sdk/compare/fast-usdc@0.1.1-u18.1...fast-usdc@0.1.1-u18.2) (2024-11-21)

**Note:** Version bump only for package fast-usdc





### [0.1.1-u18.1](https://github.com/Agoric/agoric-sdk/compare/fast-usdc@0.1.1-u18.0...fast-usdc@0.1.1-u18.1) (2024-11-19)

**Note:** Version bump only for package fast-usdc





### 0.1.1-u18.0 (2024-10-31)


### Features

* add CLI for fast-usdc package ([92bc5b1](https://github.com/Agoric/agoric-sdk/commit/92bc5b127e1cf1806da79589bd6e9d9e87cd5944))
