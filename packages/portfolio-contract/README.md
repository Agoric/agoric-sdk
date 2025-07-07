# Portfolio Contract

A smart contract for managing diversified stablecoin yield portfolios across multiple chains and protocols. Also known as YMax, this proof-of-concept enables portfolio rebalancing across different yield protocols.

## Overview

The YMax Portfolio Contract enables users to create and manage portfolios that deploy stablecoins across different yield-generating protocols. Users can rebalance their positions between USDN, Aave, and Compound (via cross-chain operations).

## Parties to the Contract

### Portfolio Holders
- **Create Portfolios**: Open new portfolios by providing USDC, Access tokens, and fees
- **Fund Positions**: Allocate capital across different yield protocols (USDN, Aave, Compound)
- **Portfolio Rebalancing**: Execute rebalancing operations by specifying desired asset movements
- **Multi-chain Operations**: Manage positions across Noble and EVM chains

### The Contract
- **Portfolio Orchestration**: Manages multiple independent portfolios
- **Cross-chain Coordination**: Handles asset transfers and position management across chains
- **Yield Protocol Integration**: Interfaces with USDN, Aave, and Compound protocols
- **Account Management**: Maintains accounts on different chains (Agoric Local Accounts, Noble ICAs)

### External Yield Protocols
- **USDN**: Noble Dollar based on the M^0 Protocol.
- **Aave**: Cross-chain lending protocol (via Axelar GMP to EVM chains)
- **Compound**: Cross-chain lending protocol (via Axelar GMP to EVM chains)

## Current Functionality

### Opening a Portfolio
Users can create a new portfolio by:
1. Making an `openPortfolio` offer
2. Specifying initial yield protocol allocations
3. Receiving a portfolio with rebalancing capabilities

### Rebalancing
Portfolio holders can:
- Move assets between different yield protocols by making rebalancing offers
- Specify exact amounts to transfer between USDN, Aave, and Compound positions
- Execute complex cross-chain operations seamlessly through the contract's orchestration

## Client Queries and Offers

For details on making offers and querying vstorage, see

 - `src/type-guards.ts` - types and pattern guards
 - `test/portfolio-agents.ts` - example client code
 - `test/snapshots/*.md` - example vstorage data
