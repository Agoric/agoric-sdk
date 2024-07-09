import { M } from '@endo/patterns';
import { heapVowE } from '@agoric/vow/vat.js';
import { CosmosChainInfoShape } from '../../typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {ChainHub} from '../../exos/chain-hub.js';
 */

/**
 * @param {Zone} zone
 * @param {ChainHub} chainHub
 */
export const prepareChainHubCreatorFacet = (zone, chainHub) => {
  const ConnectionInfoShape = M.record(); // TODO
  const makeCreatorFacet = zone.exoClass(
    'ChainHub CF',
    M.interface('ChainHub CF', {
      addChain: M.callWhen(CosmosChainInfoShape, ConnectionInfoShape).returns(
        M.scalar(),
      ),
    }),
    () => ({ nonce: 0n }),
    {
      /**
       * @param {CosmosChainInfo} chainInfo
       * @param {IBCConnectionInfo} connectionInfo
       */
      async addChain(chainInfo, connectionInfo) {
        const chainKey = `${chainInfo.chainId}-${(this.state.nonce += 1n)}`;
        // when() because chainHub methods return vows. If this were inside
        // orchestrate() the membrane would wrap/unwrap automatically.
        const agoricChainInfo = await heapVowE.when(
          chainHub.getChainInfo('agoric'),
        );
        chainHub.registerChain(chainKey, chainInfo);
        chainHub.registerConnection(
          agoricChainInfo.chainId,
          chainInfo.chainId,
          connectionInfo,
        );
        return chainKey;
      },
    },
  );
  return makeCreatorFacet;
};

/** @typedef {ReturnType<ReturnType<prepareChainHubCreatorFacet>>} ChainHubCreatorFacet */
