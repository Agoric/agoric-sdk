## Preface: Invite EVM Messenger Service

Much like we invite the Planner and Resolver, we start by inviting the EVM Messenger Service, and redeeming the invitation.

<details><summary>Sequence Diagram: Invite EVM Messenger Service</summary>

```mermaid
sequenceDiagram
  title: Invite EVM Messenger Service

  %% Conventions:
  %% - use `box` for vats / contracts
  %% - `->>` denotes a spontaneous action (initiating cause)
  %% - `-->>` denotes a consequence of a prior message

  autonumber
  actor op as YMax Operator
  box bootstrap
    participant YC as ymaxControl
  end
  box ymax
    participant CF as CreatorFacet
  end
  box postalService
    participant PS as publicFacet
  end
  box walletFactory
    participant W as wallet agoric1evm
  end
  actor evm as EVM Service Operator

  op->>op: ymax-tool invite-evm-msg-svc
  op-->>YC: invokeEntry(ymaxCreator, ...)
  YC-->>CF: deliverEVMWalletHandlerInvitation(<br/>'agoric1evm', postalService)
  CF-->>CF: inv1 = makeInvitation(...)
  CF-->>PS: deliverPayment('agoric1evm', inv1)
  PS-->>W: receive(inv1)
  W-->>PS: ack
  PS-->>CF: ack
  CF-->>YC: ack
  YC-->>op: ack

  evm->>evm: redeem invitation
  evm-->>W: executeOffer('evmWalletHandler', ...)
  W-->>W: saveResult('evmWalletHandler')
  W-->>evm: ack
```

</details>

## EVM Wallet to Ymax Contract via App Server

Using a pattern established by across, 1inch, etc., Ted, who owns `0xED123` uses his EVM Wallet, MetaMask. MetaMask doesn't submit to any chain; rather: it displays the data to be signed according to EIP-712, and gives a signature back to the UI, which POSTs to an app server that we'll call the EVM Message Service:

```mermaid

%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title EVM Wallet to Ymax Contract via App Server
  autonumber
  box lightblue User Agent
    actor U as Ted EVM User
    participant MM as Metamask<br/>0xED123
  end
  participant D as Ymax UI
  participant EMS as EVM<br/> Message Service
  %% [Where it runs]
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end

  %% Notation: ->> for initial message, -->> for consequences

  U->>D: some portfolio operation
  D-->>D: allocate nonce543
  note over D: TBD:<br/>? how to choose deadline?
  note right of MM: EIP-712 signTypedData
  note right of MM: Schema<br/>dependent on operation
  D->>MM: PortfolioOp(...args,<br/>nonce543,deadline)
  MM-->>U: PortfolioOp(...args,<br/>nonce543,deadline) ok?
  U->>MM: ok
  MM-->>D: signature
  note over MM: NOT SHOWN:<br/>Any needed one time<br/>Permit2 approval
  D-->>U: stand by...

  D -->> EMS: signed<br/>PortfolioOp(nonce543, ...)
  note over EMS: NOT SHOWN:<br/>early validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: handleMessage(<br/>PortfolioOp(nonce543, ...), signature)
  EMH -->> EMH: check sig:<br/>pubkey = ecRecover(...)<br/>addr = hash(pubkey)
  EMH -->> YC: PortfolioOp(...args)
  YC -->> EMH: result
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details
  EMH -->> D: outcome
  D ->> U: dashboard
```

### Open Portfolio with Deposit Permit

To open a portfolio, YMax requires a deposit to be made. Unlike with a cosmos based wallet where the funds can be included in the Zoe offer (withdrawn from the cosmos account), Ted signs a permit to withdraw funds from their EVM account, `0xED123`.

To reduce the number of signatures and transactions needed, we use permit2, which supports custom payloads for the dApp's usage, where we include the Open Portfolio details. This is akin to Circle's CPN Transactions v2.

This requires to prompt Ted for a one time approval of the permit2 contract if they haven't previously approved it in any dApp.

