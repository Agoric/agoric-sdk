# Changelog

All notable changes to this project will be documented in this file.

See [Conventional Commits](https://conventionalcommits.org/) for commit guidelines.

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
