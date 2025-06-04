# Cross-Chain Messaging from Agoric to EVM

Cosmos-based blockchains can send tokens and do contract calls to EVM-based blockchains using Axelar’s General Message Passing (GMP). This is possible through the [IBC memo field](https://medium.com/the-interchain-foundation/moving-beyond-simple-token-transfers-d42b2b1dc29b), which carries instructions for the Axelar network to understand and forward the message.

## Memo Format for Axelar GMP

Here’s what the `memo` looks like in code:

```js
export enum GMPMessageType {
  ContractCall = 1,            // Call a contract
  ContractCallWithToken = 2,   // Call a contract with tokens
  TokenTransfer = 3,           // Just send tokens
}

export type AxelarFeeObject = {
  amount: string;               // How much to pay in fees
  recipient: Bech32Address;     // Who receives the fee
};

export type AxelarGmpOutgoingMemo = {
  destination_chain: string;     // Name of the target chain (like "Ethereum")
  destination_address: string;   // Address on the target chain
  payload: number[] | null;      // Data to be sent (e.g. for smart contract)
  type: GMPMessageType;          // Type of action
  fee?: AxelarFeeObject;         // Optional fee details
};

```

### Fee Rules

- TokenTransfer(`type: 3`)
  For `TokenTransfer`, you don’t need to include a `fee` in the `memo`. Axelar will deduct its fee from the tokens you’re sending.

- ContractCall or ContractCallWithToken(`type: 1 | 2`)
  For `ContractCall` or `ContractCallWithToken`, a `fee` must be included. This `fee` pays for Axelar to process, forward and execute the message on the destination chain. It must be estimated and added in advance.

Read more about how transaction fees work in Axelar [over here](https://docs.axelar.dev/dev/gas-service/pricing/#transaction-pricing).

---

## Message Flow

Once the memo is included in an IBC transaction, the message follows this flow:

### 1. **IBC Packet Handling**

The transaction begins on Agoric and includes a `memo` formatted with Axelar GMP instructions as described above. When submitted, the chain’s IBC module wraps the transaction data into an IBC packet. This packet is then emitted by the IBC module and picked up by the IBC Relayer. The relayer forwards the packet to the Axelar network, which itself is a Cosmos chain capable of understanding and processing the embedded GMP message.

### 2. **Axelar Processing**

Upon receiving the IBC packet, the Axelar blockchain validates its contents. This validation process checks details like the target chain, the destination contract address, the payload data, and any included fee information. If the packet passes validation, Axelar emits an internal event signaling that a message is ready for delivery to an EVM chain.

### 3. **EVM Relayer**

The off-chain Axelar EVM relayer monitors the Axelar chain for these internal events. When one is detected, the relayer prepares a cross-chain call and invokes the `callContract()` or `callContractWithToken()` function on the [**AxelarGateway**](https://github.com/axelarnetwork/axelar-cgp-solidity/blob/main/contracts/AxelarGateway.sol/) smart contract deployed on the destination EVM chain. It passes along the target address, the original payload (which contains the encoded smart contract call), and metadata about the originating chain and transaction. This step bridges the message from the Cosmos ecosystem into the EVM environment.

### 4. **Smart Contract Execution on Ethereum**

After the `callContract()` function is executed, the `AxelarGateway` smart contract emits a `CallContract` event. This triggers the final leg of the journey: the target Ethereum smart contract is invoked with the decoded payload. The contract then executes the specified logic, completing the intended cross-chain operation.

---

## What Contracts Can Be Invoked

Not all Ethereum contracts can be called through Axelar GMP. Only those that inherit [**AxelarExecutable.sol**](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/executable/AxelarExecutable.sol/) or [**AxelarExecutableWithToken.sol**](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/executable/AxelarExecutableWithToken.sol) are eligible for invocation.

If you're deploying a contract that you want to receive messages via Axelar GMP, you **must inherit from these contracts**. These contracts define the necessary entry points for Axelar’s relayer to trigger logic on your contract.

To handle a contract call without tokens, your EVM contract must define the following method:

```solidity
function _execute(
    string calldata sourceChain,
    string calldata sourceAddress,
    bytes calldata payload
) internal override {
    // custom logic
}
```

To handle a contract call with tokens, your contract must also define:

```solidity
function _executeWithToken(
    string calldata sourceChain,
    string calldata sourceAddress,
    bytes calldata payload,
    string calldata tokenSymbol,
    uint256 amount
) internal override {
    // custom logic
}
```

The `AxelarGateway` invokes the `_execute()` method when performing a **ContractCall**, and it invokes `_executeWithToken()` when performing a **ContractCallWithToken**. These functions are where you define the behavior your contract should carry out upon receiving the cross-chain message.

Read more about it [over here](https://docs.axelar.dev/dev/general-message-passing/overview/#general-message-passing).

---

## Introducing the Proxy Contract

Axelar GMP currently requires that any target smart contract on an EVM chain must inherit either the `AxelarExecutable` or `AxelarExecutableWithToken` contract. In practice, this means we can only directly invoke contracts that **inherit from these base contracts** and define the appropriate `_execute` and/or `_executeWithToken` methods.

To overcome this limitation, we’ve designed a **proxy contract**. Instead of modifying every target contract to support Axelar GMP, we deploy a **single proxy contract** on each EVM chain we wish to support. This proxy acts as the **designated receiver** of Axelar cross-chain messages, inheriting from `AxelarExecutable` (or its token-enabled variant). By doing so, it qualifies to receive and process GMP messages.

The proxy contract’s role is simple:

- It implements `_execute()` and `_executeWithToken()` as required by Axelar GMP.
- Upon receiving a message, it **decodes the payload** to determine:
  - Which contract to call
  - Which method to invoke
  - What parameters to pass
- It then uses Solidity’s [`call`](https://www.alchemy.com/overviews/solidity-call) mechanism to forward the instruction to the intended target contract.

This indirection makes it possible to **invoke arbitrary contracts**, including those that don’t directly support Axelar GMP, as long as the logic to parse and route the call is correctly encoded in the payload.

---

## Encoding and Decoding Payloads for Arbitrary Contract Calls

To enable the proxy contract to call arbitrary contracts on the EVM side, we need a structured way to encode and transmit multiple contract calls within the Axelar memo's `payload` field.

### 1. Write Your Intent (`ContractCall`)

This is the type used in Agoric when you define **what you want to do** on the EVM chain:

```ts
export type ContractCall = {
  target: `0x${string}`; // EVM contract address to invoke
  functionSignature: string; // EVM function signature (e.g. "transfer(address,uint256)")
  args: Array<unknown>; // Arguments to that function
};
```

A single `ContractCall` tells the system:

> "Call this function on this contract with these arguments."

### 2. AbiEncodedContractCall

Before sending to the EVM, each `ContractCall` is converted into an ABI-encoded version something Solidity understands:

```ts
export type AbiEncodedContractCall = {
  target: `0x${string}`; // EVM contract address to invoke
  data: `0x${string}`; // Encoded method selector + arguments
};
```

The `data` field in `AbiEncodedContractCall` is precise encoding of which function to call and with what arguments.

### 3. Encoded as Solidity Struct CallParams[]

Once each `ContractCall` has been ABI-encoded on the Agoric side (i.e. converted into `AbiEncodedContractCall` objects with a target and data) and reaches the Proxy contract on the EVM, it expects the payload to conform to:

```solidity
struct CallParams {
    address target;
    bytes data;
}

```

This is the expected format on the EVM side. The Solidity contract knows how to decode this struct using the standard `abi.decode` mechanism:

```solidity
CallParams[] memory calls = abi.decode(payload, (CallParams[]));
```

After decoding, it can then loop through `calls[]` and invoke each `target` with the associated data.

> To get a deeper understanding, take a look at the [`buildGMPPayload`](../contract/utils/gmp.js) utility. This function acts as the **bridge between the Agoric-side intent and the Solidity-side execution** by encoding multiple contract calls into a single cross-chain payload. Also, review the `_execute` function in [`Factory.sol`](../solidity/contracts/Factory.sol), defined within the `Wallet` contract, to see how the Solidity side decodes and processes the incoming data payload.

---

## Security Considerations (Under Review)

The proxy contract introduces flexibility but also opens up important security responsibilities. The following considerations are currently under review and the contracts are pending a formal security audit. Until all security measures are finalized, use of the proxy contract should be restricted to testnets or controlled testing environments.

### Areas Under Consideration

#### **Input Validation**

The proxy accepts arbitrary payload data. This makes input validation critical. We will be evaluating strategies to:

- Ensure payloads strictly match the expected `CallParams[]` format.
- Optionally restrict target addresses to known safe contracts in permissioned deployments.
- Validate that the `calldata` corresponds to approved function signatures.

This enforces that only messages from a trusted chain and contract are processed.

#### **Risks associated with .call()**

Because the proxy uses [`.call()`](https://www.cyfrin.io/glossary/call-solidity-code-example) to invoke external contracts, reentrancy attacks are a concern. It's also important to examine how `.call()` behaves in the event of contract call failures, as this can impact control flow and error handling.

#### **Gas Limits & DoS**

Calling into unknown external contracts may cause unpredictable gas usage.

#### **Replay Protection**

Cross-chain messages can be replayed unless guarded. We're evaluating message hashing, nonce tracking, or other anti-replay mechanisms to ensure idempotency.

---
