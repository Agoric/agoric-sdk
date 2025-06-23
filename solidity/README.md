# Solidity Contracts for Remote EVM Wallets

This directory contains Solidity smart contracts and deployment script for creating and managing remote EVM wallets, with cross-chain capabilities via Axelar GMP.

## Overview
- **Factory.sol**: Main contract responsible for deploying new remote EVM wallet contracts (`Wallet.sol`, defined within `Factory.sol`).
- **Ownable.sol**: Custom ownership logic using string-based identifiers, suitable for cross-chain scenarios.
- **Axelar Integration**: Contracts are designed to work with Axelar's General Message Passing (GMP) for cross-chain contract calls and token transfers.

## Structure
- `contracts/` — Solidity smart contracts (Factory, Ownable)
- `scripts/` — Deployment script (e.g., `deploy.sh`)
- `ignition/` — Hardhat Ignition deployment modules
- `hardhat.config.ts` — Hardhat configuration for local and testnet deployments

## Prerequisites
- Node.js
- Yarn
- [Hardhat](https://hardhat.org/) and [Hardhat Ignition](https://hardhat.org/ignition)
- Set a `PRIVATE_KEY` environment variable for deploying to testnets

## Installation
```bash
yarn install
```

## Deployment
To deploy the Factory contract to a supported testnet (e.g., Fuji or Base):

```bash
# Example: Deploy to Fuji (Avalanche testnet)
PRIVATE_KEY=your_key_here ./scripts/deploy.sh fuji

# Or to Base testnet
PRIVATE_KEY=your_key_here ./scripts/deploy.sh base
```

This will deploy the Factory contract using the network-specific gateway and gas service addresses.

## Usage
- The Factory contract can create new Wallet contracts, each with a designated owner (as a string, e.g., a cross-chain address).
- Wallet contracts can execute multicall operations and handle cross-chain messages and token transfers via Axelar GMP.