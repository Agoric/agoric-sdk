# Changelog

All notable changes to this project will be documented in this file.

See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.

## 70d307de7f (ymax-v0.3.2607-beta5) - 2026-07-27

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2607-beta5>

### Major Features

- Increment `policyVersion` on grants and auto-feature changes, and return settings-change records (#12820).
- Add the Morpho Huma USDC Main vault on Ethereum (#12822).

## e5ed322b93 (ymax-v0.3.2607-beta4) - 2026-07-23

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2607-beta4>

### Major Features

- Return and trace EVM portfolio-operation outcomes, including delegated agent keys and new auto-feature settings (#12815).
- Add the Morpho RockawayX USDC Yield vault on Ethereum (#12821).

## 5af4eb4c98 (ymax-v0.3.2607-beta3) - 2026-07-15

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2607-beta3>

### Major Features

- Open a portfolio and grant delegated control in one signed EIP-712 operation (#12805).
- Add the claim-rewards flow step (#12718).

## 53289febd4 (ymax-v0.3.2607-beta2) - 2026-07-08

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2607-beta2>

### Major Fixes

- Allow the delegated planner to add positions (#12532).
- Support planner flow steps exceeding 1 million USDC (#12786).
- Put reward-token swaps behind an experimental feature flag and remove the obsolete planner `submit` path (#12795, #12796).

## 1c76ea7d31 (ymax-v0.3.2607-beta1) - 2026-07-01

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2607-beta1>

### Major Features

- Deploy the open-with-auto-features, delegation-parameter, and published-flow-detail changes tagged but not deployed in `ymax-v0.3.2606-beta3` (#12753, #12757, #12761).
- Add three Morpho v2 vaults (#12767).

### Major Fixes

- Block deposits to Morpho Alpha USDC Core on Ethereum and reduce CCTP v2 link minimums to 1 USDC (#12764, #12768).

## 9d518832d4 (ymax-v0.3.2606-beta3) - 2026-06-26

_This release was tagged but never deployed._

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2606-beta3>

### Major Features

- Open a portfolio with auto-features in one operation (#12761).
- Publish flow agent designations and update delegation client method signatures (#12753, #12757).

## 776528eb7c (ymax-v0.3.2606-beta2) - 2026-06-16

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2606-beta2>

### Major Features

- Add auto-features and delegated, planner-driven auto-rebalancing (#12726).
- Support swapping reward tokens to USDC through 1inch (#12706).

## a1aec5d051 (ymax-v0.3.2606-beta1) - 2026-06-02

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2606-beta1>

### Major Features

- Add agent delegation with constrained portfolio permissions (#12688).
- Export target-balance computation and the production network for YMax data-service consumers (#12679).
- Restore direct CCTP v2 routes in the production network (#12684).

## 20cc70c10e (ymax-v0.3.2605-beta1) - 2026-05-21

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2605-beta1>

### Major Features

- Support managed relaying for direct EVM-to-EVM CCTP v2 transfers and publish `destinationCaller` in transaction details (#12664).
- Allow network instruments to suppress deposits or withdrawals (#12652).

### Major Fixes

- Exclude spurious planner flows and loosen solver tolerances for valid allocations (#12633, #12645, #12665).

## f5ece76299 (ymax-v0.3.2604-beta2) - 2026-04-14

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2604-beta2>

### Major Features

- Accept externally verified EVM smart-account signers (#12611).
- Support USDC allocations to a portfolio's Remote Account (#12599).

## cffb93b58c (ymax-v0.3.2604-beta1) - 2026-04-02

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2604-beta1>

### Major Features

- Support router-based Remote Accounts alongside legacy deposit-factory accounts (#12430).
- Enable vetted router upgrades for Remote Accounts (#12558).

## 2b24004f87 (ymax-v0.3.2603-beta1) - 2026-03-09

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2603-beta1>

### Major Features

- Require chain ID and verifying-contract validation for signed EVM operations, and publish per-chain EVM account state in preparation for router-based accounts (#12533).

### Major Fixes

- Await EVM account creation before continuing a CCTP-from-EVM flow (#12505).

## fb41e57239 (ymax-v0.3.2602-beta3) - 2026-02-20

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2602-beta3>

### Major Fixes

- Handle synchronous scheduler failures, avoid duplicate cascaded failures, and wait for running tasks before completion (#12487).
- Release pending EVM accounts when a flow starts (#12497).

## b5638874e8 (ymax-v0.3.2602-beta2) - 2026-02-18

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2602-beta2>

### Major Fixes

- Register CCTP-to-user transactions before advancing the asynchronous flow (#12465).
- Recover failed EVM account provisioning and block dependent steps until recovery completes (#12464, #12473).

## e1bdc1802e (ymax-v0.3.2602-beta) - 2026-02-13

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2602-beta>

### Major Features

- Remove Access-token requirement for `openPortfolio` offers (#12458).
- Support EVM `depositFactory` as Permit2 spender for deposit flows (#12418).
- Enable EVM “deposit more” flow path via `depositFactory` (#12431).
- Add CCTP v2 support in portfolio contract flows (#12415).

### Major Fixes

- Rework `pendingTx` metadata shapes for portfolio publication and tracking (#12394).
- Add `progressTracker` to `createAndDeposit` path so remote tx progress is tracked consistently (#12408).
- Allow `sourceAddress` in published `CCTP_TO_EVM` tx shape (#12442).
- Remove direct CCTP v2 routes from production network configuration (#12454).

## 16059a9bea (ymax-v0.3.2601-beta) - 2026-01-28

_retroactive release tag published 2026-02-13_

- Release: <https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.3.2601-beta>

### Major Fixes

- Ensure `evmHandler.withdraw` and `evmHandler.rebalance` execute their flows (wire through `executePlan`) (#12393).

## 86de279 - 2026-01-27

### Features

- evmHandler.rebalance implemented

### Known Issues

- evmHandler.withdraw does not execute flow (missing executePlan call)
- evmHandler.rebalance does not execute flow (missing executePlan call)

## a88dd7fc0c - 2026-01-26

### Features

- EVM deposit for existing portfolios (#12354)

### Known Issues

- evmHandler.withdraw does not execute flow (missing executePlan call)

## 88ad5332a7 - 2026-01-16

### Features

- Open portfolio from an EVM Wallet signed message (#12344)

## 0ea09b09ef - 2025-10-28

### Features

- Fast results from Ymax offers (#12168)

## 23d1f97 (v0.3.2) - 2025-10-14

### Features

- Resolve incoming CCTP using NFA (#12088)

## 5e7ffb9456 - 2025-10-07

_deployment from master_

## 5fa671fc11 - 2025-10-06

_deployment from master_

## c677bcefce - 2025-08-25

_deployment from master_

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
