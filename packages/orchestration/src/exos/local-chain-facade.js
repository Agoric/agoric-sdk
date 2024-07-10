/** @file ChainAccount exo */
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';

import { ChainFacadeI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {LocalChain, LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {CosmosInterchainService} from './cosmos-interchain-service.js';
 * @import {MakeLocalOrchestrationAccountKit} from './local-orchestration-account.js';
 * @import {ChainAddress, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount} from '../types.js';
 */

/**
 * @typedef {{
 *   makeLocalOrchestrationAccountKit: MakeLocalOrchestrationAccountKit;
 *   orchestration: Remote<CosmosInterchainService>;
 *   storageNode: Remote<StorageNode>;
 *   timer: Remote<TimerService>;
 *   localchain: Remote<LocalChain>;
 *   vowTools: VowTools;
 * }} LocalChainFacadePowers
 */

/**
 * @param {Zone} zone
 * @param {LocalChainFacadePowers} powers
 */
const prepareLocalChainFacadeKit = (
  zone,
  {
    makeLocalOrchestrationAccountKit,
    localchain,
    // TODO vstorage design https://github.com/Agoric/agoric-sdk/issues/9066
    // consider making an `accounts` childNode
    storageNode,
    vowTools: { allVows, watch },
  },
) =>
  zone.exoClassKit(
    'LocalChainFacade',
    {
      public: ChainFacadeI,
      makeAccountWatcher: M.interface('makeAccountWatcher', {
        onFulfilled: M.call([M.remotable('LCA Account'), M.string()])
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(VowShape),
      }),
      makeChildNodeWatcher: M.interface('makeChildNodeWatcher', {
        onFulfilled: M.call(M.remotable())
          .optional({ account: M.remotable(), address: M.string() }) // empty context
          .returns(M.remotable()),
      }),
    },
    /**
     * @param {CosmosChainInfo} localChainInfo
     */
    localChainInfo => {
      return { localChainInfo };
    },
    {
      public: {
        getChainInfo() {
          return watch(this.state.localChainInfo);
        },

        // FIXME parameterize on the remoteChainInfo to make()
        // That used to work but got lost in the migration to Exo
        /** @returns {Vow<OrchestrationAccount<ChainInfo>>} */
        makeAccount() {
          const lcaP = E(localchain).makeAccount();
          // TODO #9449 fix types
          // @ts-expect-error Type 'Vow<Voidless>' is not assignable to type 'Vow<OrchestrationAccountI>'.
          return watch(
            // TODO #9449 fix types
            // @ts-expect-error Property 'getAddress' does not exist on type 'EMethods<Required<Guarded<{ getAddress()...
            allVows([lcaP, E(lcaP).getAddress()]),
            this.facets.makeAccountWatcher,
          );
        },
      },
      makeAccountWatcher: {
        /**
         * @param {[LocalChainAccount, ChainAddress['value']]} results
         */
        onFulfilled([account, address]) {
          return watch(
            E(storageNode).makeChildNode(address),
            this.facets.makeChildNodeWatcher,
            { account, address },
          );
        },
      },
      makeChildNodeWatcher: {
        /**
         * @param {Remote<StorageNode>} childNode
         * @param {{
         *   account: LocalChainAccount;
         *   address: ChainAddress['value'];
         * }} ctx
         */
        onFulfilled(childNode, { account, address }) {
          const { localChainInfo } = this.state;
          const { holder } = makeLocalOrchestrationAccountKit({
            account,
            address: harden({
              value: address,
              encoding: 'bech32',
              chainId: localChainInfo.chainId,
            }),
            // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
            storageNode: childNode,
          });
          return holder;
        },
      },
    },
  );
harden(prepareLocalChainFacadeKit);

/**
 * @param {Zone} zone
 * @param {LocalChainFacadePowers} powers
 */
export const prepareLocalChainFacade = (zone, powers) => {
  const makeLocalChainFacadeKit = prepareLocalChainFacadeKit(zone, powers);
  return pickFacet(makeLocalChainFacadeKit, 'public');
};
harden(prepareLocalChainFacade);

/** @typedef {ReturnType<typeof prepareLocalChainFacade>} MakeLocalChainFacade */
