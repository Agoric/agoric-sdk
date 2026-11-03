# Gas Estimate Compatibility

Beans v2 relies on the standard Cosmos simulation path for client compatibility. During simulation, bean fee settlement consumes extra gas derived from the bean fee and `x/swingset`'s `min_gas_price`; during execution, the same `min_gas_price` is enforced against the signed fee. A tx submission client is therefore Beans-v2-compatible when it signs a fee derived from a live gas simulation, initializes its default fee price from the chain's current swingset params, and caches that value for normal submissions.

The current `min_gas_price` is available from the swingset params query. All forms return `params.min_gas_price` as DecCoin entries; clients should select the entry whose `denom` matches the fee denom they will sign. If no fee denom is selected and the query returns multiple entries, warn that `min_gas_price` is ambiguous and use the first entry.

CLI:

```sh
params_json=$(agd query swingset params --output json)
min_gas_price=$(jq -r '.params.min_gas_price[] | select(.denom == "ubld") | "\(.amount)\(.denom)"' <<<"$params_json")
```

API server:

```js
const response = await fetch(`${apiUrl}/agoric/swingset/params`);
const { params } = await response.json();
const minGasPrice = params.min_gas_price.find(({ denom }) => denom === feeDenom);
if (!minGasPrice) throw Error(`no swingset min_gas_price for ${feeDenom}`);
```

CometBFT RPC, using the proto3 swingset `rpc Params(QueryParamsRequest)` query:

```js
import { QueryClient, createProtobufRpcClient } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import { QueryParamsRequest, QueryParamsResponse } from '@agoric/cosmic-proto/agoric/swingset/query.js';

const tmClient = await Tendermint34Client.connect(rpcUrl);
const rpc = createProtobufRpcClient(new QueryClient(tmClient));
const request = QueryParamsRequest.encode({}).finish();
const response = await rpc.request('agoric.swingset.Query', 'Params', request);
const { params } = QueryParamsResponse.decode(response);
const minGasPrice = params.minGasPrice.find(({ denom }) => denom === feeDenom);
if (!minGasPrice) throw Error(`no swingset min_gas_price for ${feeDenom}`);
```

The useful pattern is:

1. initialize the client by querying `agd query swingset params --output json` or `/agoric/swingset/params`, read `params.min_gas_price`, and cache the gas price for the fee denom,
2. simulate the exact messages to be submitted,
3. multiply the returned gas by the helper's `--gas-adjustment=<multiplier>` value, if it specifies one,
4. compute the signed fee as `adjustedGas * cachedGasPrice`.

For `agd` command helpers, this means any path that submits with `--gas=auto` and supports an optional `--gas-adjustment=<multiplier>` should default to `--gas-prices=min`. Before invoking SDK tx handling, the Agoric command wrapper resolves `min` to a concrete `params.min_gas_price` DecCoin, caching the query result for normal submissions. The helper must respect explicit caller fee policy: if the caller provides `--gas-prices=<dec-coin>`, use it unchanged; if the caller provides `--fees=<coin>`, do not synthesize or resolve `--gas-prices=min`. Insufficient-fee failures should fail through unless the client already has a retry loop for failed submissions; in that case, the existing retry loop should refetch swingset params before rebuilding a defaulted fee.

For the shared Agoric CosmJS helper, the corresponding option should also be `gasPrices: 'min'` by default. The helper resolves `min` to a concrete CosmJS `GasPrice` before constructing a signing client or calculating an explicit `StdFee`. If the caller provides a concrete `GasPrice`, `StdFee`, or fixed fee amount, use it unchanged.

Fixed `StdFee` callers that skip simulation can still work only when manually oversized for both regular gas and bean settlement. They are not robust against governance changes to bean prices, fee-unit price, opted-in message types, or `min_gas_price`.

