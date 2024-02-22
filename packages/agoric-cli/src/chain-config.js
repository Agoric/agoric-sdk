import djson from 'deterministic-json';
import TOML from '@iarna/toml';
import * as Tokens from '@agoric/internal/src/tokens.js';

export const STAKING_MAX_VALIDATORS = 150;
// Required for IBC connections not to time out.
export const STAKING_MIN_HISTORICAL_ENTRIES = 10000;
export const ICA_HOST_ALLOW_MESSAGES = [
  '/agoric.*',
  '/ibc.*',
  // Everything except for cosmos.st*
  '/cosmos.[a-rt-z]*',
  '/cosmos.s[a-su-z]*',
];

const Stake = /** @type {const} */ ({
  name: Tokens.Stake.proposedName,
  description: 'The token used by delegates to stake on the Agoric chain',
  denom_units: [
    {
      denom: Tokens.Stake.denom,
      exponent: 0,
    },
    {
      denom: 'bld',
      exponent: Tokens.Stake.displayInfo.decimalPlaces,
    },
  ],
  base: Tokens.Stake.denom,
  display: 'bld',
  symbol: Tokens.Stake.symbol,
});
const Stable = /** @type {const} */ ({
  name: Tokens.Stable.proposedName,
  description: 'The stable token used by the Agoric chain',
  denom_units: [
    {
      denom: Tokens.Stable.denom,
      exponent: 0,
    },
    {
      denom: 'ist',
      exponent: Tokens.Stable.displayInfo.decimalPlaces,
    },
  ],
  base: Tokens.Stable.denom,
  display: 'ist',
  symbol: Tokens.Stable.symbol,
});
export const DENOM_METADATA = /** @type {const} */ ([Stake, Stable]);

export const CENTRAL_DENOM = Stable.base;
export const MINT_DENOM = Stake.base;
export const STAKING_DENOM = Stake.base;

export const GOV_DEPOSIT_COINS = [{ amount: '1000000', denom: MINT_DENOM }];
export const GOV_VOTING_PERIOD = '36h';
export const DEFAULT_MINIMUM_GAS_PRICES = `0${CENTRAL_DENOM}`;

// Can't beat the speed of light, we need 600ms round trip time for the other
// side of Earth, and multiple round trips per block.
//
// 5 seconds is about as fast as we can go without penalising validators.
export const BLOCK_CADENCE_S = 5;
export const RPC_BROADCAST_TIMEOUT_S = 30;
export const RPC_MAX_BODY_BYTES = 15_000_000;

export const EPOCH_DURATION_S = 60 * 60; // 1 hour
export const BLOCKS_PER_EPOCH =
  BigInt(EPOCH_DURATION_S) / BigInt(BLOCK_CADENCE_S);
export const PER_EPOCH_REWARD_FRACTION = '0.1';

export const ORIG_BLOCK_CADENCE_S = 5;
export const ORIG_SIGNED_BLOCKS_WINDOW = 100;
export const SIGNED_BLOCKS_WINDOW_BASE_MULTIPLIER = 100;

export const DEFAULT_CHAIN_ID = 'agoriclocal';
export const DEFAULT_ROSETTA_PORT = 8080;
export const DEFAULT_GRPC_PORT = 9090;
export const DEFAULT_RPC_PORT = 26657;
export const DEFAULT_PROM_PORT = 26660;
export const DEFAULT_API_PORT = 1317;

// Rewrite the app.toml.
export function finishCosmosApp({
  appToml,
  enableCors,
  exportMetrics,
  portNum = `${DEFAULT_RPC_PORT}`,
  chainId = DEFAULT_CHAIN_ID,
  enableRosetta = true,
  rosettaPort = `${DEFAULT_ROSETTA_PORT}`,
}) {
  const rpcPort = Number(portNum);
  const app = TOML.parse(appToml);

  if (enableCors) {
    app.api['enabled-unsafe-cors'] = true;
  }

  if (!app['minimum-gas-prices']) {
    // Set the default, to prevent a warning if there is an empty string.
    app['minimum-gas-prices'] = DEFAULT_MINIMUM_GAS_PRICES;
  }

  // Offset the GRPC listener from our rpc port.
  app.grpc.address = `0.0.0.0:${
    rpcPort + DEFAULT_GRPC_PORT - DEFAULT_RPC_PORT
  }`;

  // Lengthen the pruning span.
  app.pruning = 'custom';
  app['pruning-keep-recent'] = '10000';
  app['pruning-keep-every'] = '50000';
  app['pruning-interval'] = '1000';

  const apiPort =
    DEFAULT_API_PORT + Math.ceil((rpcPort - DEFAULT_RPC_PORT) / 100);
  if (exportMetrics) {
    app.api.laddr = `tcp://0.0.0.0:${apiPort}`;
    app.api.enable = true;
    app.telemetry.enabled = true;
    app.telemetry['prometheus-retention-time'] = 60;
  }

  // Optionally enable the rosetta service
  if (enableRosetta) {
    app.rosetta.enable = enableRosetta;
    app.rosetta.network = chainId;
    app.rosetta.retries = 30;
  }

  if (rosettaPort !== `${DEFAULT_ROSETTA_PORT}`) {
    // Rosetta doesn't want a scheme
    app.rosetta.address = `0.0.0.0:${rosettaPort}`;
  }

  return TOML.stringify(app);
}

