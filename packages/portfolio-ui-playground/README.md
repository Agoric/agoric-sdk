# Portfolio UI Playground

⚠️ **PROTOTYPE ONLY** - Non-production demo for testing EIP-712 signing with YMax portfolio operations.

## What it does

This UI prototype demonstrates:
- Form for creating YMax portfolio operations (open, deposit, rebalance, withdraw)
- EIP-712 message formatting for authorization
- MetaMask integration for signing
- Display of signed results

## Quick Start

```bash
cd packages/portfolio-ui-playground
npm install
npm run dev
```

Open http://localhost:3000

## How it works

1. **Connect MetaMask** - Links your EVM wallet
2. **Fill the form** - Choose operation type, amount, target allocations
3. **Sign with MetaMask** - Creates EIP-712 signature for authorization
4. **View results** - Shows the signed message that would be submitted to Agoric

## EIP-712 Structure

The signed message authorizes portfolio operations on the Agoric YMax contract:

```typescript
{
  operation: "openPortfolio" | "rebalance" | "deposit" | "withdraw",
  user: "0x...", // Your EVM address
  amount: "1000000", // USDC amount in wei (6 decimals)
  targetAllocation: [
    { poolKey: "USDN", basisPoints: 5000 },
    { poolKey: "Aave_Ethereum", basisPoints: 5000 }
  ],
  nonce: 1701234567, // timestamp
  deadline: 1701238167 // timestamp + 1 hour
}
```

## Next Steps

The signed message would be submitted to an Agoric bridge/API to execute the actual portfolio operation via cross-chain orchestration.
