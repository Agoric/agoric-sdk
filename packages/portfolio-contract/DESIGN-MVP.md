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

1. new portfolio
```mermaid
sequenceDiagram
  UI ->> Contract: (not exact offerArgs) 50% USDN, 30% Aave, 20% Compound
  Contract ->> vstorage: write portfolio
```
2. deposit from Agoric chain into existing portfolio
```mermaid
sequenceDiagram
  UI ->> Contract: payment in seat
```
3. 1 + 2
```mermaid
sequenceDiagram
  UI ->> Contract: (not exact offerArgs) 50% USDN, 30% Aave, 20% Compound AND payment in seat
  Contract ->> vstorage: write portfolio
```
4. update portfolio (allocation)
  Mermaid diagram same as 1
5. rebalance (move tokens according to portfolio allocation)
```mermaid
sequenceDiagram
  participant UI
  participant Planning Engine
  participant Contract
  participant vstorage
  UI ->> Contract: intent to rebalance
  Contract ->> vstorage: write intent to rebalance
```
6. 4 + 5
7. automatic rebalance (to recover from errors during rebalance)
```mermaid
sequenceDiagram
  Contract ->> Planning Engine: notification of intent to rebalance
  Planning Engine ->> Contract: execution flow
```
8. deposit from Fast USDC source chains into existing portfolio via address hook
```mermaid
sequenceDiagram
  Non-agoric Chain ->> Portfolio-specific LCA: send USDC via IBC, CCTP, or Fast USDC
  Portfolio-specific LCA ->> Contract: receive upcall
  Contract ->> Planning Engine: notification of intent to rebalance (this assumes deposit = intent to rebalance)
  Planning Engine ->> Contract: execution flow
```

#### NOT in scope for MVP
1. deposit from Fast USDC source chains and create a new portfolio via address hook
2. connect with existing positions on Aave, Compound, etc