| Client or helper | Submission API | Exposes gas simulation? | Fixed gas price / fee model | Gas adjustment | Beans v2 compatibility |
| --- | --- | --- | --- | --- | --- |
| `agoric wallet send` in `packages/agoric-cli/src/commands/wallet.js`, via `execSwingsetTransaction` in `packages/agoric-cli/src/lib/chain.js` | `agd tx swingset wallet-action ... --gas=auto --gas-prices=min` | Yes. `--gas=auto` uses the chain simulate path before signing. | Compatible when the CLI defaults to `--gas-prices=min`, resolves it from current chain params, and respects explicit `--gas-prices` or `--fees`. | Yes, default `--gas-adjustment=1.2`. | Compatible for Beans v2 wallet actions when it resolves `min` from swingset params for defaulted fee policy. |
| Generic `agd` tx wrappers in `packages/orchestration/src/utils/agd-lib.js`, `packages/deploy-script-support/src/permissioned-deployment.js`, and `multichain-testing/tools/chaind-lib.js` | `agd tx ... --gas=auto --gas-prices=min` | Yes. The CLI simulates the concrete tx. | Compatible when default `--gas-prices=min` resolves from live params and explicit `--gas-prices` or `--fees` are left untouched. | Yes, these wrappers use `1.4`. | Compatible for Beans v2 if used against Agoric txs with auto gas and `min` resolution for defaulted fee policy. |
| `SigningStargateClient.signAndBroadcast(..., "auto")`, used directly in `a3p-integration/proposals/n:upgrade-next/test/chunked-bundle.test.ts` and supported by generated client types in `packages/cosmic-proto/src/codegen/types.ts` | Agoric wrapper around CosmJS `signAndBroadcast(address, msgs, "auto")` with default `gasPrices: "min"` | Yes. CosmJS simulates and computes a fee when the client was constructed with a `GasPrice`. | Compatible when the wrapper's default `gasPrices: "min"` resolves to a concrete `GasPrice` from cached live params. | CosmJS applies its configured multiplier/default adjustment; helpers should preserve any caller or helper-specified adjustment. | Compatible for Beans v2 when wrapped with cached param lookup for defaulted fee policy. |
| Manual CosmJS simulation in `packages/portfolio-deploy/scripts/install-bundle.ts` | `client.simulate(...)`, then `client.signAndBroadcast(..., fee)` | Yes. The script explicitly simulates. | Compatible because `makeFee` derives fee from simulated gas and a cached live-param price. | Yes, currently `1.3`. | Compatible for Beans v2 bundle submissions when initialization fetches swingset params for defaulted fee policy. |
| `makeSigningSmartWalletKit` / `makeSigningSmartWalletKitFromClient` in `packages/client-utils/src/signing-smart-wallet-kit.ts`, and consumers such as portfolio `wallet-admin` / `ymax-control` scripts | CosmJS `signAndBroadcast(address, messages, StdFee, memo)` or explicit `sign` plus `broadcastTx` | No. The default path uses a fixed `StdFee`; explicit signing also fixes the fee before broadcast. | Not automatically compatible. The default fee is a hardcoded gas and amount; some consumers pass larger fixed fees derived from constants. | No automatic adjustment. | Not robust for Beans v2. Callers should switch to `fee: "auto"` or explicit `client.simulate(...)` plus `gas * price` for Agoric wallet actions. |
| Legacy bundle publishing in `packages/agoric-cli/src/publish.js` | CosmJS `signAndBroadcast(..., Agoric.fee)` | No. The code uses a fixed fee object, currently `amount: []` and `gas: "50000000"`. | Not compatible once bean settlement requires real fee coins; fixed empty fee cannot cover bean fees. | No. | Not Beans-v2-compatible as written. Use the manual simulate pattern or `signAndBroadcast(..., "auto")` with a suitable `GasPrice`. |
| Portfolio authz/multisig artifact builders in `packages/portfolio-deploy/src/ymax-authz-flow.ts` | Builds unsigned sign docs with fixed `StdFee` | No live simulation at sign-doc creation time. | Fee is derived from a fixed gas constant and fixed price, so `gas * price` stays internally consistent but not simulation-derived. | No, except whatever margin is embedded in the chosen fixed gas constant. | Partially compatible only for pre-sized operational artifacts. For Beans v2, regenerate artifacts from a live simulation when possible; otherwise the fixed gas must include bean gas and the price must come from live queried params. |
| External-chain CosmJS scripts, for example `packages/fast-usdc/src/cli/util/noble.js`, `multichain-testing/tools/ibc-transfer.ts`, and Noble/Osmosis lab scripts | CosmJS `signAndBroadcast(..., StdFee)` | Usually no. These scripts generally use fixed external-chain `StdFee` values. | Fixed gas and fixed fee for non-Agoric chains. | No. | Beans v2 is Agoric-chain behavior, so these are not directly affected unless they submit Agoric opted-in messages. If adapted for Agoric wallet/swingset txs, they should use simulation. |

### Rework for `agoric wallet send`

Default the command to `--gas-prices=min` around the existing default path. The command already submits through `agd tx swingset wallet-action ... --gas=auto --gas-adjustment=1.2`, so it simulates the exact messages and signs a fee derived from adjusted gas; during initialization, query `agd query swingset params --output json`, derive the fee denom's gas price from `params.min_gas_price`, and cache it for submissions. Before SDK tx handling, resolve `--gas-prices=min` to the cached DecCoin; if the caller supplied `--gas-prices=<dec-coin>` or `--fees=<coin>`, do not resolve or replace their explicit fee policy. If `params.min_gas_price` has multiple entries and no fee denom is selected, warn that `min` is ambiguous and use the first entry. Do not add retry behavior unless this command already grows a general failed-submission retry loop; if it does, refetch swingset params before retrying a defaulted fee.

