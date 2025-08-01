# Portfolio Planner

### Subscribe to portfolios and rebalance

```mermaid
sequenceDiagram
  title subscribe and rebalance
  autonumber

  actor trader as trader<br/>webUI<br/>wallet

  box rgb(255,153,153) Agoric
    participant manager as portfolio<br/>manager
    participant portfolio as trader<br/>portfolio
  end

  participant EE
  EE -->> manager: rpc.subscribe(all block events)
  loop recover by polling balances
    EE -->> portfolio: rpc.queryBalances(portfolio$N)
  end

  %% Notation: ->> for initial message, -->> for consequences

  trader ->> manager: open($5000, default-goal)
  par initial funds
    manager -->> EE: vstorageAppend(portfolios, "portfolio1")
    EE -->> portfolio: vstorageGet(portfolio1 address)
    EE -->> EE: add portfolio1 address to event filter
    manager ->> portfolio: bank.Send(portfolio1, $5000)
  end
  loop inbound funds on portfolio$N trigger rebalance
    portfolio -->> EE: event(bank.Send, portfolio$N, $unknown)
    EE -->> portfolio: rpc.queryBalances(portfolio$N)
    EE -->> portfolio: vstorageGet(portfolio$N, goals)
    EE -->> manager: rebalanceTx(portfolio$N, next-goal<br/>[{src: portfolio$N, dst: LCAorch$N, amt: $5000},<br/> ...goal-steps])
    manager -->> portfolio: rebalance(steps)
  end
```

## Development

### Prerequisites

- Node.js 20+
- yarn

### Setup

1. Install dependencies:
```bash
yarn install
```
2. Optionally run a local Docker version of the planner's dependencies:
```bash
npm run start:deps
```

### Local Development

```bash
npm run dev
```

This starts the development server with hot reloading.

### Testing

```bash
npm test
```

## Configuration

Environment variables:

- `AGD`: Executable for the Cosmos command-line interface (`agd`)
- `AGORIC_RPC_URL`: URL for the Agoric chain's RPC node (`http://localhost:26657`)
- `CHAIN_ID`: Chain ID for transactions to the Agoric chain (autodetect via RPC)
- `FROM`: Existing AGD key for sending transactions to Agoric (`planner`)
- `HOME`: Where AGD state is kept, namely `$HOME/.agoric`
- `REDIS_URL`: URL for Redis service
- `DOTENV`: Path to environment file containing defaults of above (`.env`)

## Architecture



## License

Apache-2.0
