# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u22.0 (2025-09-08)

### ⚠ BREAKING CHANGES

* drop types-index export
* synchronous RPC client makers
* url --> makeAbciQuery
* remove agoricNames from VstorageKit

### Features

* client-utils package ([50af71f](https://github.com/Agoric/agoric-sdk/commit/50af71f2b2c3a1eee9da62dbd87c9cda0521979b))
* **client-utils:** identity-preserving marshaller ([845bc90](https://github.com/Agoric/agoric-sdk/commit/845bc9083c45998efa5287165b756d3bacf9e0f0)), closes [#10491](https://github.com/Agoric/agoric-sdk/issues/10491)
* **client-utils:** identity-preserving marshaller ([3fe77c5](https://github.com/Agoric/agoric-sdk/commit/3fe77c5b86af4f61018680428382ae6ca84302df)), closes [#10491](https://github.com/Agoric/agoric-sdk/issues/10491)
* **client-utils:** let smartWalletKit skip agoricNames ([b31282c](https://github.com/Agoric/agoric-sdk/commit/b31282c7d90499e34ca8ab29b3fc76371330b066))
* **client-utils:** makeIntervalIterable, makeBlocksIterable ([16585a3](https://github.com/Agoric/agoric-sdk/commit/16585a30e0b4b7db62905cd1b91b648be2ccb85b))
* export makeStargateClient ([186d268](https://github.com/Agoric/agoric-sdk/commit/186d26811f25224f0b9f216e79ee3a47c0768f61))
* expose networkConfig from vsk ([c8ae718](https://github.com/Agoric/agoric-sdk/commit/c8ae71884ae2221ddbafa492ec5e0c9facde882f))
* fetchEnvNetworkConfig ([9bdba57](https://github.com/Agoric/agoric-sdk/commit/9bdba57d18672ef8d40b8a38cb54a082e1b89e50))
* getCurrentWalletRecord ([2740748](https://github.com/Agoric/agoric-sdk/commit/27407486238062c902b0f3552dad77bf5a44b22d))
* handle JSON parsed ([9088d7b](https://github.com/Agoric/agoric-sdk/commit/9088d7b95b0c207f3ebaa1ed551558837e9ad537))
* makeAgoricQueryClient ([58baded](https://github.com/Agoric/agoric-sdk/commit/58badeda2d5d562ff7dfff76dd26d3ff9c8d855b))
* makeStargateClientKit ([b48dc75](https://github.com/Agoric/agoric-sdk/commit/b48dc7558808c8f3542cfb2f8312c319ebaca432))
* makeWalletUtils wo/spawn ([20083ae](https://github.com/Agoric/agoric-sdk/commit/20083ae6cf3b479ca68aa7b81415157aceca38fe))
* ocap makeStargateClient ([c8f7407](https://github.com/Agoric/agoric-sdk/commit/c8f7407903078acaccb3a97f9ff722d92e51eee8))
* one marshaller per WalletUtils ([b141ce6](https://github.com/Agoric/agoric-sdk/commit/b141ce6e47ede661ff4e6777390665238c0e1f00))
* readStorage ([9622a05](https://github.com/Agoric/agoric-sdk/commit/9622a05214123d4ef49673e1c08637a1bbfc3364))
* sendBridgeAction ([0004a1a](https://github.com/Agoric/agoric-sdk/commit/0004a1aaec644c326ab602db4dd1f33d84f836f4))
* SigningSmartWalletKit ([4a91276](https://github.com/Agoric/agoric-sdk/commit/4a912760755273f0d8cc677cb4c51d3b17c67425))
* SigningSmartWalletKit query tools ([110a8af](https://github.com/Agoric/agoric-sdk/commit/110a8af519807666754755708374fbc2d2ff8e5c))
* **sync-tools:** add method to wait until offer exited ([c9370f2](https://github.com/Agoric/agoric-sdk/commit/c9370f219ecdc196a274cfb8bab8de64b099345a))
* synchronous RPC client makers ([67bf50a](https://github.com/Agoric/agoric-sdk/commit/67bf50a1ca63eb5ba71085ed695f3a31be2e0967))
* **types:** fastUsdc.feeConfig ([6680e16](https://github.com/Agoric/agoric-sdk/commit/6680e168991bb46742743ce841c87e0e657aa9c1))
* **types:** TypedPublished ([88939bf](https://github.com/Agoric/agoric-sdk/commit/88939bfb60e2e3480b1f8f6d4dca7f64cd668b4a))
* **types:** vstorage TransactionRecord ([d8aa376](https://github.com/Agoric/agoric-sdk/commit/d8aa3764d87e13252fe39239d3bab57b9b0f55a0))
* **types:** ymax0.portfolios ([c2b9b02](https://github.com/Agoric/agoric-sdk/commit/c2b9b02e5c048cec63036248062500cfd1130ff5))
* vstorage without instance binding ([2c4e2e3](https://github.com/Agoric/agoric-sdk/commit/2c4e2e3cbfe6a2bfad77f908abd1424081031464))
* VstorageKit ([71486d7](https://github.com/Agoric/agoric-sdk/commit/71486d714cfa8f0393fbec7731dca71d1a342a1c))
* VstorageKit readPublished ([e48c53c](https://github.com/Agoric/agoric-sdk/commit/e48c53c5db307aa5ddcb2703c3afa5f846d5beca))

### Bug Fixes

* **client-utils:** only call `fetch` as a function, not a method ([#10671](https://github.com/Agoric/agoric-sdk/issues/10671)) ([fbae24c](https://github.com/Agoric/agoric-sdk/commit/fbae24ccaff7b911a2ef72e1c47434e6dfd73d9f))
* **client-utils:** Retry at least every other interval ([fd9394b](https://github.com/Agoric/agoric-sdk/commit/fd9394b33ed9f12e229e9914d7efe3ca10980f0c))
* **client-utils:** update `abci_query` from `custom/vstorage/data` ([533f7fe](https://github.com/Agoric/agoric-sdk/commit/533f7fe1830f06f95409ab25134e52f711d06688))
* **client-utils:** Vstorage client utility misreports values in non-chronological order ([#11616](https://github.com/Agoric/agoric-sdk/issues/11616)) ([11eb408](https://github.com/Agoric/agoric-sdk/commit/11eb408c8ae129e3460620e4bcdcb53074961500))
* sync-tools logging ([46d54bf](https://github.com/Agoric/agoric-sdk/commit/46d54bf4ee3e40d63106f9a8c1fa59c4ce6a4aa4))
* use `Codec` and `CodecHelper` where appropriate ([f268e4a](https://github.com/Agoric/agoric-sdk/commit/f268e4ac6f52e8bf07f858d051d05ef8d8fac9b3))

### Miscellaneous Chores

* drop types-index export ([ee635ed](https://github.com/Agoric/agoric-sdk/commit/ee635edfe86834802276affe1c2c13d17fcc3fd8))
* remove agoricNames from VstorageKit ([1c69d39](https://github.com/Agoric/agoric-sdk/commit/1c69d39c6b5571e8501cd4be8d32e3d1bd9d3844))

### Code Refactoring

* url --> makeAbciQuery ([e2ef480](https://github.com/Agoric/agoric-sdk/commit/e2ef480f4ececbf3bbb493bd83dbead88a409da6))

# Change Log