```mermaid

%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title Open Portfolio With Deposit Permit
  autonumber
  box lightblue User Agent
    actor U as Ted EVM User
    participant MM as Metamask<br/>0xED123
  end
  participant D as Ymax UI
  participant EMS as EVM<br/> Message Service
  %% [Where it runs]
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end

  %% Notation: ->> for initial message, -->> for consequences

  U->>D: allocate 60% A, 40% B
  U->>D: choose 1,000 USDC
  U->>D: Open Portfolio

  opt permit2 approval
    D-->>MM: Approve(permit2, USDC, ∞)
    MM-->>U: Approve(permit2, USDC, ∞) ok?
    U->>MM: ok
    MM-->>MM: Submit approval
    MM-->>D: done
  end

  D-->>D: allocate nonce543
  note over D: TBD:<br/>? how to choose deadline?
  note right of MM: EIP-712 signTypedData
  D->>MM: PermitWitnessTransferFrom(<br/>1,0000 USDC,<br/>YMaxV1OpenPortfolio<br/>{60% A, 40% B},<br/>nonce543,deadline)
  MM-->>U: PermitWitnessTransferFrom(<br/>1,0000 USDC,<br/>YMaxV1OpenPortfolio<br/>{60% A, 40% B},<br/>nonce543,deadline) ok?
  U->>MM: ok
  MM-->>D: signature

  D-->>U: stand by...

  D -->> EMS: signed<br/>PermitWitnessTransferFrom(<br/>nonce543, ...)
  note over EMS: NOT SHOWN:<br/>early validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: handleMessage(<br/>PermitWitnessTransferFrom(<br/>nonce543, ...), signature)
  EMH -->> EMH: check sigs
  EMH -->> EMH: extract nested operation
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>signed permit)
  YC -->> EMH: portfolio123<br/>flow1
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details
  EMH -->> D: portfolio123<br/>flow1
  D -->> U: dashboard
  note over YC: NOT SHOWN:<br/>Orchestration<br/>Magic...
  YC-->> D: flow1 done
  D -->> U: deposit done
```

### Withdraw (EVM)

```mermaid
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title Withdraw (EVM)
  autonumber
  box lightblue User Agent
    actor U as Ted EVM User
    participant MM as Metamask<br/>0xED123
  end
  participant D as Ymax UI
  participant EMS as EVM<br/> Message Service
  %% [Where it runs]
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end
  participant A as Arbitrum
  %% Notation: ->> for initial message, -->> for consequences
  U->>D: withdraw(500$USDC, Arbitrum)
  D-->>D: allocate nonce543
  note right of MM: EIP-712 signTypedData
  D->>MM: Withdraw712(500 USDC,“Arbitrum”,nonce543,deadline)
  MM-->>U: Withdraw712(500 USDC,“Arbitrum”,nonce543,deadline) ok?
  U->>MM: ok
  MM-->>D: signature
  D-->>U: stand by...
  D -->> EMS: Withdraw712, signature
  note over EMS: NOT SHOWN:<br/>early validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: handleMessage(Withdraw712, signature)
  EMH -->> EMH: check sigs
  EMH -->> EMH: extract nested operation
  EMH -->> YC: Withdraw(500 USDC,“Arbitrum”)
  YC -->> EMH: portfolio123<br/>flow2
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details
  EMH -->> D: portfolio123<br/>flow2
  D -->> U: dashboard
  note over YC: NOT SHOWN:<br/>Orchestration<br/>to @Arbitrum
  YC->> A: @Arbitrum.transfer(500, `+Arbitrum`)
  YC-->> D: flow2 done
  D -->> U: deposit done
```

## Early Validation

The EVM Message Service spends gas to put messages on the Agoric chain -- messages that cause the Ymax contract to spend EVM execution fees. To mitigate spam/DOS risks,
it does early validation of signatures and balance:

