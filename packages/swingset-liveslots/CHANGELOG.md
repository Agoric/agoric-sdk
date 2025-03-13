# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.10.3-u19.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.3-u19.1...@agoric/swingset-liveslots@0.10.3-u19.2) (2025-03-13)

**Note:** Version bump only for package @agoric/swingset-liveslots





### [0.10.3-u19.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.3-u19.0...@agoric/swingset-liveslots@0.10.3-u19.1) (2025-03-03)

**Note:** Version bump only for package @agoric/swingset-liveslots





### [0.10.3-u19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.2...@agoric/swingset-liveslots@0.10.3-u19.0) (2025-02-24)


### Features

* **liveslots-tools:** add startLife test tool ([ae05573](https://github.com/Agoric/agoric-sdk/commit/ae0557309297e29b4ca8307f7a3aefc72799436b))
* **liveslots-tools:** expose insistAllDurableKindsReconnected ([fc02f30](https://github.com/Agoric/agoric-sdk/commit/fc02f305817706bc80e2a0b0cd2a4901c9927115))
* **liveslots-tools:** prepare-strict-test-env ([d98d894](https://github.com/Agoric/agoric-sdk/commit/d98d89449d4bfc1419cd4410edef813db0e4ec55))
* **liveslots-tools:** return incarnation in test tools ([6c15cc9](https://github.com/Agoric/agoric-sdk/commit/6c15cc99d1c8084b2d4e88e757c78dbd9c8497bd))
* **liveslots:** virtual exo meta-ops ([#8779](https://github.com/Agoric/agoric-sdk/issues/8779)) ([af3ced9](https://github.com/Agoric/agoric-sdk/commit/af3ced91861731353e10a45e4eae63450f74a0ea))
* **swingset-liveslots:** endow passStyleOf to liveslots guest compartment ([#9874](https://github.com/Agoric/agoric-sdk/issues/9874)) ([b6c58f2](https://github.com/Agoric/agoric-sdk/commit/b6c58f297e8f902f046cc2c71fe7f6162fe0c76d)), closes [#9431](https://github.com/Agoric/agoric-sdk/issues/9431) [#9431](https://github.com/Agoric/agoric-sdk/issues/9431) [#9781](https://github.com/Agoric/agoric-sdk/issues/9781) [#9431](https://github.com/Agoric/agoric-sdk/issues/9431) [#9431](https://github.com/Agoric/agoric-sdk/issues/9431)
* **vow:** VowShape, isVow ([#9154](https://github.com/Agoric/agoric-sdk/issues/9154)) ([db4d0ea](https://github.com/Agoric/agoric-sdk/commit/db4d0eab68a1d361ddbb6fe993ff0b9969a348e5))


### Bug Fixes

* add test for collection snapshot ([0ea5eb3](https://github.com/Agoric/agoric-sdk/commit/0ea5eb3ae77d5639bda7428e52c4d9c0fa8e4059))
* correct infelicities in virtual collection API implementation ([af5507b](https://github.com/Agoric/agoric-sdk/commit/af5507bfecaa8f76001c09f6a1a9c8ca2a4c58c1)), closes [#7632](https://github.com/Agoric/agoric-sdk/issues/7632)
* DEBUG harmony ([#8136](https://github.com/Agoric/agoric-sdk/issues/8136)) ([d2ea4b4](https://github.com/Agoric/agoric-sdk/commit/d2ea4b46b9efa61e97eec8711830d9fdd741ca55))
* incorporate refactored VRM into fakeVirtualSupport ([5641fb0](https://github.com/Agoric/agoric-sdk/commit/5641fb0effb0045e6ddefa64280ec54730a6b45a))
* kindlier error diagnostics on addAll ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5a6bf5d186f33137b3c9a113e3a232207))
* **liveslots-tools:** init IDs ([9df0317](https://github.com/Agoric/agoric-sdk/commit/9df0317f78b8b7c0ae12dae42e304c02e6386ad4))
* **liveslots-tools:** reincarnate clones fakeStore ([21b89e0](https://github.com/Agoric/agoric-sdk/commit/21b89e0a019c64b6bbf248c2156276f9d4798597))
* **liveslots:** allow import of previously exported vpid ([ce8e592](https://github.com/Agoric/agoric-sdk/commit/ce8e592eb453fe8d6e8563ab7778428470259ac3))
* **liveslots:** avoid slotToVal memory leak for watched promises ([874196c](https://github.com/Agoric/agoric-sdk/commit/874196c477036964634b5e3b8af93fb57279ef18)), closes [#10757](https://github.com/Agoric/agoric-sdk/issues/10757) [#10756](https://github.com/Agoric/agoric-sdk/issues/10756) [#10706](https://github.com/Agoric/agoric-sdk/issues/10706)
* **liveslots:** avoid unhandled rejection on startVat failure ([2a1218e](https://github.com/Agoric/agoric-sdk/commit/2a1218e27f7eea8136c0b7e9f61d02b6b0355a71))
* **liveslots:** cache.delete() does not return a useful value ([42ea8a3](https://github.com/Agoric/agoric-sdk/commit/42ea8a3f9a49081d65fda05d8d99ed2732aeb6c0)), closes [#8752](https://github.com/Agoric/agoric-sdk/issues/8752)
* **liveslots:** collection deletion and retirement bugs ([97e81f1](https://github.com/Agoric/agoric-sdk/commit/97e81f17d1e060f56114ddd7fc124f90df0695cb)), closes [#8756](https://github.com/Agoric/agoric-sdk/issues/8756) [#7355](https://github.com/Agoric/agoric-sdk/issues/7355) [#9956](https://github.com/Agoric/agoric-sdk/issues/9956) [#8759](https://github.com/Agoric/agoric-sdk/issues/8759)
* **liveslots:** collection.clear(pattern) vs getSize ([f8806f3](https://github.com/Agoric/agoric-sdk/commit/f8806f37774f511671b14ee8807f381c9ef2e5e2)), closes [#10007](https://github.com/Agoric/agoric-sdk/issues/10007)
* **liveslots:** handle registration of watchPromise during buildRootObject ([0293f80](https://github.com/Agoric/agoric-sdk/commit/0293f80f66419408abb5e3eaaeaee0b85a0b7a66))
* **liveslots:** handle revival of re-imported but previously exported promise ([59c2ef7](https://github.com/Agoric/agoric-sdk/commit/59c2ef7efbf1357e649eece1dc205f0d3a267d5a))
* **liveslots:** move passStyleOf from vatGlobals to inescapableGlobalProperties ([e40a8b9](https://github.com/Agoric/agoric-sdk/commit/e40a8b9a4b8fb0651d915b21876bc7f7f963131a)), closes [#9981](https://github.com/Agoric/agoric-sdk/issues/9981)
* **liveslots:** promise watcher to cause unhandled rejection if no handler ([#9507](https://github.com/Agoric/agoric-sdk/issues/9507)) ([a19a964](https://github.com/Agoric/agoric-sdk/commit/a19a964b35a3b3b7252fbb3155211cc482be63df)), closes [#8596](https://github.com/Agoric/agoric-sdk/issues/8596) [/github.com/Agoric/agoric-sdk/pull/8596#discussion_r1414436455](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/8596/issues/discussion_r1414436455)
* **liveslots:** rewrite scanForDeadObjects to avoid retire-without-drop ([7a09175](https://github.com/Agoric/agoric-sdk/commit/7a0917583c1d87de3b4619b633fb6d641bde656c)), closes [#9939](https://github.com/Agoric/agoric-sdk/issues/9939) [#9939](https://github.com/Agoric/agoric-sdk/issues/9939)
* **liveslots:** tolerate old version of vat-data package ([6addca0](https://github.com/Agoric/agoric-sdk/commit/6addca016507be8c6ea350a252a6cb7b27e4ee08))
* many typing improvements ([777eb21](https://github.com/Agoric/agoric-sdk/commit/777eb21a20fbff3da93d713dc1b95a01fe6ce472))
* refactor vatstore usage to fix test failures ([886e2fa](https://github.com/Agoric/agoric-sdk/commit/886e2fac16f3b12be732dbde9ffdab9b2354d13d)), closes [#8012](https://github.com/Agoric/agoric-sdk/issues/8012)
* **swingset-liveslots:** explicitly harden iteration helper prototypes ([aeaa62b](https://github.com/Agoric/agoric-sdk/commit/aeaa62b07d941eb74938bac19c64051d554ae532))
* **swingset-liveslots:** Throw a "not found" error for store.set(missingRemotable, val) ([7c48d4c](https://github.com/Agoric/agoric-sdk/commit/7c48d4cd0ef32828e691bd65492e9ce8929ac0af)), closes [#8098](https://github.com/Agoric/agoric-sdk/issues/8098)
* **types:** board ([c73f4f9](https://github.com/Agoric/agoric-sdk/commit/c73f4f9686215a37e8c5f82ce8dbe4742886a02b))
* **types:** problems hidden by skipLibCheck ([6a6e595](https://github.com/Agoric/agoric-sdk/commit/6a6e59549e7beeeef94bf90556ed16873c46d285))
* update for `[@jessie](https://github.com/jessie).js/safe-await-separator` ([94c6b3c](https://github.com/Agoric/agoric-sdk/commit/94c6b3c83a5326594f1e2886ae01d6a703a7a68f))
* update TS types ([7580805](https://github.com/Agoric/agoric-sdk/commit/75808055afc129c81b7978fb83c33cfed7a4ecbd))



### [0.10.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.1...@agoric/swingset-liveslots@0.10.2) (2023-06-02)

**Note:** Version bump only for package @agoric/swingset-liveslots





### [0.10.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.0...@agoric/swingset-liveslots@0.10.1) (2023-05-24)

**Note:** Version bump only for package @agoric/swingset-liveslots





## 0.10.0 (2023-05-19)


### Features

* better diagnostic for failed reanimate ([c0c9c94](https://github.com/Agoric/agoric-sdk/commit/c0c9c9433648d520aa2bcdbadbbfe877831567c7)), closes [Error#1](https://github.com/Agoric/Error/issues/1)
* **swingset-liveslots:** label virtual instances ([4191eb6](https://github.com/Agoric/agoric-sdk/commit/4191eb62d0e64048c3c715e5f71a53a747267350))
* add APIs for tracking/debugging undesired object retention (aka "leaks") ([0a7221b](https://github.com/Agoric/agoric-sdk/commit/0a7221b3c04f3b2894c30346fa2ea6fb0130c046)), closes [#7318](https://github.com/Agoric/agoric-sdk/issues/7318)
* move liveslots and specific tests to a new package ([0921a89](https://github.com/Agoric/agoric-sdk/commit/0921a8903b72cfefdf05a5906bcfb826cac1cc2f)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)


### Bug Fixes

* **liveslots:** allow new Kind upgrade to add new facets ([6bc6694](https://github.com/Agoric/agoric-sdk/commit/6bc6694968e6d2f529e7c91ec1efb11fdff2e2d3)), closes [#7437](https://github.com/Agoric/agoric-sdk/issues/7437)
* **liveslots:** retain WeakRefs to voAware collections ([3935723](https://github.com/Agoric/agoric-sdk/commit/393572396781afd17691e1366abeba696228a24e)), closes [#7371](https://github.com/Agoric/agoric-sdk/issues/7371)
* **swingset-liveslots:** prevent VOM infinite loop if `globalThis.WeakSet` etc are replaced ([d7b35e2](https://github.com/Agoric/agoric-sdk/commit/d7b35e28715a715ef510f2717e0040fa017caab4))
* adding dup entries to virtual sets is OK ([c81d367](https://github.com/Agoric/agoric-sdk/commit/c81d3677d8085eb4debe5baa416816ff94d582cf)), closes [#7234](https://github.com/Agoric/agoric-sdk/issues/7234)
* code updates for new marshal ([292f971](https://github.com/Agoric/agoric-sdk/commit/292f971769db69e61782f96638c2f687c3f95ac2))
* **SwingSet:** Don't send stopVat during upgrade ([5cc47d2](https://github.com/Agoric/agoric-sdk/commit/5cc47d2d8892690f8c1653630b41dd64cc42d73b)), closes [#6650](https://github.com/Agoric/agoric-sdk/issues/6650)
* **types:** return value of deleter ([457f576](https://github.com/Agoric/agoric-sdk/commit/457f5765b9fc0a693e6eb5e6644ddf4af3b791db))
* move many type definitions from swingset to liveslots ([727143d](https://github.com/Agoric/agoric-sdk/commit/727143d5562498e2e3013c34304f229b4dd11da5))
* move rejectAllPromises from stopVat to kernels-side upgradeVat ([d79623f](https://github.com/Agoric/agoric-sdk/commit/d79623f3fb3b87653dba1c71eb1153711c9d962c)), closes [#6694](https://github.com/Agoric/agoric-sdk/issues/6694)
* Move upgrade-time abandonExports responsibility into the kernel ([66ac657](https://github.com/Agoric/agoric-sdk/commit/66ac657d51d3d1be61ee4a6e9a621a664086ee57)), closes [#6696](https://github.com/Agoric/agoric-sdk/issues/6696)
* only the exo api change ([5cf3bf1](https://github.com/Agoric/agoric-sdk/commit/5cf3bf10a71dd02094365a66e87032e5d17d004f))
* **liveslots:** use Map for vrefStatus, not object ([1456e2a](https://github.com/Agoric/agoric-sdk/commit/1456e2ae006bb1c702383cedda5e5c407968840e))
* **swingset:** move a bunch of types from swingset to swingset-liveslots ([14f9bb0](https://github.com/Agoric/agoric-sdk/commit/14f9bb00c82c085dc647f23b6c90b26e6a0a6dfd))
* **swingset-liveslots:** Move promise rejection responsibility into the kernel ([dd29ff3](https://github.com/Agoric/agoric-sdk/commit/dd29ff35c5dc72efbbf7087849182aa7f04b2bb1)), closes [#6694](https://github.com/Agoric/agoric-sdk/issues/6694)
* add 'v'/'d' virtual/durable annotations to vrefs ([b859e92](https://github.com/Agoric/agoric-sdk/commit/b859e92fe041415d6e34250f672a10ad927aa33e)), closes [#6695](https://github.com/Agoric/agoric-sdk/issues/6695)
* update description of "FINALIZED" state ([809f366](https://github.com/Agoric/agoric-sdk/commit/809f3660c083467e76deb1487015cb24205a801d))
* without assertKeyPattern ([#7035](https://github.com/Agoric/agoric-sdk/issues/7035)) ([c9fcd7f](https://github.com/Agoric/agoric-sdk/commit/c9fcd7f82757732435cd96f3377e4fbfb6586ce7))
* **swingset-liveslots:** copy helper files to new liveslots package ([be7229f](https://github.com/Agoric/agoric-sdk/commit/be7229f7217c1ecc523069a57945a372f4a1e00e))
* **swingset-liveslots:** update imports of helper files ([0b4b38a](https://github.com/Agoric/agoric-sdk/commit/0b4b38a1f9efbb3e1e860172b0b802548d18ae2e))
