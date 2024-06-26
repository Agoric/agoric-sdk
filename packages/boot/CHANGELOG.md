# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u16.0 (2024-06-26)


### ⚠ BREAKING CHANGES

* make Network and IBC vats durable (#8721)

### Features

*  smartWallet verstion 2 with watchedPromises ([5ed5107](https://github.com/Agoric/agoric-sdk/commit/5ed51078d39e643d91b572d9c50fad4a276d7ded))
* add slog file output to benchmark tool ([3f9f8ba](https://github.com/Agoric/agoric-sdk/commit/3f9f8badf351ec94e2ea6763eb89a6d358b6a4c4))
* Add tooling for standalone performance benchmarks ([058e54a](https://github.com/Agoric/agoric-sdk/commit/058e54aad93c04b57dfb3a411bff85c223ab5dd7))
* delete tmp dir after proposal build ([5ab79b7](https://github.com/Agoric/agoric-sdk/commit/5ab79b778fd540454a727486849580ea6efe1789))
* getBridgeId on ScopedBridgeManager ([aec4dea](https://github.com/Agoric/agoric-sdk/commit/aec4dea4f4d6baca3ea32c33551ba00658eab31b))
* implement benchmarks for price feeds with and without liquidation. ([d864b66](https://github.com/Agoric/agoric-sdk/commit/d864b666104beccf5f5ccad222f7a5d23a5ad7d5)), closes [#8496](https://github.com/Agoric/agoric-sdk/issues/8496)
* implement swingset-runner based version of the vaults benchmark ([6593570](https://github.com/Agoric/agoric-sdk/commit/659357022f339d8aae32e6600a2bf00e5a30d474))
* initChainInfo in orchestration setup eval ([5913d8f](https://github.com/Agoric/agoric-sdk/commit/5913d8f85831cda6cabcff2aa4304c7b42ade70e))
* **internal:** fakeStorage.getBody() supports index other than -1 ([eda89cc](https://github.com/Agoric/agoric-sdk/commit/eda89cc7ec56b44f33f8552811c267d01bbf29b0))
* make Network and IBC vats durable ([#8721](https://github.com/Agoric/agoric-sdk/issues/8721)) ([3d13c09](https://github.com/Agoric/agoric-sdk/commit/3d13c09363013e23726c2ac5fa299a8e5344fd8c))
* new 'boot' package with bootstrap configs ([8e3173b](https://github.com/Agoric/agoric-sdk/commit/8e3173b0b86a3dc90b31164bc4272c54e46a6641))
* **orchestration:** add stakeAtom example contract ([82f1901](https://github.com/Agoric/agoric-sdk/commit/82f1901ec6ecf5a802a72023d033609deeb053e1))
* **orchestration:** add support for queries (icq/v1) ([79b5d0f](https://github.com/Agoric/agoric-sdk/commit/79b5d0f61f0c11b00e51832b7edf3922df8f51c6))
* **orchestration:** align ChainAccount spec with current implementation ([678f21f](https://github.com/Agoric/agoric-sdk/commit/678f21f51b8ad94f9064dcd8b4b3bbad707b6996))
* **orchestration:** create ChainAccount ([ba75ed6](https://github.com/Agoric/agoric-sdk/commit/ba75ed692a565aae5c5124ad5220f6901576532e))
* **orchestration:** send message from ica ([764e4a8](https://github.com/Agoric/agoric-sdk/commit/764e4a86a5f27ca5a1478e6111b3440dcc2de3f2))
* **orchestration:** stakeAtom delegate ([54d830f](https://github.com/Agoric/agoric-sdk/commit/54d830fd53420d3395a5d9ca3bc11e8a55a2773b))
* **orchestration:** stakeAtom query balance ([9f0ae09](https://github.com/Agoric/agoric-sdk/commit/9f0ae09e389f1750c9e550d5e6893460d1e21d07))
* refresh slogulator to account for smallcaps and improve UX ([73aa6d6](https://github.com/Agoric/agoric-sdk/commit/73aa6d6554651a4897fa19ae223abbe8a8491320)), closes [#8647](https://github.com/Agoric/agoric-sdk/issues/8647)
* stakeBld contract ([a7e30a4](https://github.com/Agoric/agoric-sdk/commit/a7e30a4e43c00b2916d2d57c70063650e726321f))
* stub Orchestration API ([1e054ac](https://github.com/Agoric/agoric-sdk/commit/1e054ac972ddfff5fb03738747c69eecd125c463))
* support `coreProposals.steps` ([80fa3d1](https://github.com/Agoric/agoric-sdk/commit/80fa3d14494706d825f51ac22e1bbf4ec68ce404))
* **types:** ContractMeta ([9d02dfa](https://github.com/Agoric/agoric-sdk/commit/9d02dfab2cc2c24ed9b15a6aa8bc5fba7d6c9fe0))
* **types:** readLatest returns any ([7a9982b](https://github.com/Agoric/agoric-sdk/commit/7a9982bf8572f43ce8670ed6e73ee4c8fad858b5))
* use fetched chain info ([6fbdeae](https://github.com/Agoric/agoric-sdk/commit/6fbdeae46a71512cbd95603a71b406867a37511c))
* **vats:** `BRIDGE_TARGET_REGISTER` and `BRIDGE_TARGET_UNREGISTER` ([badf695](https://github.com/Agoric/agoric-sdk/commit/badf6958dcfb602cf5992afd4ba1f0dc602fccd5))
* vm-config package ([8b1ecad](https://github.com/Agoric/agoric-sdk/commit/8b1ecad8ab50db777bc11c3ee6fcdb37d6cb38b6))
* WithdrawReward on StakingAccountHolder ([8cbe1b6](https://github.com/Agoric/agoric-sdk/commit/8cbe1b60de03aeeffe8ffef433e4e35e4f900911))
* Zoe use watchPromise() to wait for contract finish ([#8453](https://github.com/Agoric/agoric-sdk/issues/8453)) ([6388a00](https://github.com/Agoric/agoric-sdk/commit/6388a002b53593f17a8d936d4e937efb7d065d97))


### Bug Fixes

* **boot:** import ambient types from Zoe ([e9d24cd](https://github.com/Agoric/agoric-sdk/commit/e9d24cdfa94d3761419bc91e8203fbb3f66bcad4))
* chainId in connection tuple ([7f15f0a](https://github.com/Agoric/agoric-sdk/commit/7f15f0a4b8f9f7908773c336d5ae4f4452f0bd48))
* eliminate the `passableEncoding` hack ([87dbbda](https://github.com/Agoric/agoric-sdk/commit/87dbbda8484c6fe3fe542eb847647fd1540c11e6)), closes [#8327](https://github.com/Agoric/agoric-sdk/issues/8327)
* fetch agoric connections ([f8bcd92](https://github.com/Agoric/agoric-sdk/commit/f8bcd921dca3e03e112f03a0b2975a2b82f959c9))
* **lint:** addressing lint errors ([bfe10d9](https://github.com/Agoric/agoric-sdk/commit/bfe10d9cc3878c322ca624a3a603e80f94dc6970))
* make tests work again after some (bogus) awaits were removed from bootstrap ([ca0a3aa](https://github.com/Agoric/agoric-sdk/commit/ca0a3aab3f31ac0e97e55cd63709000fbb46f2ca))
* minor fixes and cleanups in preparation for benchmark support ([1277176](https://github.com/Agoric/agoric-sdk/commit/127717677287cc825e34b6326be3e11a165dce27))
* **network:** use new `ERef` and `FarRef` ([55adb2b](https://github.com/Agoric/agoric-sdk/commit/55adb2b1f5b644ef5b7cf40ea8b7d87488218229))
* **orchestration:** rename `.getAccountAddress` -> `.getAddress` ([f951cde](https://github.com/Agoric/agoric-sdk/commit/f951cde10ee6618660938b2e5b404f797231d8e2))
* parseQueryPacket bigint handling ([916af0f](https://github.com/Agoric/agoric-sdk/commit/916af0f2b59539384324575afd547d031a15ba92))
* **provisioning:** don't use disconnected namesByAddress ([84d74dd](https://github.com/Agoric/agoric-sdk/commit/84d74dd22a8fb2ec274c293d5de0078e0a9359a0))
* real chainId in chainAccountKit ([521dfd0](https://github.com/Agoric/agoric-sdk/commit/521dfd0db134ef74ce78afb0f6ae9ba83315ce67))
* **types:** board ([c73f4f9](https://github.com/Agoric/agoric-sdk/commit/c73f4f9686215a37e8c5f82ce8dbe4742886a02b))
* **vats:** `vtransfer` code cleanup ([8ac8197](https://github.com/Agoric/agoric-sdk/commit/8ac819709ef9ced0badee25e6715a5847b1e3f4c))
* **vow:** allow resolving vow to external promise ([945a60c](https://github.com/Agoric/agoric-sdk/commit/945a60cfdadd90716340b5122c4008b56225af7a))
