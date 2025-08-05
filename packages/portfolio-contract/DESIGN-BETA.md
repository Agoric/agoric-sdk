This file contains WIP design for ymax MVP product

## Design

```mermaid
architecture-beta
  group User(cloud)[User]
    service ymaxui(internet)[ymax UI] in User

    ymaxui:R -- L:ymaxcontract
    ymaxui:R -- L:PE

  group offchain(cloud)[Agoric Off Chain]
    service PE(server)[Planning Engine] in offchain

    PE:R -- L:spectrum

  group onchain(cloud)[Agoric On Chain]
    service ymaxcontract(server)[ymax contract] in onchain

    PE:B -- T:ymaxcontract

  group SS(cloud)[Simply Staking]
    service spectrum(database)[Spectrum] in SS
    service APY(disk)[APY] in SS
    service fees(disk)[gas and other fees] in SS
    service slippage(disk)[slippage] in SS

    APY:L -- R:spectrum
    fees:L -- R:spectrum
    slippage:L -- R:spectrum
```

### Operations
1. new/edit portfolio
```mermaid
sequenceDiagram
  UI ->> portfolio: openPortfolio in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> vstorage: write portfolio
```
2. deposit from Agoric chain into existing portfolio
```mermaid
sequenceDiagram
  UI ->> portfolio: rebalance in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> LCAin: localTransfer
```
3. new/edit portfolio and deposit from Agoric chain
```mermaid
sequenceDiagram
  UI ->> portfolio: openPortfolio AND rebalance in type-guards.ts

  box rgb(255,153,153) Agoric
    participant portfolio
    participant vstorage
    participant LCAorch
    participant LCAin
  end

  portfolio ->> vstorage: write portfolio
  portfolio ->> LCAin: localTransfer
```
4. deposit-triggered distribution
```mermaid
sequenceDiagram
  autonumber

  box rgb(255,153,153) Agoric
    participant portfolio
    participant LCAorch
    participant LCAin
  end

  participant EE
  participant Res as Resolver

  box rgb(163,180,243) Noble
    participant icaN as icaNoble
  end

  box rgb(163,180,243) Axelar
    participant AX as GMP
  end

  box rgb(163,180,243) Arbitrum
    participant acctArb
    participant aavePos
  end

  %% Notation: ->> for initial message, -->> for consequences

  Note right of LCAin: USDC arriving in LCAin
  LCAin -->> EE: EE observes USDC arrives
  EE ->> portfolio: moves
  portfolio ->> LCAorch: CREATE (lazily)
  %% Optionally, send to LCAin and have EE do the planning
  critical CCTP out
    LCAin ->> LCAorch: $5k
    LCAorch ->> icaN: $5k
    icaN ->> LCAorch: ack
    LCAorch ->> icaN: depositForBurn
    icaN ->> LCAorch: ack
    icaN -->> acctArb: $5ku
    acctArb -->> Res: event?
    Res ->> portfolio: ack
  option call `supply`
    LCAorch ->> AX: supply $5k acctArb
    AX -->> acctArb: supply $5k
    acctArb ->> aavePos: $5k
    aavePos -->> Res: Mint event
    Res ->> portfolio: ack
  end
```

### User stories

1. tiger would like to open a portfolio with allocations in percentages
    1. operation 1: new/edit portfolio
2. tiger would like to edit their existing portfolio to different allocations
    1. operation 1: new/edit portfolio
3. tiger already has an existing portfolio, and tiger sign a txn to deposit USDC into their portfolio
    1. operation 4: deposit triggered distribution
3. tiger would like to open a portfolio and deposit USDC to it
    1. operation 3: new/edit portfolio and deposit from Agoric chain
    2. operation 4: deposit triggered distribution
4. tiger would like to edit their existing portfolio and deposit USDC to it
    1. operation 3: new/edit portfolio and deposit from Agoric chain
    2. operation 4: deposit triggered distribution

#### NOT in scope for now
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc
3. automatic/scheduled rebalance or claim rewards
