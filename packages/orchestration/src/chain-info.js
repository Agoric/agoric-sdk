// UNTIL https://github.com/Agoric/agoric-sdk/issues/8879

/** @file temporary static lookup of chain info */

/** @import {CosmosChainInfo, EthChainInfo} from './types.js'; */

/** @typedef {CosmosChainInfo | EthChainInfo} ChainInfo */

// TODO generate this automatically with a build script drawing on data sources such as https://github.com/cosmos/chain-registry

export const wellKnownChainInfo =
  /** @satisfies {Record<string, ChainInfo>} */ (
    harden({
      // https://github.com/cosmos/chain-registry/blob/master/stride/chain.json
      stride: {
        chainId: 'stride-1',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'ustride' }],
      },
      cosmos: {
        chainId: 'cosmoshub-4',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'uatom' }],
      },
      celestia: {
        chainId: 'celestia',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'utia' }],
      },
      osmosis: {
        chainId: 'osmosis-1',
        connections: {},
        icaEnabled: true,
        icqEnabled: true,
        pfmEnabled: true,
        ibcHooksEnabled: true,
        stakingTokens: [{ denom: 'uosmo' }],
      },
    })
  );
