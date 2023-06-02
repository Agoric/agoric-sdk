# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.4.1...@agoric/casting@0.4.2) (2023-06-02)

**Note:** Version bump only for package @agoric/casting





### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.4.0...@agoric/casting@0.4.1) (2023-05-24)

**Note:** Version bump only for package @agoric/casting





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.3.2...@agoric/casting@0.4.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)
* rename 'fit' to 'mustMatch'

### Features

* **internal:** makeFakeStorageKit supports "get" and "entries" ([6a69aab](https://github.com/Agoric/agoric-sdk/commit/6a69aab5cb54faae5af631bbc2281e4fc4ede8e0))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **casting:** handle noData value encoding ([530bc41](https://github.com/Agoric/agoric-sdk/commit/530bc41854cc7f5e5749e97e87fabc6163a17864))
* assertNetworkConfig ([9762b19](https://github.com/Agoric/agoric-sdk/commit/9762b19b25ebcb4678faa389d39c4bab91e0c25c))
* getEachIterable skip height fetch ([77b1bb5](https://github.com/Agoric/agoric-sdk/commit/77b1bb589e90462bc7514347b8c62c236d72922e))
* getLatestIterable skip height fetch ([aff3354](https://github.com/Agoric/agoric-sdk/commit/aff335417d9553182d50a5b84a4aa7c7fb6ae430))
* getReverseIterable skip height fetch ([edbc8ec](https://github.com/Agoric/agoric-sdk/commit/edbc8ec2fab4a71e2675f5cc608f25d27b43b524))
* vstorageKeySpecToPath ([9db1fbb](https://github.com/Agoric/agoric-sdk/commit/9db1fbb1328c28282db972b3e130e2ee3515b87d))


### Bug Fixes

* **casting:** use new subscriber tools ([cb1f739](https://github.com/Agoric/agoric-sdk/commit/cb1f739c36c28befa2ab097bfc9b86686dbe57c3))
* require chainName ([5c5e661](https://github.com/Agoric/agoric-sdk/commit/5c5e661f444add3e1544c931c475a3a266a080de))


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.3.3...@agoric/casting@0.3.4) (2023-02-17)

**Note:** Version bump only for package @agoric/casting





### [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.3.2...@agoric/casting@0.3.3) (2022-12-14)

**Note:** Version bump only for package @agoric/casting





### [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.3.1...@agoric/casting@0.3.2) (2022-10-18)

**Note:** Version bump only for package @agoric/casting





### [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.3.0...@agoric/casting@0.3.1) (2022-10-08)

**Note:** Version bump only for package @agoric/casting





## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/casting@0.2.0...@agoric/casting@0.3.0) (2022-10-05)


### Features

* **cli:** show status of invitations ([8506e6d](https://github.com/Agoric/agoric-sdk/commit/8506e6d87ef331e781c9d2e2251fdcf48e784e04))



## 0.2.0 (2022-09-20)


### ⚠ BREAKING CHANGES

* **casting:** enable an implicit default follower of the local chain

### Features

* **casting:** enable an implicit default follower of the local chain ([41d4c0c](https://github.com/Agoric/agoric-sdk/commit/41d4c0c0326ec71ede4a6a5b101ae5c8a4339aa0))
* **casting:** provide reverse iteration ([65906f5](https://github.com/Agoric/agoric-sdk/commit/65906f553908ae5200a96307e78ec505060cb43b))
* **casting:** Update to consume stream cells ([35db0da](https://github.com/Agoric/agoric-sdk/commit/35db0daed7f8315222fa87cbf9c50e4e2ee8d225)), closes [#5366](https://github.com/Agoric/agoric-sdk/issues/5366)
* **wallet:** some feedback when no smart wallet ([8057c35](https://github.com/Agoric/agoric-sdk/commit/8057c35d2a89b9d80d31c1da10279c248b3c6e68))
* **wallet-connection:** Connect dapp directly to wallet UI ([#5750](https://github.com/Agoric/agoric-sdk/issues/5750)) ([1dd584b](https://github.com/Agoric/agoric-sdk/commit/1dd584b195212705b1f74a8c89b7f3f121640e41))
* contract for single on-chain wallet ([0184a89](https://github.com/Agoric/agoric-sdk/commit/0184a89403a3719f21dc61de37865512cdc819ae))


### Bug Fixes

* **casting:** Align cosmjs deps ([0ba7a1f](https://github.com/Agoric/agoric-sdk/commit/0ba7a1f7a18d4f83afa04b3637f432fdd72f3cd8))
* **casting:** correct backoff timer logic ([1b41ef5](https://github.com/Agoric/agoric-sdk/commit/1b41ef56bec54f89296376a0677c421f66baabba))
* **casting:** implement getReverseIterable ([7f5a791](https://github.com/Agoric/agoric-sdk/commit/7f5a79170a11560567406ebb02234dbef20ca07a))
* **casting:** iterateLatest erroneously adapted getEachIterable ([b1937cf](https://github.com/Agoric/agoric-sdk/commit/b1937cf8fbd8685b5078ad5d312b4aa1b173a9ae))
* **casting:** Update each and latest iterators for stream cells. ([231d37c](https://github.com/Agoric/agoric-sdk/commit/231d37c4cd87785c20b70eb270384a50e010b3b7))
* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* makePublishKit ([#5435](https://github.com/Agoric/agoric-sdk/issues/5435)) ([d8228d2](https://github.com/Agoric/agoric-sdk/commit/d8228d272cfe18aa2fba713fb5acc4e84eaa1e39))
