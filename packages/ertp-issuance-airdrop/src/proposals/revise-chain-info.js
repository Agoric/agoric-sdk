import { makeTracer } from '@agoric/internal';
import { registerChain } from '../chain-info.js';

const trace = makeTracer('ReviseChainInfo', true);

/** @import {CosmosChainInfo} from '../types.js'; */

/**
 * This will add news values AND overwrite any existing values. Voters on a
 * proposal of core-eval must be careful not to overwrite any values operating
 * in production.
 *
 * @param {BootstrapPowers} powers
 * @param {{ options: { chainInfo: Record<string, CosmosChainInfo> } }} opt
 */
export const reviseChainInfo = async (
  { consume: { agoricNamesAdmin } },
  { options: { chainInfo } },
) => {
  trace('init-chainInfo');

  assert(chainInfo, 'chainInfo is required');

  trace(chainInfo);

  // Now register the names
  for await (const [name, info] of Object.entries(chainInfo)) {
    await registerChain(agoricNamesAdmin, name, info, trace);
  }
};
harden(reviseChainInfo);

export const getManifestForReviseChains = (_powers, { chainInfo }) => ({
  manifest: {
    [reviseChainInfo.name]: {
      consume: {
        agoricNamesAdmin: true,
      },
    },
  },
  options: {
    chainInfo,
  },
});
