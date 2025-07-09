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
4. update portfolio (allocation)
  Mermaid diagram same as 1
  [Will be deleted if agreed]
5. rebalance (move tokens according to portfolio allocation)
  [Will be deleted if agreed]
6. 4 + 5
  [Will be deleted if agreed]
7. automatic rebalance
```mermaid
sequenceDiagram
  Contract ->> Planning Engine: notification of funds in LCA
  Planning Engine ->> Contract: flow sequence
```
8. deposit from Fast USDC source chains into existing portfolio via address hook
```mermaid
sequenceDiagram
  Non-agoric Chain ->> LCA: send USDC via IBC, CCTP, or Fast USDC
  LCA ->> Contract: receive upcall
  Contract ->> Planning Engine: notification of funds in LCA
  Planning Engine ->> Contract: flow sequence
```
9. claim bonus
```mermaid
sequenceDiagram
  UI ->> Contract: claim rewards intent
  Contract ->> Contract: claim rewards at applicable positions
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
          planning engine in the future)
    - planning engine facet
      - can only move tokens between LCA and positions
    - notify planning engine
  - [planning engine]
    - receive/subscribe to notifications
    - given portfolio, current positions, generate steps and make offer
      - errors out if it encounter a situation it can't generate steps

#### NOT in scope for MVP
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc

#### changelog
1. add claim rewards user story
1. make it so deposit = intent to rebalance
