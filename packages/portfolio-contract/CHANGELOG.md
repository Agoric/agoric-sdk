# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-contract@0.2.0-u22.0...@aglocal/portfolio-contract@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @aglocal/portfolio-contract

## 0.2.0-u22.0 (2025-09-08)

### Features

* add claim rewards functions for aave and compound ([25eb411](https://github.com/Agoric/agoric-sdk/commit/25eb4113a20fc6d1a9ae777c290ded8f4d0d14cf))
* add environment-based axelar chain configuration ([39ad0af](https://github.com/Agoric/agoric-sdk/commit/39ad0afb9b0551df57b5ad67c5aef3270239fdb7))
* add protocol for beefy ([e90b59d](https://github.com/Agoric/agoric-sdk/commit/e90b59d9c0b911d71c38054468d063d14396c727))
* adding a cctp status to vstorage so it is readable by ymax planner ([8226385](https://github.com/Agoric/agoric-sdk/commit/8226385187c6c146b13fdf0c7e7cf3b5b4f12ff0))
* bump poc token from 24/25 to 26 ([0bb4608](https://github.com/Agoric/agoric-sdk/commit/0bb46081e143a63718c4e781a3844af85a5f033b))
* CCTP tx confirmation handler ([568e80b](https://github.com/Agoric/agoric-sdk/commit/568e80bb627cafebedc0c70d42d01374a803ada4))
* deploy funds to aave and compound ([526b4ab](https://github.com/Agoric/agoric-sdk/commit/526b4abfaadeb719155726f3c089b0429a84c852))
* for Noble Dollar, client can give USDN out with USDC in ([4546225](https://github.com/Agoric/agoric-sdk/commit/454622526d38a3015e9a70023e750956b0a296d1))
* gmp calls for aave ([bbeb5c2](https://github.com/Agoric/agoric-sdk/commit/bbeb5c2f601bcbafe6fb60fe5f3bea56869735db))
* handle GMP and CCTP transactions off-chain ([#11752](https://github.com/Agoric/agoric-sdk/issues/11752)) ([7cb1020](https://github.com/Agoric/agoric-sdk/commit/7cb1020532ba8a386b4e1c37c0cd4f62a1d13f7e)), closes [#11709](https://github.com/Agoric/agoric-sdk/issues/11709)
* limit steps to 12 ([a7dad02](https://github.com/Agoric/agoric-sdk/commit/a7dad02f7b1d356d9941f9f6ec9805aba855b03b))
* pass axelar gmp addresses via privateArgs ([9065bdc](https://github.com/Agoric/agoric-sdk/commit/9065bdc4a400be6722404e01cf3ff88eb3475608))
* **portfolio-contract:** gate access with a PoC token ([ad72c75](https://github.com/Agoric/agoric-sdk/commit/ad72c753cb493929ca85c668409f575ec65a53c2))
* **portfolio-contract:** offer specifies steps; BLD for GMP fees ([1535efa](https://github.com/Agoric/agoric-sdk/commit/1535efaa97abca5bc8f28b506913fdf25ba48330))
* **portfolio-contract:** open portfolio w/USDN position ([2fa1c42](https://github.com/Agoric/agoric-sdk/commit/2fa1c425fc472b5d2f682392eccc4263a5113710))
* **portfolio-contract:** publish portfolios, positions, flows ([9f32a25](https://github.com/Agoric/agoric-sdk/commit/9f32a25dd6ea6bc7dd8fe57f6965ee81aef9d5c3))
* **portfolio-contract:** rebalance: open USDN or Aave position ([3e58d66](https://github.com/Agoric/agoric-sdk/commit/3e58d66f35cde5e0b6184ab9b32c1a815cac48d1))
* **portfolio-contract:** set target allocation ([d218c07](https://github.com/Agoric/agoric-sdk/commit/d218c0752993cf5f6c7d88bbb7ce0c26dd46c29a))
* **portfolio-contract:** typed patterns for vstorage ([48dbf68](https://github.com/Agoric/agoric-sdk/commit/48dbf683dd94698aad384bccb28f2b3e1c5a7c74))
* **portfolio-contract:** use CCTP TokenMessenger to go EVM->Noble ([89ab245](https://github.com/Agoric/agoric-sdk/commit/89ab245b6d67cdf06e238631c2bba5a6ea2a5b34))
* publish axelar chains data on agoricNames ([75f28bc](https://github.com/Agoric/agoric-sdk/commit/75f28bc8df97687761e1fc456bf94bc13b82d024))
* send tokens to EVM chain via CCTP ([2e08984](https://github.com/Agoric/agoric-sdk/commit/2e08984acd045825725c60f88d608f0c47c0f0d3))
* withdraw from USDN ([411bde1](https://github.com/Agoric/agoric-sdk/commit/411bde16ea9f7a07aad117b14de78e701c114075))
* ymax contract restartable ([0d237a3](https://github.com/Agoric/agoric-sdk/commit/0d237a39cfd8c42978126feb5871f973f3eea53f))
* ymax planner ([43ae048](https://github.com/Agoric/agoric-sdk/commit/43ae04896dc7b08baa0daacd56cb84741ef114d1))

### Bug Fixes

* align vstorage posted data with expected resolver handler status ([#11815](https://github.com/Agoric/agoric-sdk/issues/11815)) ([fea7786](https://github.com/Agoric/agoric-sdk/commit/fea77864ae4355e4d7aa750e3008ad4899949c14)), closes [#11752](https://github.com/Agoric/agoric-sdk/issues/11752)
* correct contract addresses from gmp calls ([e30c43e](https://github.com/Agoric/agoric-sdk/commit/e30c43e5fe48258e9e268f65ca675b37663c5966))
* decoding address from ethereum ([1ed9435](https://github.com/Agoric/agoric-sdk/commit/1ed9435a9d4eb6c74bc0e760346a19077d71e49e))
* ensure unique contract addresses per chain ([69e3649](https://github.com/Agoric/agoric-sdk/commit/69e36494e62bf5774b73f04e91d7519a43bec78b))
* make ethereum value capitalized ([17526bc](https://github.com/Agoric/agoric-sdk/commit/17526bcdea2c940f7bdbe294d7de0b511a749610))
* PoolKeyShape extensibility ([bd7fa4b](https://github.com/Agoric/agoric-sdk/commit/bd7fa4bf4b23e5825de179200e30974e061237df))
* **portfolio-contract:** don't make new storage nodes on each update ([b10a8c1](https://github.com/Agoric/agoric-sdk/commit/b10a8c15a168dc7b527f83015c2b44d14204052b))
* rebalance handles stepFlow failure ([9bcc720](https://github.com/Agoric/agoric-sdk/commit/9bcc720aeba4a303a2ae33c9d91eaf7a61920153))
* **test:** mock vowTools.watch() and update aave test ([abbcc3a](https://github.com/Agoric/agoric-sdk/commit/abbcc3a6153fea04fed3fe5625e4fbf1de2082a9))
* **test:** update receiveUpCall and enable skipped tests ([a4b7725](https://github.com/Agoric/agoric-sdk/commit/a4b7725898b3eb2c9d6db9327e98c09fab7067a7))
* use `Codec` and `CodecHelper` where appropriate ([f268e4a](https://github.com/Agoric/agoric-sdk/commit/f268e4ac6f52e8bf07f858d051d05ef8d8fac9b3))
* use buildGasPayload for remote account creation ([#11768](https://github.com/Agoric/agoric-sdk/issues/11768)) ([9608fa8](https://github.com/Agoric/agoric-sdk/commit/9608fa87911913da957f5cf09858051e39588281))
* use GMP type 2 to set outbound/inbound gas for GMP calls ([eac634d](https://github.com/Agoric/agoric-sdk/commit/eac634d1c349782c8b851b7e83cc7c66c1aa98da))

# Changelog

All notable changes to this project will be documented in this file.

See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.

## [0.1.3-alpha] 2025-08-18

### Features

 - beefy protocol
 - claim rewards for aave and compound
 - set target allocation
 - portfolio depositAddress
 - ymax0.portfolios vstorage key updates on creation
 - planning tools for ymax planner
 - ymax contract restartable

### Notes

 - perf: don't make new storage nodes on each update
 - docs: create sequence diagrams for several user stories
 - pass axelar gmp addresses via privateArgs
 - docs to articulate planner's responsibilities
 - refactor: portfolio constants into new API package
 - Commit: [`65740e1`](https://github.com/Agoric/agoric-sdk/commit/65740e135c794987d86381deef225a83eefcdefd)

[0.1.3-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1.3-alpha

## [0.1.1-alpha] 2025-07-30

_changes to portfolio-deploy package only_

- Commit: [`8e37faa `](https://github.com/Agoric/agoric-sdk/commit/8e37faaf5265f55433fc80e67c8785a66480c7f4)

[0.1.1-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1.1-alpha

## [0.1.0-alpha] - 2024-07-15

### Features

- Initial portfolio contract implementation for diversified stablecoin yield management
- Support for multiple yield protocols (USDN, Aave, Compound)
- Cross-chain portfolio rebalancing via Noble and Axelar GMP
- Portfolio position tracking and flow logging to vstorage
- Continuing invitations for ongoing portfolio management
- Build system with governance proposal generation
- Access token setup for portfolio permissions

### Notes
- This is a proof-of-concept alpha release
- Contract name: `ymax0`
- Commit: [`f741807`](https://github.com/Agoric/agoric-sdk/commit/f741807aff5929acabc007380c4a057882a35147)

[0.1.0-alpha]: https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.1-alpha
