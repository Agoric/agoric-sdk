export const MINT_DENOM = 'uag';
export const STAKING_DENOM = 'uagstake';
export const GOV_DEPOSIT_COINS = [{ amount: '10000000', denom: MINT_DENOM }];

// A JSON Merge Patch for an exported genesis.json.
export const genesisMergePatch = {
  app_state: {
    staking: {
      params: {
        bond_denom: STAKING_DENOM,
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
  consensus_params: {
    block: {
      // This is necessary until https://github.com/cosmos/cosmos-sdk/issues/6446 is closed.
      time_iota_ms: '1000',
    },
  },
};

// The JSON merge patch for the config.toml.
export function makeConfigMergePatch(portNum) {
  const rpcPort = Number(portNum);
  const configMergePatch = {
    proxy_app: 'kvstore',
    consensus: {
      // Make blocks run faster than normal.
      timeout_commit: '2s',
    },
    p2p: {
      laddr: `tcp://0.0.0.0:${rpcPort - 1}`,
    },
    rpc: {
      laddr: `tcp://127.0.0.1:${rpcPort}`,
    },
  };
  return configMergePatch;
}