```mermaid

%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title Avoid Spam: Tentative Validation
  autonumber
  participant D as Ymax UI
  participant EMS as EVM<br/> Message Service
  %% [Where it runs]
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end
  participant B as Base<br/>chain

  %% Notation: ->> for initial message, -->> for consequences

  D -->> EMS: signed<br/>PermitWitnessTransferFrom(<br/>1,000 USDC,<br/>nonce543, ...)

  note over EMS: avoid SPAM:<br/>tentative validation<br/>of sig, balance
  EMS-->>EMS: verify signatures,<br />deadline
  note left of B: using Spectrum API
  EMS-->>B: Get 0xED123 permit2 USDC,<br/>approval, allowances
  B-->>EMS: a, limit
  EMS-->>EMS: verify a == true && limit > 1,000

  EMS-->>B: Get 0xED123 balances
  B-->>EMS: n USDC
  EMS-->>EMS: verify n >= 1,000

  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: handleMessage(<br/>PermitWitnessTransferFrom(<br/>nonce543, ...), signature)
  EMH -->> EMH: check sigs
  EMH -->> EMH: extract nested operation
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>signed permit)
```

## Publishing EVM Wallet operation state to VStorage

The UI and YDS follow the operation state via vstorage, much like they do from `published.wallet.agoric1...`.

```mermaid

%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title Publishing EVM Wallet operation state
  autonumber
  participant D as Ymax UI
  box lightblue ymax-web
    participant YDS
    participant EMS as EVM<br/> Message Service
  end
  %% [Where it runs]
  box Wallet Factory
    participant W as Smart<br/>Wallet
  end
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end

  %% Notation: ->> for initial message, -->> for consequences

  D -->> YDS: POST /evm-operations<br/>signed PortfolioOp(nonce543, ...)
  YDS -->> EMS: signed<br/>PortfolioOp(nonce543, ...)

  note over EMS: NOT SHOWN:<br/>tentative validation
  EMS --> W: invokeEntry(invoke78,<br/>evmWalletHandler,<br/>handleMessage, ...)
  EMS -->> YDS: OpDetails<br/>nonce543<br/>0xED123<br/>portfolio123?<br/>tx hash
  YDS -->> D: OK
  note over D: tx submitted toast

  YDS -->> YDS: watch tx,<br/>0xED123/portfolio123

  W -->> EMH: handleMessage(<br/>PortfolioOp(nonce543, ...),<br/>signature)
  EMH -->> EMH: check sigs
  alt sig failure
    EMH -->> W: error
    W -->> W: update published.wallet<br/>.agoric1evm<br/>to invoke78 status
  else sig success
    EMH -->> YC: PortfolioOp(...args)
    EMH -->> EMH: update published.ymaxN<br/>.evmWallet.0xED123<br/>to nonce543 status
    note over EMH: handleMessage outcome<br/>include PortfolioOp result?
    EMH -->> W: ok
    W -->> W: update published.wallet<br/>.agoric1evm<br/>to invoke78 status
    YDS -->> EMH: GET published.ymaxN<br/>.evmWallet.0xED123
    EMH -->> YDS: nonce543 outcome
  end

  note over YC: NOT SHOWN:<br/>Orchestration<br/>Magic...

  YDS -->> YC: GET published.ymaxN<br/>.portfolio123
  YC -->> YDS: updated portfolio state

  D -->> YDS: portfolio123
  YDS -->> D: updated state
```

## Create + Deposit Orchestration

based on exploratory prototype...

