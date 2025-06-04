# Remote Accounts on EVM Architecture

A **Remote Account** is a smart contract account deployed on the EVM chain. It acts on behalf of the user and is capable of:

- Holding and managing tokens
- Initiating transactions
- Receiving cross-chain instructions from Agoric through Axelar

The architecture for remote accounts on EVM involves multiple components working across three interconnected blockchain networks:

- **Agoric**
- **Axelar**
- **Ethereum**

Axelar acts as the bridge between Agoric and Ethereum.

> **Note:** While this document refers to Ethereum specifically, the architecture and concepts described here are broadly applicable to any EVM-compatible chain.

## Overview

The system comprises three main components:

## 1. Agoric Chain

### Axelar GMP(General Message Passing) Contract

> **Defined in:** [Axelar GMP Contract](../contract/src/axelar-gmp.contract.js)

The **Axelar GMP Contract** is deployed on the **Agoric chain** and handles message passing between a user's local Agoric account and a remote account on Ethereum. It orchestrates the remote account lifecycle and interactions.

It consists of two subcomponents:

#### `createAndMonitorLCA`

> **Defined in:** [createAndMonitorLCA](../contract/src/evm.flows.js)

This is the only orchestration flow of the Axelar GMP contract.

When triggered, it performs the following:

- **Creates a Local Chain Account (LCA)**

  It sets up a new LCA on the Agoric chain that will be used to interact with the remote EVM account.

- **Enables Monitoring of IBC Transfers to the LCA**

  Configures the LCA to monitor incoming IBC transfers. This is critical for detecting responses or acknowledgments sent back from EVM chains via the Axelar network.

- **Initiates Remote EVM Account Creation**

  It uses the LCA to send a message to the Ethereum chain (via Axelar) to create a corresponding remote EVM account.

- **Initiates the `EvmAccountKit`**

  Constructs an `EvmAccountKit` by passing in key runtime information:

  - The local chain account(LCA).
  - IBC channel and token denomination info.
  - Remote chain details.

  This kit manages interactions with the EVM-based chain, including sending tokens, messages and handling responses from the EVM chain.

  It also holds the `invitationMakers` that are returned to the user for initiating future actions.

#### `EVMAccountKit`

**Defined in:** [`evm-account-kit.js`](../contract/src/evm-account-kit.js)

The `EvmAccountKit` is a core orchestrated object that encapsulates the state and behavior for managing communication with a remote EVM chain via the Axelar GMP protocol. It handles sending and receiving messages, tracking remote account creation, and providing invitations for user actions.

Some key components:

- **tap.receiveUpcall(event)**

  Processes incoming IBC transfer events. It does the following:

  - Reads and interprets the message content
  - Checks the result of any contract calls to EVM that were performed
  - Saves the remote Ethereum account address when it becomes available

- **holder.sendGmp(seat, offerArgs)**

  Responsible for performing cross-chain token transfers and invoking contract calls on the remote EVM chain via Axelar GMP.

- **holder.getLocalAddress()**

  Returns the Bech32 address of the LCA.

- **holder.getAddress()**

  Returns the remote EVM account address (if created).

- **holder.getLatestMessage()**

  Returns the latest contract call result received from the EVM chain.

---

## 2. Ethereum Chain

Two smart contracts are deployed on Ethereum to enable remote account operations from Agoric: `Factory` and `Wallet`.

### Factory Contract

**Defined in:** [`Factory.sol`](../solidity/contracts/Factory.sol)

The `Factory` contract is responsible for creating new instances of the `Wallet` contract. It inherits `AxelarExecutable` to receive interchain requests and reply back to Agoric using Axelar's General Message Passing (GMP). It stores the gateway and gas receiver addresses, and keeps the local chain name for reference. It uses Axelar's [`IAxelarGasService`](https://docs.axelar.dev/dev/gas-service/intro/#introduction-to-axelar-gas-service-contract) to pay for outbound message gas, and emits events when wallets are created.

#### Key Functions

- **createVendor(string memory owner)**

  - Deploys a new `Wallet` contract.
  - Sets the provided `owner` as the wallet's owner.
  - Emits the `WalletCreated` event with the new wallet address and `owner` string.

- **\_execute**

  - Triggered by Axelar when a remote call from Agoric is received.
  - Uses `sourceAddress` (the Agoric caller) as the owner to call `createVendor`.
  - Encodes the resulting `Wallet` address into an `AgoricResponse` struct.
  - Sends the result back to the Agoric chain using `_send`.

- **\_send**

  - Calls `payNativeGasForContractCall` to ensure Axelar relayers process the outbound message.
  - Uses `callContract` to send the response back to Agoric.

---

### Wallet Contract

**Defined in:** [`Factory.sol`](../solidity/contracts/Factory.sol)

The `Wallet` contract acts as a remote Ethereum account controlled by Agoric. It receives messages from Agoric and performs on-chain contract calls. It inherits from `AxelarExecutable` to receive interchain messages. The contract also integrates with `IAxelarGasService` for paying gas fees when sending responses back to Agoric.

The `Wallet` contract inherits a custom implementation of [`Ownable`](../solidity/contracts/Ownable.sol) contract that provides access control by storing the owner's address as a string and restricting certain functions to only be callable by that owner. It is designed to work with Axelar GMP, where ownership is validated using string comparisons instead of Ethereum's native address type.

#### Custom Types

- **CallParams**

  - Structure containing:

    - `address target`: Target contract address.
    - `bytes data`: ABI-encoded call data.

- **CallResult**

  - Structure containing:

    - `bool success`: Whether the contract call succeeded.
    - `bytes result`: Data returned by the call.

- **AgoricResponse**

  - Structure containing:
    - `bool isContractCallResult`: False if this is a wallet creation response, true if it's a contract call response.
    - `CallResult[] data`: Encoded results of calls or wallet creation.

#### Key Functions

- **\_multicall(bytes calldata payload)**

  - Decodes the payload into an array of `CallParams`.
  - Each `CallParams` contains a target address and call data.
  - Iterates over each call and performs a low-level `call`.
  - Reverts the entire transaction if any call fails.
  - Returns an array of `CallResult` containing success flags and returned data.

- **\_execute**

  - Triggered by Axelar when a message is received.
  - Verifies that the message is from the correct owner using `onlyOwner(sourceAddress)`.
  - Calls `_multicall` to execute the batch of contract calls.
  - Encodes the result in an `AgoricResponse`.
  - Sends the response back to the Agoric chain using `_send`.

- **\_executeWithToken**

  - Executes `_multicall` without returning a result.

- **\_send**

  - Calls `payNativeGasForContractCall` to ensure Axelar relayers process the outbound message.
  - Uses `callContract` to send the response back to Agoric.
