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

### Manual Transaction Tool

A unified tool for manually processing and resolving transactions:

```bash
./scripts/tx-tool.ts <command> [options]
```

#### Commands

**scan** - Process a pending transaction by reading from vstorage
```bash
./scripts/tx-tool.ts scan <txId> [--verbose]
```

Examples:
```bash
./scripts/tx-tool.ts scan tx233
./scripts/tx-tool.ts scan tx233 --verbose
```

Use cases:
- Re-process a transaction that may have been skipped or failed
- Debug transaction processing issues
- Manually trigger transaction handling in development/testing

**settle** - Manually mark a transaction as succeeded or failed
```bash
./scripts/tx-tool.ts settle <txId> <status> [reason]
```

Examples:
```bash
./scripts/tx-tool.ts settle tx399 success
./scripts/tx-tool.ts settle tx400 fail "Transaction timeout"
./scripts/tx-tool.ts settle tx401 fail "Unable to confirm on destination chain"
```

Use cases:
- Manually resolve stuck transactions
- Administrative cleanup of transaction states
- Document specific failure reasons for audit purposes

Run `./scripts/tx-tool.ts` without arguments to see full usage.

#### Setup for Local Use

These tools are intended for **debugging and manual intervention**, run locally by developers:

1. **Configure environment** - Set up your `.env` with the target network config (production, testnet, or local):
   - RPC endpoints
   - Contract addresses
   - Mnemonic
   - Other service configuration

2. **Set database path** - Point `SQLITE_DB_PATH` to a local file:
   ```bash
   SQLITE_DB_PATH=./local-dev.db
   ```
   Use a local database file path that exists on your machine.

**Usage scenarios:**
- Debug transaction processing issues
- Manually settle stuck transactions
- Test transaction handling against testnet or production data

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
- `AGORIC_REST_URL`: Overrides the default Agoric REST endpoint (sourced from `chain-registry`) used for account-state queries (optional)
- `GRAPHQL_ENDPOINTS`: JSON text for a Record\<dirname, url[]> object describing endpoints associated with each api-\* GraphQL API directory under [graphql](./src/graphql) (optional)
- `SQLITE_DB_PATH`: The path where the SQLiteDB used by the resolver should be created. While a relative path can be provided (relative to the cwd),
an absolute path is recommended
- `YDS_URL`: Base URL of the YMax Data Service API, for sending transaction settlement notifications (optional)
- `YDS_API_KEY`: API key for authenticating with YDS (required with `YDS_URL`)
- `DOTENV`: Path to environment file containing defaults of above (default ".env")

## External Service Dependencies

The planner connects to external services for balance queries, gas estimation, and
event subscriptions:
* **Alchemy RPC**: query EVM balances directly
  * ERC-20 `balanceOf` (Aave aTokens, Compound cUSDCv3, chain-specific USDC)
  * Beefy vaults `balanceOf` and `getPricePerFullShare` (mooToken → underlying)
  * ERC-4626 vaults `balanceOf` and `convertToAssets` (Morpho, etc.)
* **Spectrum Blockchain API**: query non-EVM token balances (Agoric USDC/USDN, Noble)
* **Axelar API**: estimate cross-chain gas fees (GMP)
* **Agoric CometBFT RPC**: subscribe to chain events via WebSocket
* **Agoric Cosmos REST**: query for account data
* **Google Cloud Secret Manager**: retrieve Agoric wallet mnemonic for signing transactions
* **YMax Data Service**: send notifications when monitored transactions settle

### Alchemy RPC

**Env var**: `ALCHEMY_API_KEY`

WebSocket connections to wss://$subdomain.g.alchemy.com/v2/$ALCHEMY_API_KEY
allow queries against EVM chains (Arbitrum, Avalanche, Base, Ethereum, Optimism,
and their testnets) by calling contract methods directly:

- **Aave / Compound**: Simple `balanceOf` — receipt tokens (aTokens, cUSDCv3)
  already represent underlying USDC value.
- **Beefy vaults**: `balanceOf` returns mooToken shares, then
  `getPricePerFullShare()` (1e18 precision) converts to underlying value.
- **ERC-4626 vaults** (Morpho, etc.): `balanceOf` returns vault shares, then
  `convertToAssets(shares)` converts to underlying value.
- **USDC on EVM chains**: Simple `balanceOf` on the USDC token contract.

### Spectrum Blockchain API

**Env var**: `GRAPHQL_ENDPOINTS` (endpoint URLs associated with JSON member name
"api-spectrum-blockchain" and
[corresponding directory](./src/graphql/api-spectrum-blockchain))

Supports `getBalances` GraphQL queries to retrieve balances for **non-EVM**
accounts (Agoric, Noble), with failover across multiple URLs.

### Axelar API

**Env var**: `CLUSTER`/`AGORIC_NET` (for selecting mainnet vs. testnet endpoint)

Estimates gas fees for cross-chain transfers via Axelar's General Message
Passing protocol. Called during rebalance planning to account for transfer costs.

- Mainnet: `https://api.axelarscan.io/`
- Testnet: `https://testnet.api.axelarscan.io/`

### Agoric CometBFT RPC / Cosmos REST

**Env vars**: `CLUSTER`/`AGORIC_NET`, `COSMOS_REST_TIMEOUT`, `COSMOS_REST_RETRIES`

Connects to an Agoric RPC node. Two transports are used:
- **WebSocket RPC** (`CosmosRPCClient`): subscribes to CometBFT events
  (`/websocket` with query `tm.event = 'NewBlock'`) to drive the rebalance loop.
  Also used to fetch block timestamps and verify chain ID at startup.
- **HTTP REST** (`CosmosRestClient`): queries for account data
  (`/cosmos/auth/v1beta1/accounts/{address}`), which includes the sequence
  number.

### Google Cloud Secret Manager

**Env vars**: `GCP_PROJECT_ID` (default `simulationlab`), `GCP_SECRET_NAME` (default `YMAX_CONTROL_MNEMONIC`), `MNEMONIC`

Used once at startup to retrieve the wallet mnemonic for signing transactions.
Fetches `projects/{projectId}/secrets/{secretName}/versions/latest` via the
`@google-cloud/secret-manager` client. If `MNEMONIC` is set directly in the
environment, the GCP lookup is skipped.

### YMax Data Service (YDS)

**Env vars**: `YDS_URL`, `YDS_API_KEY`

Is sent notifications when monitored transactions settle. After a CCTP transfer,
GMP transfer, or smart wallet transaction is confirmed, the planner POSTs the transaction ID and on-chain hash to `{YDS_URL}/flow-step-tx-hashes`
with the `x-resolver-auth-key` header. The service is optional — if `YDS_URL`
is not set, notifications are silently skipped.

## Architecture



## License

Apache-2.0
