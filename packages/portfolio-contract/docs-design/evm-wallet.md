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

Using a pattern established by across, 1inch, etc., Ted, who owns `0xED123`, opens `portfolio123` using his EVM Wallet, MetaMask. MetaMask doesn't submit to any chain; rather: it displays the data to be signed according to EIP-712, and gives a signature back to the UI, which POSTs to an app server that we'll call the EVM Message Service:

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

  U->>D: allocate 60% A, 40% B
  U->>D: Open Portfolio
  D-->>D: allocate intent543
  note over D: TBD:<br/>? how to choose deadline?
  note right of MM: EIP-712 signTypedData
  note right of MM: WIP:<br/>Schema
  D->>MM: OpenPortfolio(intent543,<br/>{60% A, 40% B}<br/>nonce,deadline)
  MM-->>U: OpenPortfolio(intent543,<br/>{60% A, 40% B}<br/>nonce,deadline) ok?
  U->>MM: ok
  MM-->>D: signature
  note over MM: NOT SHOWN:<br/>Deposit
  D-->>U: stand by...

  D -->> EMS: signed<br/>OpenPortfolio(intent543, ...)
  note over EMS: NOT SHOWN:<br/>early validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: signed<br/>OpenPortfolio(intent543, ...)
  EMH -->> EMH: check sig:<br/>pubkey = ecRecover(...)<br/>addr = hash(pubkey)
  EMH -->> YC: OpenPortfolio({60% A, 40% B},<br/>deadline)
  YC -->> EMH: portfolio123
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details
  EMH -->> D: portfolio123
  D ->> U: dashboard
```

## Open Portfolio with Deposit Permit

The established pattern involves not just the intent to open a portfolio but also a permit to withdraw funds from Ted's account, `0xED123`, and deposit them into the portfolio:

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
  D-->>D: allocate intent543
  note right of MM: EIP-712 signTypedData
  D->>MM: OpenPortfolio(intent543,<br/>1,0000 USDC,<br/>{60% A, 40% B}<br/>nonce,deadline)
  MM-->>U: OpenPortfolio(intent543,<br/>1,0000 USDC,<br/>{60% A, 40% B}<br/>nonce,deadline) ok?
  U->>MM: ok
  MM-->>D: signature

  D->>MM: Permit(Ymax, 1,000USDC)
  MM-->>U: Permit YMax<br/>Factory Contract<br/>1,000 USDC ?
  U->>MM: ok

  MM-->>D: signature
  D-->>U: stand by...

  D -->> EMS: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(...)
  note over EMS: NOT SHOWN:<br/>early validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(...)
  EMH -->> EMH: check sigs
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>deadline)
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details
  YC -->> EMH: portfolio123<br/>flow1
  EMH -->> D: portfolio123<br/>flow1
  D -->> U: dashboard
  note over YC: NOT SHOWN:<br/>Orchestration<br/>Magic...
  YC-->> D: flow1 done
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

  D -->> EMS: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(1,000 USDC)

  note over EMS: avoid SPAM:<br/>tentative validation<br/>of sig, balance
  EMS-->>EMS: verify signatures,<br />deadline
  note left of B: using Spectrum API
  EMS-->>B: Get 0xED123 balance,<br/>allowance
  B-->>EMS: n USDC
  EMS-->>EMS: verify n >= 1,000

  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(...)
  EMH -->> EMH: check sigs
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B})
```

## Publishing EVM Wallet intent state to VStorage

The UI and YDS follow the intent state via vstorage, much like they do from `published.wallet.agoric1...`.

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
  title Publishing EVM Wallet intent state
  autonumber
  participant D as Ymax UI
  participant EMS as EVM<br/> Message Service
  participant YDS
  %% [Where it runs]
  box Pink Ymax Contract
    participant EMH as EVM<br/>Handler
    participant YC as Ymax<br/>Orchestrator
  end

  %% Notation: ->> for initial message, -->> for consequences

  D -->> EMS: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(...)

  note over D: NOT SHOWN:<br/>tentative validation
  note right of EMS: using walletFactory invokeEntry
  EMS -->> EMH: signed<br/>OpenPortfolio(intent543, ...)<br/>signed Permit(...)
  EMS -->> YDS: invokeEntry<br/>tx hash
  EMS -->> D: OK
  note over D: tx submitted toast

  YDS -->> YDS: get tx contents
  YDS -->> YDS: extract intent543,<br/>0xED123, portfolio123
  EMH -->> EMH: check sigs
  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>deadline)
  EMH -->> EMH: update published.??.0xED123<br/>to intent543 status
  YDS -->> EMH: GET published.??.0xED123
  EMH -->>YDS: intent543 outcome

  note over YC: NOT SHOWN:<br/>Orchestration<br/>Magic...
  D -->> YDS: portfolio123.intent543
  YDS -->> D: updated state
```

## Create + Deposit Orchestration

based on exploratory prototype...

- https://github.com/agoric-labs/agoric-to-axelar-local/pull/48
  - [Factory.sol](https://github.com/agoric-labs/agoric-to-axelar-local/blame/dc-permit2-actors/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol)
- https://github.com/agoric-labs/agoric-to-axelar-local/pull/49
  - [createAndDeposit.ts](https://github.com/agoric-labs/agoric-to-axelar-local/blob/dc-permit2-actors/integration/agoric/createAndDeposit.ts)

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
  participant R as Resolver

  %% Notation: ->> for initial message, -->> for consequences

  Note over EMH: NOT SHOWN:validation

  EMH -->> YC: OpenPortfolio(1,000 USDC,<br/>{60% A, 40% B},<br/>deadline)
  YC -->> EMH: portfolio123<br/>flow1
  note over EMH: NOT SHOWN:<br/>vstorage, YDS details

  box base
    participant P2 as Permit2
    participant USDC as USDC
    participant F as Factory
  end

  note right of YC: 2 contract calls pipelined<br/>via Axelar GMP
  YC-->>USDC: approve(permit2, 1,000 USDC)
  YC-->>YC: permit = {permitted: {token: USDC, amount: 1,000e6 },<br/>nonce, deadline,<br/>spender: 0xFAC1}
  YC-->>YC: payload = (@agoric, 0xED123, 1,000 USDC,<br/>permit, signature)
  YC-->>F: execute(payload)
  F-->>F: require(0xED123 != 0,<br/>USDC !=0,<br/>amount > 0)
  F-->>F: @Base = new Wallet{owner=agoric1...}
  F-->>P2: permitTransferFrom(permit,<br/>{ to: @Base, requestedAmount: 1,000e6 },<br/>0xED123, signature)
  P2-->>USDC: transfer{from: 0xED123, to: 0xFAC1<br/>value: 1,000e6 }
  USDC-->>R: Transfer{to: 0xFAC1,<br/>value: 1,000e6 }<br/>(Base log events)
  F-->>USDC: transfer{to: @Base, amount: 1,000e6}
  F-->>R: SmartWalletCreated
  R -->> YC: success
  note over YC: NOT SHOWN:<br/>supply to A, B from @Base
  YC -->> EMH: flow done
```