// Rewrite the config.toml.
export function finishTendermintConfig({
  configToml,
  enableCors,
  exportMetrics,
  portNum = `${DEFAULT_RPC_PORT}`,
  persistentPeers = '',
  seeds = '',
  unconditionalPeerIds = '',
}) {
  const rpcPort = Number(portNum);

  // Adjust the config.toml.
  const config = TOML.parse(configToml);

  config.proxy_app = 'kvstore';

  // Enforce our inter-block delays for this node.
  config.consensus.timeout_commit = `${BLOCK_CADENCE_S}s`;

  // Update addresses in the config.
  config.p2p.laddr = `tcp://0.0.0.0:${rpcPort - 1}`;
  config.p2p.persistent_peers = persistentPeers;
  config.p2p.unconditional_peer_ids = unconditionalPeerIds;
  config.p2p.seeds = seeds;
  config.rpc.laddr = `tcp://0.0.0.0:${rpcPort}`;
  config.rpc.max_body_bytes = RPC_MAX_BODY_BYTES;
  config.mempool.max_tx_bytes = RPC_MAX_BODY_BYTES;
  config.rpc.timeout_broadcast_tx_commit = `${RPC_BROADCAST_TIMEOUT_S}s`;

  if (
    enableCors &&
    (!config.rpc.cors_allowed_origins ||
      config.rpc.cors_allowed_origins.length === 0)
  ) {
    config.rpc.cors_allowed_origins = ['*'];
  }

  if (exportMetrics) {
    const promPort = rpcPort - DEFAULT_RPC_PORT + DEFAULT_PROM_PORT;
    config.instrumentation.prometheus = true;
    config.instrumentation.prometheus_listen_addr = `:${promPort}`;
  }

  // Needed for IBC.
  config.tx_index.index_all_keys = true;

  // Stringify the new config.toml.
  return TOML.stringify(config);
}

// Rewrite/import the genesis.json.
export function finishCosmosGenesis({ genesisJson, exportedGenesisJson }) {
  const genesis = JSON.parse(genesisJson);
  const exported = exportedGenesisJson ? JSON.parse(exportedGenesisJson) : {};

  // We upgrade from export data.
  const { app_state: exportedAppState } = exported;
  const { ...initState } = genesis.app_state;
  if (exportedAppState) {
    genesis.app_state = exportedAppState;
  }

  // Remove IBC state.
  // TODO: This needs much more support to preserve contract state
  // between exports in order to be able to carry forward IBC conns.
  genesis.app_state.ibc = initState.ibc;
  genesis.app_state.capability = initState.capability;

  genesis.app_state.bank.denom_metadata = DENOM_METADATA;
  genesis.app_state.interchainaccounts.host_genesis_state.params.allow_messages =
    ICA_HOST_ALLOW_MESSAGES;

  genesis.app_state.staking.params.bond_denom = STAKING_DENOM;
  genesis.app_state.staking.params.max_validators = STAKING_MAX_VALIDATORS;
  const { historical_entries: existingHistoricalEntries = 0 } =
    genesis.app_state.staking.params;
  genesis.app_state.staking.params.historical_entries = Math.max(
    existingHistoricalEntries,
    STAKING_MIN_HISTORICAL_ENTRIES,
  );

  // We scale this parameter according to our own block cadence, so
  // that we tolerate the same downtime as the old genesis.
  genesis.app_state.slashing.params.signed_blocks_window = `${
    SIGNED_BLOCKS_WINDOW_BASE_MULTIPLIER *
    Math.ceil(
      (ORIG_BLOCK_CADENCE_S * ORIG_SIGNED_BLOCKS_WINDOW) / BLOCK_CADENCE_S,
    )
  }`;

  // Zero inflation, for now.
  genesis.app_state.mint.minter.inflation = '0.0';
  genesis.app_state.mint.params.inflation_rate_change = '0.0';
  genesis.app_state.mint.params.inflation_min = '0.0';

  // Set the denomination for different modules.
  genesis.app_state.mint.params.mint_denom = MINT_DENOM;
  genesis.app_state.gov.deposit_params.min_deposit = GOV_DEPOSIT_COINS;
  genesis.app_state.gov.voting_params.voting_period = GOV_VOTING_PERIOD;

  // Reduce the cost of a transaction.
  genesis.app_state.auth.params.tx_size_cost_per_byte = '1';

  // Until we have epoched distribution, we manually set the fee disbursement.
  if (
    genesis.app_state.vbank.params?.reward_epoch_duration_blocks !== undefined
  ) {
    genesis.app_state.vbank.params.reward_epoch_duration_blocks = `${BLOCKS_PER_EPOCH}`;
  }
  genesis.app_state.vbank.params.per_epoch_reward_fraction =
    PER_EPOCH_REWARD_FRACTION;
  if (genesis.app)
    if ('consensus_params' in exported) {
      // Use the same consensus_params.
      genesis.consensus_params = exported.consensus_params;
    }

  // Give some continuity between chains.
  if ('initial_height' in exported) {
    genesis.initial_height = exported.initial_height;
  }

  return djson.stringify(genesis);
}
