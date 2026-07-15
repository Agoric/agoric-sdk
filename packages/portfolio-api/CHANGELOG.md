# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0-u23.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/portfolio-api@0.3.0-u23.0...@agoric/portfolio-api@0.3.0-u23.1) (2026-07-15)

**Note:** Version bump only for package @agoric/portfolio-api

## 0.3.0-u23.0 (2026-04-27)

### Features

* add accountStateByChain to vstorage ([cf98d80](https://github.com/Agoric/agoric-sdk/commit/cf98d80e62d2e8caf24c27ee012a8e5602c78e0a))
* add protocols ([19dd899](https://github.com/Agoric/agoric-sdk/commit/19dd899b290d1531deec06d584c865657454194d))
* export constants ([54b2cb6](https://github.com/Agoric/agoric-sdk/commit/54b2cb6d842ec23487540bce0c397871a95ec9d4))
* export ymax-machine model ([3d43aa4](https://github.com/Agoric/agoric-sdk/commit/3d43aa411ccda38459bf49904f600d4a2df4e261))
* invitation maker names in portfolio-api ([b2d9f0d](https://github.com/Agoric/agoric-sdk/commit/b2d9f0d79e1c1e3e29392e3ef9e19b6f57057e6e))
* openPortfolioFromEVM ([b771e8d](https://github.com/Agoric/agoric-sdk/commit/b771e8dbadbc1bb4f70c3ac62c3cf7d3dc79beb9))
* **portfolio-api:** Add type checkers for EVM deposit/withdraw place refs ([184ccf2](https://github.com/Agoric/agoric-sdk/commit/184ccf225ade532f2513f7ff0bfad2b297696edc)), closes [#12308](https://github.com/Agoric/agoric-sdk/issues/12308)
* **portfolio-api:** Extend types and shapes for EVM deposits and withdrawals ([#12307](https://github.com/Agoric/agoric-sdk/issues/12307)) ([9b77fff](https://github.com/Agoric/agoric-sdk/commit/9b77fff24571dde366d6f2b83db5e80444f2e202))
* **portfolio-api:** FundsFlowPlan, StatusFor['flowOrder'] ([458eb2e](https://github.com/Agoric/agoric-sdk/commit/458eb2e52cee649657961fc480aa9444db58e718))
* **portfolio-api:** update permit details extraction logic ([ff4a51d](https://github.com/Agoric/agoric-sdk/commit/ff4a51d8142e4ac173430fe717ceb3ca63da7bd6))
* **portfolio-api:** Withdraw EIP-712 message ([0205ba7](https://github.com/Agoric/agoric-sdk/commit/0205ba7899494db91ccae8c70c29e284ff494fa7))
* **portfolio-contract:** publish NFA ([0b35737](https://github.com/Agoric/agoric-sdk/commit/0b35737b0dab7066563726a1a4a959e59665c079))
* **portfolio-contract:** verify that signer is withdraw account ([0c00ea2](https://github.com/Agoric/agoric-sdk/commit/0c00ea21eadb29df08f2017f52c4b08a31dc8bf6))
* **portfolio:** add evm wallet message helpers ([c433aa7](https://github.com/Agoric/agoric-sdk/commit/c433aa7756130e2eebcee64e1ec2018736aa8885))
* **portfolio:** bind standalone evm messages to deposit factory contract ([409854d](https://github.com/Agoric/agoric-sdk/commit/409854dba05d2d4128a5ade03854f3cfad596237))
* portfolios vstorage in TypedPublished ([7eb22d5](https://github.com/Agoric/agoric-sdk/commit/7eb22d5c8ba2ad5916724acbb2d8095a96c5ecab))
* publish deadline in EIPMessageUpdate ([8d0b6e9](https://github.com/Agoric/agoric-sdk/commit/8d0b6e911fd2cd570f1f70908fcb8e1eeee660d5))
* publish result of EVM Message ([353e505](https://github.com/Agoric/agoric-sdk/commit/353e50563cd8000519fcaece43f1a57ef3372e2b))
* PublishedTx in TypedPublished ([b49622d](https://github.com/Agoric/agoric-sdk/commit/b49622d29f46fd4ecb3811bf1428a244caa3b43c))
* require chainId and verifying contract in eip712 domain ([2f5b8c6](https://github.com/Agoric/agoric-sdk/commit/2f5b8c638e9cd55a251fb63c634f2d3dd10914ae))
* type guards ([73f4588](https://github.com/Agoric/agoric-sdk/commit/73f4588f5c2e6ebe15a577f105df02943f720202))
* **types:** LocalChainAccountRef, InterChainAccountRef ([287e4db](https://github.com/Agoric/agoric-sdk/commit/287e4db772c6e08e1412da8c2e9eff40a6b49cbd))
* vetted routed-based accounts record their factory ([79b336d](https://github.com/Agoric/agoric-sdk/commit/79b336d97e269e81b2eb1416ebff6e3354edaccb))
* visualization of ymax state ([212c2c1](https://github.com/Agoric/agoric-sdk/commit/212c2c1c8df4c1843bf379b5b507f4c8b1ce4246))
* visualize concurrent steps ([bace1b7](https://github.com/Agoric/agoric-sdk/commit/bace1b70d2f8b7728bec0bd5d169ad981100d80b))
* wire rebalance and simpleRebalance in EVM Wallet handler ([b980fa1](https://github.com/Agoric/agoric-sdk/commit/b980fa1e9f8917eccdb80770aed912f5cf89c1cb))

### Bug Fixes

* bad .ts export in portfolio-api ([cefa0e9](https://github.com/Agoric/agoric-sdk/commit/cefa0e975d3a0e1612bf6b8f65b0bdac3fe03f51))
* delete .ts files shadowing .d.ts ([8bf508b](https://github.com/Agoric/agoric-sdk/commit/8bf508bd3994f0d7207ce4e3f8bcfbb42ecca1d4))
* don't include dust accounts in graph solving ([c234900](https://github.com/Agoric/agoric-sdk/commit/c2349007574b792990ae7650291c7ee7af24e820))
* obsolete netTransfers - positive assumption is faulty ([8172694](https://github.com/Agoric/agoric-sdk/commit/8172694d9234c4e00fef6d328eb1eca5ba1fdc80))
* **portfolio-contract:** `phases` vstorage lists all serial txes ([0f7aac2](https://github.com/Agoric/agoric-sdk/commit/0f7aac2c8eb5106f7129af08ccccc1447154dfe3))
* **portfolio-contract:** enforce evm withdraw of usdc token ([1158e9a](https://github.com/Agoric/agoric-sdk/commit/1158e9a057cd05f20bab8adf9ee9eda3c69855c2))
* **portfolio-contract:** Make links for deposit/withdraw nodes unidirectional ([7b45824](https://github.com/Agoric/agoric-sdk/commit/7b45824d916bf2d7b9d54084d7deac04befa0b18)), closes [#12308](https://github.com/Agoric/agoric-sdk/issues/12308)
* **portfolio-contract:** rework the `pendingTx` shapes ([5a1388a](https://github.com/Agoric/agoric-sdk/commit/5a1388a00b5dfe8e512c57b9b44acdf3252136ca))
* **types:** SupportedChain includes Axelar chains ([2c0a4ef](https://github.com/Agoric/agoric-sdk/commit/2c0a4ef7b03643e5110960895fa1ddfb9ae2bfe1))

### Performance Improvements

* **portfolio-api:** Promote the Permit2 `witnessTypeString` builder to higher scope ([a1137a9](https://github.com/Agoric/agoric-sdk/commit/a1137a969cd6eac663c70c77f2e99493bdfdc880))

## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/portfolio-api@0.2.0-u22.2...@agoric/portfolio-api@0.2.0) (2026-04-02)

**Note:** Version bump only for package @agoric/portfolio-api

## [0.2.0-u22.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/portfolio-api@0.2.0-u22.1...@agoric/portfolio-api@0.2.0-u22.2) (2025-09-09)

**Note:** Version bump only for package @agoric/portfolio-api

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/portfolio-api@0.2.0-u22.0...@agoric/portfolio-api@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @agoric/portfolio-api

## 0.2.0-u22.0 (2025-09-08)

### Features

* export constants ([54b2cb6](https://github.com/Agoric/agoric-sdk/commit/54b2cb6d842ec23487540bce0c397871a95ec9d4))

# Change Log