### Rework for Generic `agd` Tx Wrappers

Add the same `--gas-prices=min` resolver used by `agoric wallet send`. These wrappers already default to `--gas=auto` and a fixed adjustment; preserve whatever `--gas-adjustment=<multiplier>` the helper specifies, initialize by querying live swingset params, and resolve `min` to the cached gas price for defaulted Agoric txs. If the caller supplied `--gas-prices=<dec-coin>` or `--fees=<coin>`, pass insufficient-fee failures through without replacing their explicit fee policy. If `params.min_gas_price` has multiple entries and no fee denom is selected, warn that `min` is ambiguous and use the first entry. Only wrappers that already retry failed submissions should refetch swingset params and rebuild a defaulted fee before retrying.

### Rework for `SigningStargateClient.signAndBroadcast(..., "auto")`

Wrap `"auto"` submissions with cached param lookup and default `gasPrices: "min"`. Prefer call sites that pass `"auto"` rather than a fixed `StdFee`; initialize the helper by querying `/agoric/swingset/params` through the existing query transport, resolve `gasPrices: "min"` to a concrete `GasPrice` from the returned `params.min_gas_price` entry for the fee denom, and cache it. Where the surrounding helper exposes adjustment options, preserve the helper-specified multiplier; any user-configured gas price or fixed fee should be an override that fails through on insufficient-fee errors, not Beans-v2 policy to replace. Only clients that already retry failed submissions should refetch swingset params and rebuild a defaulted `GasPrice` before retrying.

### Rework for Manual CosmJS Simulation

Add cached live-param lookup to the core flow. The helper should initialize by querying `/agoric/swingset/params`, cache the fee denom's entry from `params.min_gas_price`, and standardize on `simulate -> adjustedGas -> cachedGasPrice fee -> signAndBroadcast`, using the helper-specified adjustment multiplier. Caller-supplied gas price or fixed fee overrides should fail through on insufficient-fee errors. This keeps the default independent of hardcoded Beans-v2 governance parameter values. Only helpers that already retry failed submissions should refetch swingset params and rebuild a defaulted fee before retrying.

### Rework for `makeSigningSmartWalletKit`

Change the default `sendAction` and spend-action paths from a fixed `StdFee` to an auto-fee path with `gasPrices: "min"`. The cleanest online default is to initialize the kit by querying `/agoric/swingset/params`, resolve `gasPrices: "min"` to a cached `GasPrice` derived from `params.min_gas_price`, and call `signAndBroadcast(address, messages, "auto", memo)`. For explicit sign-doc creation or offline signing, add a helper that first runs `client.simulate(address, messages, memo)`, multiplies by the helper-specified adjustment, computes `amount = adjustedGas * cachedGasPrice`, and embeds that `StdFee`; callers that provide a gas price or fixed fee override own that fee policy and should see insufficient-fee failures directly. If the kit later gains a general failed-submission retry loop, it should refetch swingset params before rebuilding a defaulted fee.

### Rework for Legacy Bundle Publishing

Replace the fixed `Agoric.fee` default with live simulation and `gasPrices: "min"`. The publishing path should initialize by querying live swingset params, then either call `signAndBroadcast(from.address, encodeObjects, "auto")` using a `GasPrice` resolved from `gasPrices: "min"`, or explicitly run `simulate`, apply the helper-specified adjustment, calculate a non-empty fee coin amount from the cached gas price, and submit that `StdFee`. The fixed empty-fee bundle path should not be used for Agoric txs once Beans v2 settlement is active. If publishing later adds a failed-submission retry loop, it should refetch swingset params before rebuilding a defaulted fee.

### Rework for Portfolio Authz/Multisig Artifact Builders

Artifact generation needs a simulation-backed online mode. When the signer environment can reach the chain, generate sign docs by simulating the exact messages, multiplying gas by the helper-specified adjustment, querying live swingset params, and computing the fee from the returned `params.min_gas_price` entry for the fee denom. Keep fixed-fee artifact generation only as an explicit offline mode whose constants are treated as review inputs and regenerated whenever Beans v2 params change.

### Rework for External-Chain CosmJS Scripts

