/** @file ChainAccount exo */
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { pickFacet } from '@agoric/vat-data';

import { ChainFacadeI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {LocalChain, LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {OrchestrationService} from '../service.js';
 * @import {MakeLocalOrchestrationAccountKit} from './local-orchestration-account.js';
 * @import {ChainAddress, ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, PromiseToVow} from '../types.js';
 */

/**
 * @typedef {{
 *   makeLocalOrchestrationAccountKit: MakeLocalOrchestrationAccountKit;
 *   orchestration: Remote<OrchestrationService>;
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
    storageNode,
    vowTools: { allVows, watch },
  },
) =>
  zone.exoClassKit(
    'LocalChainFacade',
    {
      public: ChainFacadeI,
      makeAccountWatcher: M.interface('undelegateWatcher', {
        onFulfilled: M.call([M.remotable('LCA Account'), M.string()])
          .optional(M.arrayOf(M.undefined())) // empty context
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
        /** @returns {Vow<PromiseToVow<OrchestrationAccount<ChainInfo>>>} */
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
         * @param {[LocalChainAccount, ChainAddress['address']]} results
         */
        onFulfilled([account, address]) {
          const { localChainInfo } = this.state;
          const { holder } = makeLocalOrchestrationAccountKit({
            account,
            address: harden({
              address,
              addressEncoding: 'bech32',
              chainId: localChainInfo.chainId,
            }),
            // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
            storageNode,
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
