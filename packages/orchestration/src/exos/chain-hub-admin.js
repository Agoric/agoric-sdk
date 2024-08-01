/* we expect promises to resolved promptly,  */
/* eslint-disable no-restricted-syntax */
import { M } from '@endo/patterns';
import { heapVowE } from '@agoric/vow/vat.js';
import { CosmosChainInfoShape } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {ChainHub} from './chain-hub.js';
 */

/**
 * For use with async-flow contracts: can be used as a creator facet that allows
 * developers to add new chain configurations to a local chainHub, in the event
 * the information is not available widely in `agoricNames`.
 *
 * @param {Zone} zone
 * @param {ChainHub} chainHub
 */
export const prepareChainHubAdmin = (zone, chainHub) => {
  const ConnectionInfoShape = M.record(); // TODO
  const makeCreatorFacet = zone.exo(
    'ChainHub Admin',
    M.interface('ChainHub Admin', {
      initChain: M.callWhen(
        M.string(),
        CosmosChainInfoShape,
        ConnectionInfoShape,
      ).returns(M.undefined()),
    }),
    {
      /**
       * @param {string} chainName
       * @param {CosmosChainInfo} chainInfo
       * @param {IBCConnectionInfo} connectionInfo
       */
      async initChain(chainName, chainInfo, connectionInfo) {
        // when() because chainHub methods return vows. If this were inside
        // orchestrate() the membrane would wrap/unwrap automatically.
        const agoricChainInfo = await heapVowE.when(
          chainHub.getChainInfo('agoric'),
        );
        chainHub.registerChain(chainName, chainInfo);
        chainHub.registerConnection(
          agoricChainInfo.chainId,
          chainInfo.chainId,
          connectionInfo,
        );
      },
    },
  );
  return makeCreatorFacet;
};
