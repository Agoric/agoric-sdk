# Portfolio Planner

### Subscribe to portfolios and rebalance

```mermaid
sequenceDiagram
  title subscribe and rebalance
  autonumber

  actor trader as trader<br/>webUI<br/>wallet

  box rgb(187, 45, 64) Agoric
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

Node.js and yarn per [agoric-sdk Prerequisites](../../README.md#prerequisites).

### Setup

1. Install dependencies:
```bash
yarn install
```
2. Optionally run a local Docker version of the planner's dependencies:
```bash
yarn start:deps
```

### Local Development

```bash
yarn dev
```

This starts the development server with hot reloading.

### Testing

```bash
yarn test
```

## Configuration

Environment variables:

- `AGORIC_NET`: agoric.net subdomain for requesting URL path `/network-config` to identify `chainName`/`rpcAddrs`/etc. (default `main`)
- `ALCHEMY_API_KEY`: API key for accessing Alchemy’s Ethereum RPC endpoint (optional, but necessary for using that service)
- `MNEMONIC`: For the private key used to sign transactions (required)
- `SPECTRUM_API_URL`: URL for the [Spectrum](https://spectrumnodes.com/) API (default `https://pools-api.spectrumnodes.com`)
- `SPECTRUM_API_TIMEOUT`: Milliseconds to wait for each Spectrum request (default `10000` = 10 seconds)
- `SPECTRUM_API_RETRIES`: Retry count for Spectrum requests (default `3`)
- `DOTENV`: Path to environment file containing defaults of above (default `.env`)

## Architecture



## License

Apache-2.0
