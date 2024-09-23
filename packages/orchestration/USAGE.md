# Usage

Last verified 2024-09-06

This document describes some example contracts and test suites showing how to use Orchestration.

## Example contracts

See [`src/examples`](src/examples)


| Contract Name | Status | Description | Features Used |
|---------------|-------------|---------------|--------|
| [auto-stake-it](/packages/orchestration/src/examples/auto-stake-it.contract.js) | Ready 🟢 | Sets up an IBC hook to automatically stake tokens on a remote chain received at a deposit address. | - `LocalOrchestrationAccount`<br>- `CosmosOrchestrationAccount`<br>- `Vtransfer` (IBC Hooks) |
| [basic-flows](/packages/orchestration/src/examples/basic-flows.contract.js) | Ready 🟢 | Creates an account on a remote chain and returns a continuing offer with all platform-provided invitationMakers. | - `CosmosOrchestrationAccount`<br>- `LocalOrchestrationAccount`|
| [query-flows](/packages/orchestration/src/fixtures/query-flows.contract.js) | Ready 🟢 | Test fixture that enables querying account balances on local and remote chains. | - `Chain`<br>- `LocalOrchestrationAccount`<br>- `CosmosOrchestrationAccount`<br>- Interchain Queries |
| [send-anywhere](/packages/orchestration/src/examples/send-anywhere.contract.js) | Ready 🟢 | Allows sending payments (tokens) over IBC to another chain. | - `LocalOrchestrationAccoun`t<br>- `Vtransfer` (IBC Hooks) |
| [stake-bld](/packages/orchestration/src/examples/stake-bld.contract.js) | Ready 🟢 | Returns a `LocalOrchestrationAccount` that can perform staking actions. | - `LocalOrchestrationAccount` | Ready 🟢 |
| [stake-ica](/packages/orchestration/src/examples/stake-ica.contract.js) | Ready 🟢 | Returns a `CosmosOrchestrationAccount` that can perform staking actions. | - `CosmosOrchestrationAccount` | Ready 🟢 |
| [staking-combinations](/packages/orchestration/src/examples/staking-combinations.contract.js) | Ready 🟢 | Combines actions into a single offer flow and demonstrates writing continuing offers. | - `CosmosOrchestrationAccount`<br>- `CombineInvitationMakers` <br>- Continuing Offers |
| [swap](/packages/orchestration/src/examples/swap.contract.js) | Under Construction 🚧 | Demonstrates asset swapping on an external chain. | - `CosmosOrchestrationAccount`<br>- `ChainHub` |
| [unbond](/packages/orchestration/src/examples/unbond.contract.js) | Under Construction 🚧 | Undelegates tokens for an ICA and liquid stakes them. | - `CosmosOrchestrationAccount` |

## E2E Test Suites

| Test Name | Description | Contract Used | Methods Used |
|-----------|-------------|---------------|--------------|
| [account-balance-queries](/multichain-testing/test/account-balance-queries.test.ts) | Tests balance querying on local and remote chains, verifying empty balance return for newly created accounts. | query-flows | - `orch.getChain()`<br>- `orch.makeAccount()`<br>- `orchAccount.getBalance()`<br>- `orchAccount.getBalances()` |
| [auto-stake-it](/multichain-testing/test/auto-stake-it.test.ts) | Tests the creation of Local and Cosmos orchestration accounts and the auto-delegation process via IBC transfer. | auto-stake-it | - `orch.getChain()`<br>- `chain.makeAccount()`<br>- `localOrchAccount.monitorTransfers()`<br>- `cosmosOrchAccount.delegate()` |
| [basic-flows](/multichain-testing/test/basic-flows.test.ts) | Verifies the creation of a remote chain account and the generation of a continuing offer with various invitationMakers. | basic-flows | - `orch.getChain()`<br>- `orch.makeAccount()` |
| [chain-queries](/multichain-testing/test/chain-queries.test.ts) | Tests balance queries via ICQ and local chain queries, including error handling for chains with ICQ disabled. | query-flows | - `orch.getChain()`<br>- `chain.query()` |
| [ica-channel-close](/multichain-testing/test/ica-channel-close.test.ts) | Tests ICA account deactivation and reactivation, and verifies channel closure processes for ICA and Transfer channels. | basic-flows | - `orch.getChain()`<br>- `orch.makeAccount()`<br>- `orchAccount.deactivate()`<br>- `orchAccount.reactivate()` |
| [send-anywhere](/multichain-testing/test/send-anywhere.test.ts) | Tests the process of sending payments over IBC, including account creation, deposit, and transfer operations. | send-anywhere | - `orch.getChain()`<br>- `chain.getVBankAssetInfo()`<br>- `chain.makeAccount()`<br>- `localOrchAccount.makeAccount()`<br>- `localOrchAccount.deposit()`<br>- `localOrchAccount.transfer()`<br>- `zoeTools.localTransfer()` |
| [stake-ica](/multichain-testing/test/stake-ica.test.ts) | Verifies staking operations including delegation, reward withdrawal, and undelegation. | stakeIca | - `orch.getChain()`<br>- `orch.makeAccount()`<br>- `orchAccount.delegate()`<br>- `orchAccount.withdrawReward()`<br>- `orchAccount.undelegate()` |

## Not Yet Tested

| Contract Name | Not Yet Tested Features | 
|---------------|--------------------------|
| [basic-flows](/packages/orchestration/src/examples/basic-flows.contract.js) | - `.send()`, `sendAll()` methods and `Send`, `SendAll` invitations ([#9193](https://github.com/Agoric/agoric-sdk/issues/9193))<br>- `CosmosOrchAccount.transfer()`, `Transfer` invitation ([#9193](https://github.com/Agoric/agoric-sdk/issues/9193)) |
| [send-anywhere](/packages/orchestration/src/examples/send-anywhere.contract.js) | - Multi-hop (PFM) transfers (not implemented in contract) ([#10006](https://github.com/Agoric/agoric-sdk/issues/10006)) |
| [stakeIca](/packages/orchestration/src/examples/stake-ica.contract.js) | - Redelegate<br>- WithdrawRewards (plural) (not implemented)<br>- StakingQueries (not implemented) ([#10016](https://github.com/Agoric/agoric-sdk/issues/10016))<br>- Staking Flows for LocalOrchAccount<br> - Written as async-flow ([#9838](https://github.com/Agoric/agoric-sdk/issues/9838)) |
| [stakeBld](/packages/orchestration/src/examples/stake-bld.contract.js) | - Everything*, created before e2e test suite<br> - Consider folding under generic "stake" contract, once [interfaces are the same](https://github.com/Agoric/agoric-sdk/blob/1976c502bcaac2e7d21f42b30447671a61053236/packages/orchestration/src/exos/local-orchestration-account.js#L487)|
| [swap](/packages/orchestration/src/examples/swap.contract.js) | - Everything - contract incomplete ([#8863](https://github.com/Agoric/agoric-sdk/issues/8863)) |
| [unbond](/packages/orchestration/src/examples/unbond.contract.js) | - Everything - contract incomplete ([#9782](https://github.com/Agoric/agoric-sdk/issues/9782)) |
| [staking-combinations](/packages/orchestration/src/examples/staking-combinations.contract.js) | Only tested via [unit tests](/packages/orchestration/src/examples/staking-combinations.contract.js) |
