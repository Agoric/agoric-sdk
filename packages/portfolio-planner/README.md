# Portfolio Planner

### Subscribe to portfolios and rebalance

```mermaid
sequenceDiagram
  title subscribe and rebalance
  autonumber

  actor trader as trader<br/>webUI<br/>wallet

  box rgb(255,153,153) Agoric
    participant portfolio as portfolio<br/>manager
    participant LCAin as trader<br/>portfolio
  end

  participant EE

  %% Notation: ->> for initial message, -->> for consequences

  trader ->> portfolio: open($5000, <br />1/3 A 1/2 C, no-steps)
  par initial funds
    portfolio -->> EE: event(portfolioOpen, LCAin, 1/3 A 1/2 C, no-steps)
    portfolio ->> LCAin: bank.Send(LCAin, $5000)
    EE -->> LCAin: subscribe
  end
  loop inbound funds trigger rebalance
    alt poll queryBalances
      EE -->> LCAin: queryBalances
      LCAin -->> EE: balancesResult(LCAin, $5000)
    end
    alt subscribe reported an event
      LCAin -->> EE: event(bank.Send, LCAin, $5000)
    end
    EE -->> portfolio: rebalanceTx(trader,<br/> [[LCAin, LCAorch, $5000], ...steps])
    portfolio -->> LCAin: rebalance(steps)
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

### Local Development

```bash
npm run dev
```

This starts the development server with hot reloading.

### Deployment

```bash
npm run deploy
```

### Testing

```bash
npm test
```

## Configuration

Environment variables:

- `HD_SEED`: BIP39 Seed/mnemonic to use for generating keys
- `HD_PATH`: Default BIP44 path (default: `m/44'/118'/0'/0/0`)

## Architecture

## License

Apache-2.0