- https://github.com/agoric-labs/agoric-to-axelar-local/pull/48
  - [Factory.sol](https://github.com/agoric-labs/agoric-to-axelar-local/blame/rs-spike-permit2-with-witness/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol)
- https://github.com/agoric-labs/agoric-to-axelar-local/pull/51
  - [FactoryFactory.sol](https://github.com/agoric-labs/agoric-to-axelar-local/blame/rs-spike-permit2-with-witness/packages/axelar-local-dev-cosmos/src/__tests__/contracts/FactoryFactory.sol)
  - [createAndDeposit.ts](https://github.com/agoric-labs/agoric-to-axelar-local/blob/rs-spike-permit2-with-witness/integration/agoric/createAndDeposit.ts)

### Preface: YMax specific Factory instance

To ensure that the signed permit cannot be used by another call from the Agoric chain, the YMax instance needs an owned instance of the Factory contract. Users will sign the permits
with that instance designated as spender.

<details>
<summary>Sequence Diagram: Setup owned Factory</summary>

```mermaid
sequenceDiagram
  title: Setup owned Factory

  %% Conventions:
  %% - `->>` denotes a spontaneous action (initiating cause)
  %% - `-->>` denotes a consequence of a prior message

  autonumber
  actor op as Operator

  box Agoric
    participant Y as ymax-contract
  end

  box EVM
    participant DF as DepositFactory
  end

  %% 1) Start YMax contract
  op ->> Y: start()
  Y -->> Y: create & publish<br/>contractAccount

  %% 2) Deploy DepositFactory
  op->>DF: create(bytecode=DepositFactory,<br/>nonce=1, owner=contractAccount)
  DF-->>op: deployedAddress = 0xFAC1...

  %% 3) Operator manually wires address into ymax-contract
  op->>op: ymax-tool upgrade<br/>privateArgs.depositFactoryAddress=0xFAC1...
  op-->>Y: upgrade(privateArgs)
  Y-->>Y: read depositFactoryAddress<br/>from privateArgs
  Y-->>Y: publish ymax0.depositFactoryAddress<br/>in vstorage
```

</details>

### Orchestration details

The signed permit must be stored by the YMax contract on the flow until the planner resolves the plan including using the deposit from the EVM account.
To inform the planner that the deposit is from an EVM account, an optional "chainId" is added to flow details. To let the planner  designating non-agoric deposit accounts in plans, we expand `+` refs: `+base` means the user's EOA on base, for which a permit must exist.

```mermaid

%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#f0f8ff',
    'primaryTextColor': '#2c3e50',
    'primaryBorderColor': '#7fb2e6',
    'lineColor': '#7fb2e6',
    'secondaryColor': '#f6f8fa',
    'tertiaryColor': '#fff5e6'
  }
}}%%
sequenceDiagram
  title Create + Deposit Orchestration
  autonumber
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end
  participant P as Planner
  participant R as Resolver
  box base
    participant P2 as Permit2
    participant USDC as USDC
    participant F as Factory
  end

  %% Notation: ->> for initial message, -->> for consequences

  Note over EMH: NOT SHOWN:validation

  EMH -->> EMH: signed permit = {permit,<br/>owner: 0xED123, chainId: 8453,<br/>witness, witnessTypeString,<br/>signature}
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>signed permit)
  YC -->> EMH: portfolio123
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details

  note over YC: NOT SHOWN:<br/>LCA, Noble account creation
  YC -->> YC: Create flow1,<br/>store signed permit

  P -->> YC: GET portfolio123
  YC -->> P: flowsRunning.flow1<br/>{type: "deposit",<br/>chainId: "base"}
  P -->> YC: resolvePlan(flow1,<br/>[[+base,@base], ...])
  YC -->> YC: read stored<br/>signed permit

  note right of YC: call via Axelar GMP<br/>from contractAccount
  YC-->>YC: payload = (@agoric, signed permit)
  note over F: Owned factory 0xFAC1<br/>for ymax instance
  YC-->>F: execute(payload)
  F-->>F: require(0xED123 != 0,<br/>USDC != 0,<br/>amount > 0)
  F-->>F: @Base = new Wallet{owner=agoric1...}
  F-->>F: transferDetails = { to: @Base,<br/>requestedAmount: permit.permitted.amount }
  F-->>P2: permitWitnessTransferFrom(<br/>permit, transferDetails,<br/>owner, witness,<br/>witnessTypeString, signature)
  P2-->>USDC: transfer{from: 0xED123, to: 0xFAC1<br/>value: 1,000e6 }
  USDC-->>R: Transfer{to: 0xFAC1,<br/>value: 1,000e6 }<br/>(Base log events)
  F-->>USDC: transfer{to: @Base, amount: 1,000e6}
  F-->>R: SmartWalletCreated
  R -->> YC: success
  note over YC: NOT SHOWN:<br/>supply to A, B from @Base
  YC -->> EMH: flow done
```
