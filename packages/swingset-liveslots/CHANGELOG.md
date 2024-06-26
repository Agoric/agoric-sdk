# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.10.3-u16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-liveslots@0.10.2...@agoric/swingset-liveslots@0.10.3-u16.0) (2024-06-26)


### Features

* **liveslots:** virtual exo meta-ops ([#8779](https://github.com/Agoric/agoric-sdk/issues/8779)) ([af3ced9](https://github.com/Agoric/agoric-sdk/commit/af3ced91861731353e10a45e4eae63450f74a0ea))
* **vow:** VowShape, isVow ([#9154](https://github.com/Agoric/agoric-sdk/issues/9154)) ([db4d0ea](https://github.com/Agoric/agoric-sdk/commit/db4d0eab68a1d361ddbb6fe993ff0b9969a348e5))


### Bug Fixes

* add test for collection snapshot ([0ea5eb3](https://github.com/Agoric/agoric-sdk/commit/0ea5eb3ae77d5639bda7428e52c4d9c0fa8e4059))
* correct infelicities in virtual collection API implementation ([af5507b](https://github.com/Agoric/agoric-sdk/commit/af5507bfecaa8f76001c09f6a1a9c8ca2a4c58c1)), closes [#7632](https://github.com/Agoric/agoric-sdk/issues/7632)
* DEBUG harmony ([#8136](https://github.com/Agoric/agoric-sdk/issues/8136)) ([d2ea4b4](https://github.com/Agoric/agoric-sdk/commit/d2ea4b46b9efa61e97eec8711830d9fdd741ca55))
* incorporate refactored VRM into fakeVirtualSupport ([5641fb0](https://github.com/Agoric/agoric-sdk/commit/5641fb0effb0045e6ddefa64280ec54730a6b45a))
* kindlier error diagnostics on addAll ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5a6bf5d186f33137b3c9a113e3a232207))
* **liveslots:** cache.delete() does not return a useful value ([b5d53e8](https://github.com/Agoric/agoric-sdk/commit/b5d53e86c60397589ced0af9b71514ff03a4653f)), closes [#8752](https://github.com/Agoric/agoric-sdk/issues/8752)
* **liveslots:** promise watcher to cause unhandled rejection if no handler ([#9507](https://github.com/Agoric/agoric-sdk/issues/9507)) ([0de0c62](https://github.com/Agoric/agoric-sdk/commit/0de0c62165635fab1af443858544384f3170862b)), closes [#8596](https://github.com/Agoric/agoric-sdk/issues/8596) [/github.com/Agoric/agoric-sdk/pull/8596#discussion_r1414436455](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/8596/issues/discussion_r1414436455)
* **liveslots:** tolerate old version of vat-data package ([6addca0](https://github.com/Agoric/agoric-sdk/commit/6addca016507be8c6ea350a252a6cb7b27e4ee08))
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
