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

### Codegen

Build type-aware representations of GraphQL APIs under [src/graphql](./src/graphql):
```bash
yarn codegen && yarn lint:graphql
```

### Local Development

```bash
yarn dev --dry-run
```

This starts the development server with hot reloading (omit `--dry-run` to make
the planner actually sign and submit actions rather than just logging them).

### Testing

```bash
yarn test
```

### Manual Transaction Tools

Two utility commands are available for manually processing and resolving transactions:

#### Process Transaction

Manually process a pending transaction.

```bash
yarn process-tx <txId> [--verbose]
```

**Examples:**
```bash
yarn process-tx tx233
yarn process-tx tx233 --verbose
```
**Use cases:**
- Re-process a transaction that may have been skipped or failed
- Debug transaction processing issues
- Manually trigger transaction handling in development/testing

#### Resolve Transaction

Manually mark a pending transaction as succeeded or failed.

```bash
yarn resolve-tx <txId> <status>
```

Where `<status>` is one of: `success`, `succeeded`, `fail`, `failed`, or `failure`

**Examples:**
```bash
yarn resolve-tx tx399 success
yarn resolve-tx tx400 fail
```
**Use cases:**
- Manually resolve stuck transactions
- Administrative cleanup of transaction states

#### Required Environment Variables

These tools use the same configuration as the main planner service. You can use a `.env` file or set environment variables directly.

## Configuration

Environment variables:

- `CLUSTER`: "local", "testnet", or "mainnet" to specify the respective
  collection of networks to use, in which "local" is currently incomplete and
  overlaps with "testnet" (default derived from `AGORIC_NET`).
  This setting is also used to derive the correct `axelarApiUrl` for the selected network cluster.
- `AGORIC_NET`: network specifier per
  [Agoric SDK Environment Variables](../../docs/env.md), either "$subdomain" for
  requesting MinimalNetworkConfig from URL
  [https://$subdomain.agoric.net/network-config](https://all.agoric.net/) or
  "$subdomain,$chainId" or "$fqdn,$chainId" for sending cosmos-sdk RPC requests
  to $subdomain.rpc.agoric.net or $fqdn (respectively) and assuming the chain ID
  (default derived from `CLUSTER`, falling back to "local")
- `CONTRACT_INSTANCE`: Contract instance identifier, either "ymax0" (dev) or "ymax1" (prod) (required)
- `ALCHEMY_API_KEY`: API key for accessing Alchemy's RPC endpoint (required, but not verified at startup)
  - **Important**: For all EVM chains in `AxelarChain` (see `packages/portfolio-api/src/constants.js`), ensure they are enabled in your Alchemy dashboard.
- `GCP_PROJECT_ID`: For fetching an unset `MNEMONIC` from the Google Cloud Secret Manager (default "simulationlab")
- `GCP_SECRET_NAME`: For fetching an unset `MNEMONIC` from the Google Cloud Secret Manager (default "YMAX_CONTROL_MNEMONIC")
- `MNEMONIC`: For the private key used to sign transactions (optional, but if not provided then it will be retrieved from the Google Cloud Secret Manager using `GCP_PROJECT_ID` and `GCP_SECRET_NAME`)
- `DEPOSIT_BRAND_NAME`: For identifying funds to manage by matching against `issuerName` in vstorage data at path "published.agoricNames.vbankAsset" (default "USDC")
- `FEE_BRAND_NAME`: For identifying how to pay [Axelar Cosmos–EVM] transfer fees by matching against `issuerName` in vstorage data at path "published.agoricNames.vbankAsset" (default "BLD")
- `REQUEST_TIMEOUT`: Milliseconds to wait for each external request (default "10000" = 10 seconds)
- `REQUEST_RETRIES`: Retry count for external requests (default "3")
- `COSMOS_REST_TIMEOUT`: Overrides `REQUEST_TIMEOUT` for Agoric/Noble/etc. Cosmos REST APIs (optional)
- `COSMOS_REST_RETRIES`: Overrides `REQUEST_RETRIES` for Agoric/Noble/etc. Cosmos REST APIs (optional)
- `GRAPHQL_ENDPOINTS`: JSON text for a Record\<dirname, url[]> object describing endpoints associated with each api-\* GraphQL API directory under [graphql](./src/graphql) (optional)
- `SPECTRUM_API_URL`: URL for the [Spectrum](https://spectrumnodes.com/) API (default "https://pools-api.spectrumnodes.com")
- `SPECTRUM_API_TIMEOUT`: Overrides `REQUEST_TIMEOUT` for the Spectrum REST API (optional)
- `SPECTRUM_API_RETRIES`: Overrides `REQUEST_RETRIES` for the Spectrum REST API (optional)
- `SQLITE_DB_PATH`: The path where the SQLiteDB used by the resolver should be created. While a relative path can be provided (relative to the cwd), 
an absolute path is recommended 
- `DOTENV`: Path to environment file containing defaults of above (default ".env")

## Architecture



## License

Apache-2.0