None required for scripts that only submit to non-Agoric chains. If any of these helpers are reused for Agoric wallet or swingset txs, add an Agoric submission path that initializes by querying live swingset params, defaults to CosmJS `"auto"` or explicit `simulate -> adjustedGas -> cachedGasPrice fee`, and does not inherit the external chain's fixed `StdFee` defaults.

## Implementation

### `agd tx ...` wrapper

Implement `--gas-prices=min` as an Agoric command-layer sentinel before Cosmos SDK tx handling reads the tx flags. The wrapper lives in `golang/cosmos/daemon/cmd`, after module tx commands have been registered on the root `tx` command tree. It should traverse tx leaf commands and wrap their `RunE` or `PreRunE` so Agoric-specific defaulting runs before commands call `client.GetClientTxContext(cmd)` or `tx.GenerateOrBroadcastTxCLI(...)`.

The wrapper should apply only when the command is preparing a tx with `--gas=auto`. Agoric-owned helpers should default their gas-prices flag to `min`; explicit callers may still pass `--gas-prices=<dec-coin>` or `--fees=<coin>`.

Resolution rules:

1. If `--fees` was changed by the caller, leave `--fees` intact and do not resolve `--gas-prices=min`.
2. If `--gas-prices` was changed to a concrete DecCoin value, leave it intact.
3. If `--gas-prices=min`, query `x/swingset` params through `types.NewQueryClient(clientCtx).Params(...)`, select the `params.min_gas_price` entry for the chosen fee denom, and replace the flag value with the concrete DecCoin string before SDK tx generation.
4. If no fee denom is selected and `params.min_gas_price` has multiple entries, write a warning and use the first entry.
5. If `params.min_gas_price` is empty, fail with a clear error because `min` cannot resolve.

Cache the params query result for the process or command execution so repeated tx submissions from one helper do not query for every message. Do not add retry behavior in the wrapper; if a command already has a retry loop around failed submissions, that existing loop should clear or refresh the cache before retrying a defaulted fee.

### CosmJS Wrapper

Provide a shared Agoric CosmJS submission helper instead of open-coding `SigningStargateClient.signAndBroadcast(..., "auto")` or manual `simulate -> fee -> signAndBroadcast` at each call site. The helper's gas-prices option defaults to `min`; initialization queries `/agoric/swingset/params` or the proto `agoric.swingset.Query/Params` RPC, caches `params.min_gas_price`, and resolves `min` to a concrete `GasPrice` derived from the selected fee denom.

For online submissions, the helper should default to `signAndBroadcast(address, messages, "auto", memo)` with a client constructed from the `GasPrice` resolved from `gasPrices: "min"`. For manual fee construction, it should run `simulate`, apply the helper-specified adjustment, calculate the fee from that resolved `GasPrice`, and then call `signAndBroadcast` with the resulting `StdFee`.

The helper must preserve explicit fee policy. A caller-provided concrete `gasPrices`, `GasPrice`, `StdFee`, or fixed fee amount is an override; insufficient-fee errors from those submissions should pass through. If a CosmJS caller already retries failed tx submissions, its retry loop may refetch swingset params and rebuild only a defaulted fee before resubmitting.

### Ecosystem Coverage

These two layers are sufficient for Agoric-maintained submission paths that go through `agd` or the shared CosmJS helper. They are not sufficient for the entire ecosystem by themselves: external wallets, scripts that construct fixed `StdFee` values directly, browser extensions, custodial services, and third-party relayers must either use `agd` with `--gas-prices=min`, use the Agoric CosmJS helper, or independently implement the same `params.min_gas_price` lookup plus simulation pattern. The chain-side Beans v2 behavior still remains compatible with standard simulation, but clients that bypass these wrappers can underpay until they adopt the pattern.

## Practical Rule

For any Agoric tx that may include a Beans-v2 opted-in message type, prefer one of:

- `agd tx ... --gas=auto --gas-prices=min --gas-adjustment=<multiplier>`, with initialization that queries `agd query swingset params --output json`, caches `params.min_gas_price`, resolves `min` to a concrete DecCoin, and warns while using the first entry if no fee denom disambiguates multiple entries;
- CosmJS `signAndBroadcast(..., "auto")`, through an Agoric helper whose gas-prices option defaults to `min`, resolves `min` from `/agoric/swingset/params`, caches `params.min_gas_price`, and uses it as the default `GasPrice`;
- explicit `simulate -> calculateFee(simulatedGas * adjustment, cachedGasPrice) -> signAndBroadcast`, with `cachedGasPrice` initialized from live `params.min_gas_price`.

Avoid fixed `StdFee` for Agoric wallet and swingset submissions unless the caller deliberately owns the risk of updating those constants whenever Beans v2 parameters change.
