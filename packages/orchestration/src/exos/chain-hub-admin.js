/* we expect promises to resolved promptly,  */

import { M } from '@endo/patterns';
import { VowShape } from '@agoric/vow';
import { CosmosChainInfoShape } from '../typeGuards.js';
import { DenomDetailShape } from './chain-hub.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {CosmosChainInfo, Denom, IBCConnectionInfo, KnownChains} from '@agoric/orchestration';
 *
 * @import {ChainHub, DenomDetail} from './chain-hub.js';
 */

/**
 * For use with async-flow contracts: can be used as a creator facet that allows
 * developers to add new chain configurations to a local chainHub, in the event
 * the information is not available widely in `agoricNames`.
 *
 * @example
 *
 * ```js
 * const chainHubAdmin = prepareChainHubAdmin(zone, chainHub);
 * chainHubAdmin.registerChain(
 *   'hotNewChain',
 *   hotNewChainInfo,
 * );
 * chainHubAdmin.registerConnection(
 *   'aWellKnownChainId'
 *   'hotNewChainId',
 *  'aWellKnownChainToHotNewChainConnectionInfo',
 * );
 * chainHubAdmin.registerAsset(
 *   'aWellKnownChainId'
 *   'hotNewChainId',
 *  'aWellKnownChainToHotNewChainConnectionInfo',
 * );
 * ```
 *
 * @param {Zone} zone
 * @param {ChainHub} chainHub
 */
export const prepareChainHubAdmin = (zone, chainHub) => {
  const ConnectionInfoShape = M.record(); // TODO
  const makeCreatorFacet = zone.exo(
    'ChainHub Admin',
    M.interface('ChainHub Admin', {
      populateChainsAndConnection: M.call(M.string(), M.string()).returns(
        VowShape,
      ),
      registerChain: M.call(M.string(), CosmosChainInfoShape).returns(
        M.undefined(),
      ),
      registerConnection: M.call(
        M.string(),
        M.string(),
        ConnectionInfoShape,
      ).returns(M.undefined()),
      registerAsset: M.call(M.string(), DenomDetailShape).returns(
        M.undefined(),
      ),
    }),
    {
      /**
       * Sends query that populates local ChainHub with chain and connection
       * info.
       *
       * @param {keyof KnownChains} primaryName
       * @param {keyof KnownChains} counterName
       */
      populateChainsAndConnection(primaryName, counterName) {
        return chainHub.getChainsAndConnection(primaryName, counterName);
      },
      /**
       * Register information for a chain.
       *
       * @param {string} chainName - must not exist in chainHub
       * @param {CosmosChainInfo} chainInfo
       */
      registerChain(chainName, chainInfo) {
        // when() because chainHub methods return vows. If this were inside
        // orchestrate() the membrane would wrap/unwrap automatically.
        return chainHub.registerChain(chainName, chainInfo);
      },
      /**
       * Register a connection between two chains.
       *
       * @param {string} primaryChainId
       * @param {string} counterpartyChainId
       * @param {IBCConnectionInfo} connectionInfo
       */
      registerConnection(primaryChainId, counterpartyChainId, connectionInfo) {
        return chainHub.registerConnection(
          primaryChainId,
          counterpartyChainId,
          connectionInfo,
        );
      },
      /**
       * Register an asset that may be held on a chain other than the issuing
       * chain.
       *
       * @param {Denom} denom - on the holding chain, whose name is given in
       *   `detail.chainName`
       * @param {DenomDetail} detail - chainName and baseName must be registered
       */
      registerAsset(denom, detail) {
        return chainHub.registerAsset(denom, detail);
      },
    },
  );
  return makeCreatorFacet;
};

/** @typedef {ReturnType<prepareChainHubAdmin>} ChainHubAdmin */
