import jsonmergepatch from 'json-merge-patch';
import djson from 'deterministic-json';
import TOML from '@iarna/toml';

export const MINT_DENOM = 'uag';
export const STAKING_DENOM = 'uagstake';
export const GOV_DEPOSIT_COINS = [{ amount: '10000000', denom: MINT_DENOM }];
export const BLOCK_CADENCE_S = 2;

export const ORIG_BLOCK_CADENCE_S = 5;
export const ORIG_SIGNED_BLOCKS_WINDOW = 100;

// TODO: When Tendermint non-zero height exports work, we can improve.
// TODO: When we export Agoric vat state as well, don't blacklist.
const EXPORTED_APP_STATE_BLACKLIST = ['capability', 'ibc'];

// Rewrite the config.toml and genesis.json.
export function finishCosmosConfigs({
  genesisJson,
  configToml,
  exportedGenesisJson,
  portNum = '26657',
  persistentPeers = '',
}) {
  const genesis = JSON.parse(genesisJson);
  const config = TOML.parse(configToml);

  const exported = exportedGenesisJson ? JSON.parse(exportedGenesisJson) : {};

  const genesisMergePatch = {
    app_state: {
      staking: {
        params: {
          bond_denom: STAKING_DENOM,
        },
      },
      slashing: {
        params: {
          // We scale this parameter according to our own block cadence, so
          // that we tolerate the same downtime as the old genesis.
          signed_blocks_window: `${Math.ceil(
            (ORIG_BLOCK_CADENCE_S * ORIG_SIGNED_BLOCKS_WINDOW) /
              BLOCK_CADENCE_S,
          )}`,
        },
      },
      mint: {
        // Zero inflation, for now.
        minter: {
          inflation: '0.0',
        },
        params: {
          inflation_rate_change: '0.0',
          inflation_min: '0.0',
          mint_denom: MINT_DENOM,
        },
      },
      crisis: {
        constant_fee: {
          denom: MINT_DENOM,
        },
      },
      gov: {
        deposit_params: {
          min_deposit: GOV_DEPOSIT_COINS,
        },
      },
      auth: {
        params: {
          tx_size_cost_per_byte: '1',
        },
      },

      // Remove IBC and capability state.
      // TODO: This needs much more support to preserve contract state
      // between exports in order to be able to carry forward IBC conns.
      capability: null,
      ibc: null,
    },
  };

  // The JSON merge patch for the config.toml.
  const rpcPort = Number(portNum);
  const configMergePatch = {
    proxy_app: 'kvstore',
    consensus: {
      // Enforce our inter-block delays for this node.
      timeout_commit: `${BLOCK_CADENCE_S}s`,
    },
    p2p: {
      laddr: `tcp://0.0.0.0:${rpcPort - 1}`,
      persistent_peers: persistentPeers,
    },
    rpc: {
      laddr: `tcp://127.0.0.1:${rpcPort}`,
    },
    tx_index: {
      // Needed for IBC.
      index_all_keys: true,
    },
  };

  const finishedGenesis = jsonmergepatch.apply(genesis, genesisMergePatch);

  // We upgrade from export data, blacklisting states we don't support.
  const { app_state: exportedAppState = {} } = exported;
  for (const state in exportedAppState) {
    if (!EXPORTED_APP_STATE_BLACKLIST.includes(state)) {
      finishedGenesis.app_state[state] = exportedAppState[state];
    }
  }
  if ('consensus_params' in exported) {
    finishedGenesis.consensus_params = exported.consensus_params;
  }

  // This is necessary until https://github.com/cosmos/cosmos-sdk/issues/6446 is closed.
  finishedGenesis.consensus_params.block.time_iota_ms = '1000';

  const newGenesisJson = djson.stringify(finishedGenesis);

  const finishedConfig = jsonmergepatch.apply(config, configMergePatch);
  const newConfigToml = TOML.stringify(finishedConfig);

  return { newGenesisJson, newConfigToml };
}
