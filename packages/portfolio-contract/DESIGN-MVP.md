This file contains WIP design for ymax MVP product

## Design

```mermaid
architecture-beta
  group User(cloud)[User]
    service ymaxui(internet)[ymax UI] in User

    ymaxui:R -- L:ymaxcontract
    ymaxui:R -- L:PE

  group offchain(cloud)[Agoric Off Chain]
    service PE(server)[Execution Engine] in offchain

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

### User stories
Each user story below is one smart contract offer

1. new/edit portfolio
```mermaid
sequenceDiagram
  UI ->> Contract: (not exact offerArgs) 50% USDN, 30% Aave, 20% Compound
  Contract ->> vstorage: write portfolio
```
2. deposit from Agoric chain into existing portfolio
```mermaid
sequenceDiagram
  UI ->> Contract: payment in seat
  Contract ->> LCA: localTransfer
```
3. 1 + 2
```mermaid
sequenceDiagram
  UI ->> Contract: (not exact offerArgs) 50% USDN, 30% Aave, 20% Compound AND payment in seat
  Contract ->> vstorage: write portfolio
  Contract ->> LCA: localTransfer
```
4. automatic rebalance
```mermaid
sequenceDiagram
  Contract ->> Execution Engine: notification of funds in LCA
  Execution Engine ->> Contract: flow sequence
```
5. deposit from Fast USDC source chains into existing portfolio via address hook
```mermaid
sequenceDiagram
  Non-agoric Chain ->> LCA: send USDC via IBC, CCTP, or Fast USDC
  LCA ->> Contract: receive upcall
  Contract ->> Execution Engine: notification of funds in LCA
  Execution Engine ->> Contract: flow sequence
```
6. claim bonus
```mermaid
sequenceDiagram
  UI ->> Contract: claim rewards intent
  Contract ->> Contract: claim rewards at applicable positions
```

#### Execution Engine

##### Move from Aave to Compound
```mermaid
sequenceDiagram
  autoNumber
  participant vstorage
  participant EE as Execution Engine
  participant Contract
  vstorage ->> EE: desired allocation changed to (50% Aave on Avalanche,<br/>50% Compound on Polygon)<br/>no inflight txns for this portfolio
  Spectrum ->> EE: user currently has<br/>$100 on Aave-Avalanche pool<br/>and $0 on Compound-Polygon pool
  EE ->> EE: figures out the next step towards user's desired allocation
  EE ->> Contract: withdraw $50 from Aave-Avalanche pool<br/>to ICA-equivalent on Avalanche
  Contract ->> vstorage: record inflight tx
  Contract ->> Axelar: invoke GMP
  Axelar ->> Proxy Contract on Avalanche: deliver GMP message
  Proxy Contract on Avalanche ->> Axelar: GMP message delivered
  Proxy Contract on Avalanche ->> ICA-equivalent on Avalanche: execute GMP message<br/>(could fail, proxy contract could retry)
  Axelar ->> Contract: GMP message delivered
  Contract ->> vstorage: delete inflight tx because it's successful
  EE ->> Spectrum: polling ICA-equivalent on Avalanche until balance >= $50
  EE ->> EE: figures out the next step towards user's desired allocation
  EE ->> Contract: transfer $50 from ICA-equivalent on Avalanche<br/>to ICA-equivalent on Polygon via CCTP<br/>(Axelar interactions similar to withdraw $50)
  EE ->> Spectrum: polling ICA-equivalent on Polygon until balance >= $50
  EE ->> EE: figures out the next step towards user's desired allocation
  EE ->> Contract: deposit $50 from ICA-equivalent on Polygon to<br/>Compound on Polygon pool<br/>(Axelar interactions similar to withdraw $50)
  EE ->> Spectrum: polling Compound on Polygon pool
  EE ->> EE: user's balances match user's desired allocation, go back to sleep
```

#### Eng Tasks
- [EVM]
  - Aave + Compound + USDN [M0]
  - Remaining protocols/pools [M1]
- [contract]
  - accept flow as sequence of moves [M0]
  - administrative facet
    - update portfolio
    - deposit into LCA
    - withdraw from LCA
    - claim rewards intent
      - claim rewards operation (triggered by user for now, could move to by
        execution engine in the future)
  - execution engine facet
    - can only move tokens between LCA and positions
  - notify execution engine
- [execution engine]
  - [poller]
    - being able to poll and notify
      - portfolio changes
      - balance changes on LCA, ICAs, and ICA-equivalents
  - [planner]
    - given
      - portfolio
      - current balances in various positions
      - current inflight txns
    - produce
      - steps that can all be executed in parallel to each other to move user's
        balances closer to their desired portfolio allocation
  - [executor]
    - take steps produced by planner and send to portfolio contract

#### NOT in scope for MVP
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc

#### changelog
1. add claim rewards user story
1. make it so deposit = intent to rebalance
1. add an example for execution engine and break down eng tasks further
