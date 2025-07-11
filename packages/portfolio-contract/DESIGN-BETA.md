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
  Contract ->> Planning Engine: notification of funds in LCA
  Planning Engine ->> Contract: flow sequence
```
5. deposit from Fast USDC source chains into existing portfolio via address hook
```mermaid
sequenceDiagram
  Non-agoric Chain ->> LCA: send USDC via IBC, CCTP, or Fast USDC
  LCA ->> Contract: receive upcall
  Contract ->> Planning Engine: notification of funds in LCA
  Planning Engine ->> Contract: flow sequence
```
6. claim bonus
```mermaid
sequenceDiagram
  UI ->> Contract: claim rewards intent
  Contract ->> Contract: claim rewards at applicable positions
```

#### Planning Engine

##### Move from Aave to Compound
```mermaid
sequenceDiagram
  autoNumber
  participant vstorage
  participant EE as Planning Engine
  participant Contract
  vstorage ->> EE: desired allocation changed to (50% Aave on Avalanche,<br/>50% Compound on Polygon)<br/>no inflight txns for this portfolio
  Spectrum ->> EE: user currently has<br/>$100 on Aave-Avalanche pool<br/>and $0 on Compound-Polygon pool
  EE ->> EE: figures out the next step towards user's desired allocation
  EE ->> Contract: move1(Aave on Avalanche, GMP.Arbitrum)<br/>move2(GMP.Arbitrum, Compound on Polygon)
  Contract ->> vstorage: record all moves
  loop repeat until all moves are done
  Contract ->> Axelar: invoke GMP
  Axelar ->> Proxy Contract: deliver GMP message
  Proxy Contract ->> Axelar: GMP message delivered
  Axelar ->> Contract: GMP message delivered
  Proxy Contract ->> Proxy Contract: execute GMP message<br/>(could fail, proxy contract could retry)
  EE ->> Spectrum: polling balances at relevant places until conditions are satisified
  EE ->> Contract: resolve move promise so contract can execute the next move
  end
  Contract ->> vstorage: delete all moves because they're successful
  EE ->> EE: user's balances match user's desired allocation, go back to sleep
```

#### Eng Tasks
- [EVM]
  - Aave + Compound + USDN [M0]
  - Remaining protocols/pools [M1]
- [contract]
  - accept flow as sequence of moves [M0]
  - portfolio facet
    - update portfolio
    - deposit into LCA
    - withdraw from LCA
    - claim rewards intent
      - claim rewards operation (triggered by user for now, could move to by
        planning engine in the future)
  - planning engine facet
    - can only move tokens between LCA and positions
  - notify planning engine
- [planning engine]
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
      - moves to rearrange user's balances to their desired portfolio allocation
  - [executor]
    - take steps produced by planner and send to portfolio contract

#### NOT in scope for MVP
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc

#### changelog
1. add claim rewards user story
1. make it so deposit = intent to rebalance
1. add an example for planning engine and break down eng tasks further
