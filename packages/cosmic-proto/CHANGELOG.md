# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.4.1-u16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-proto@0.3.0...@agoric/cosmic-proto@0.4.1-u16.0) (2024-07-02)


### Features

* base64 without ambient authority ([537a0e3](https://github.com/Agoric/agoric-sdk/commit/537a0e3a4e3df2185c8f125ea21d1e591d94ab29))
* **cosmic-proto:** add icq/v1 proto + codegen for @agoric/orchestration ([910e038](https://github.com/Agoric/agoric-sdk/commit/910e038069d01b333b5a536ea27f734cd64b3eae)), closes [#9072](https://github.com/Agoric/agoric-sdk/issues/9072)
* **cosmic-proto:** add JsonSafe and RequestQueryJson types ([fe9dab4](https://github.com/Agoric/agoric-sdk/commit/fe9dab4dffd87c8026eea1fea9115a2cb925d344)), closes [#9072](https://github.com/Agoric/agoric-sdk/issues/9072)
* **cosmic-proto:** add toRequestQueryJson and typeUrlToGrpcPath ([ea8e6d3](https://github.com/Agoric/agoric-sdk/commit/ea8e6d3b6cd8a01776cc42ddfca4dc65b0c0eec3))
* **cosmic-proto:** add vstorage query ([97b1678](https://github.com/Agoric/agoric-sdk/commit/97b167863343955944faef6505ed11ab7119f4e3))
* **cosmic-proto:** export distribution ([17c2932](https://github.com/Agoric/agoric-sdk/commit/17c293261d3b218eaf83f34ec2ae042ec7d1b1e2)), closes [endojs/endo#2265](https://github.com/endojs/endo/issues/2265)
* **cosmic-proto:** include ibc-go in update-protos.sh ([c7b0f27](https://github.com/Agoric/agoric-sdk/commit/c7b0f278813ab7975eafa0b8f1161e5a0fed29f0))
* cosmos protos ([f67add7](https://github.com/Agoric/agoric-sdk/commit/f67add77fd38b02555e644772f600cd59f5f1970))
* ignore prettier stdout ([72b0795](https://github.com/Agoric/agoric-sdk/commit/72b0795b82efd62b3a26fb417dfd8c16b3c2dd39))
* **lca:** undelegate ([a18d21c](https://github.com/Agoric/agoric-sdk/commit/a18d21ce5bf539099171f2e8da3bbab6d33a352e))
* **localchain:** add `.transfer()` helper to LocalChainAccount ([fd11145](https://github.com/Agoric/agoric-sdk/commit/fd111458355c46cf34536991e37b4a316ad09898))
* **orchestration:** add support for queries (icq/v1) ([79b5d0f](https://github.com/Agoric/agoric-sdk/commit/79b5d0f61f0c11b00e51832b7edf3922df8f51c6))
* **orchestration:** send message from ica ([764e4a8](https://github.com/Agoric/agoric-sdk/commit/764e4a86a5f27ca5a1478e6111b3440dcc2de3f2))
* **orchestration:** stakeAtom query balance ([9f0ae09](https://github.com/Agoric/agoric-sdk/commit/9f0ae09e389f1750c9e550d5e6893460d1e21d07))
* SES compatibility ([b7bbc85](https://github.com/Agoric/agoric-sdk/commit/b7bbc8516d1b749c65d1c42c8ff6018eb2991313))
* typedJson ([cd151b7](https://github.com/Agoric/agoric-sdk/commit/cd151b71d5a66d4a86e04a1af104fca277058836))
* **types:** ResponseTo by template ([68fcfac](https://github.com/Agoric/agoric-sdk/commit/68fcfac22055670b375ec1dac9d2eb31d141ec7b))
* **types:** utility for Base64 encoding Any json ([c77c1be](https://github.com/Agoric/agoric-sdk/commit/c77c1be9e6e158dd276ea997772dac061d3cf4ec))


### Bug Fixes

* **cosmic-proto:** add missing `cosmos_proto` dep ([651775f](https://github.com/Agoric/agoric-sdk/commit/651775f4e38ddbee6cb1961a01b57f49e73984ad))
* **cosmic-proto:** do not git ignore all generated files ([83a9d23](https://github.com/Agoric/agoric-sdk/commit/83a9d23080156882af32247723dda452db8a469e))
* default value handling (telescope 1.4.12 -> 1.5.1) ([1469ce7](https://github.com/Agoric/agoric-sdk/commit/1469ce7439a74afe6e6ae097e4deaa84de305a97))
* ensure script main rejections exit with error ([abdab87](https://github.com/Agoric/agoric-sdk/commit/abdab879014a5c3124ebd0e9246995ac6b1ce6e5))



## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-proto@0.2.1...@agoric/cosmic-proto@0.3.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* build .d.ts instead of .ts

### Features

* **cosmic-proto:** add state-sync artifacts proto ([4cc25f5](https://github.com/Agoric/agoric-sdk/commit/4cc25f56ba9e967039c2dff2cbb566eafb37aaea))
* build .d.ts instead of .ts ([b91d91a](https://github.com/Agoric/agoric-sdk/commit/b91d91a2651ccf5bbc4827fceca10fe04405c1b9))
* **cosmic-proto:** add query.proto ([b04636b](https://github.com/Agoric/agoric-sdk/commit/b04636b930dd633438983b4a5666307766687367))


### Bug Fixes

* cosmic-proto exports ([36a1f8c](https://github.com/Agoric/agoric-sdk/commit/36a1f8ca1c52330c3065eb84dddde1550fee6b3f))
* exports map ([884a90f](https://github.com/Agoric/agoric-sdk/commit/884a90f101808f31d3f35b9d2b04fdcecfcc4bfd))
* include swingset/* file for export ([6bfb278](https://github.com/Agoric/agoric-sdk/commit/6bfb278a695963e96f0bf1d37f3181a91286b065))



### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-proto@0.2.0...@agoric/cosmic-proto@0.2.1) (2022-10-05)

**Note:** Version bump only for package @agoric/cosmic-proto





## 0.2.0 (2022-09-20)


### Features

* **cosmic-proto:** Implement swingset/msgs ([19c9f3f](https://github.com/Agoric/agoric-sdk/commit/19c9f3f0c933cc304d0dea6ee6d9aa28b27b008e))
