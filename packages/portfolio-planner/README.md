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
  loop inbound funds trigger rebalance
    portfolio -->> EE: event(bank.Send, portfolio1, $5000)
    EE -->> portfolio: vstorageGet(portfolio1, goals)
    EE -->> manager: rebalanceTx(portfolio1, next-goal<br/> [[portfolio1, LCAorch, $5000], ...goal-steps])
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

- TODO: `HD_SEED`: BIP39 Seed/mnemonic to use for generating keys
- TODO: `HD_PATH`: Default BIP44 path (`m/44'/118'/0'/0/0`)
- `AGORIC_RPC_URL`: URL for the Agoric chain's RPC node (`http://localhost:26657`)
- `REDIS_REST_URL`: URL for `@upstash/redis` (including explicit port number)
- `REDIS_REST_TOKEN`: API token for `REDIS_REST_URL`

## Architecture



## License

Apache-2.0
