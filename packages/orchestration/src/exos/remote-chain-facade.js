/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

import { pickFacet } from '@agoric/vat-data';
import { ChainFacadeI } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {OrchestrationService} from '../service.js';
 * @import {prepareCosmosOrchestrationAccount} from './cosmos-orchestration-account.js';
 * @import {ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, ChainAddress, IcaAccount, PromiseToVow, Denom} from '../types.js';
 */

const { Fail } = assert;
const trace = makeTracer('RemoteChainFacade');

/** @type {any} */
const anyVal = null;

/**
 * @typedef {{
 *   makeCosmosOrchestrationAccount: ReturnType<
 *     typeof prepareCosmosOrchestrationAccount
 *   >;
 *   orchestration: Remote<OrchestrationService>;
 *   storageNode: Remote<StorageNode>;
 *   timer: Remote<TimerService>;
 *   vowTools: VowTools;
 * }} RemoteChainFacadePowers
 */

/**
 * @param {Zone} zone
 * @param {RemoteChainFacadePowers} powers
 */
const prepareRemoteChainFacadeKit = (
  zone,
  {
    makeCosmosOrchestrationAccount,
    orchestration,
    storageNode,
    timer,
    vowTools: { allVows, asVow, watch },
  },
) =>
  zone.exoClassKit(
    'RemoteChainFacade',
    {
      public: ChainFacadeI,
      makeAccountWatcher: M.interface('makeAccountWatcher', {
        onFulfilled: M.call([M.remotable(), M.record()])
          .optional({ stakingDenom: M.string() })
          .returns(M.remotable()),
      }),
    },
    /**
     * @param {CosmosChainInfo} remoteChainInfo
     * @param {IBCConnectionInfo} connectionInfo
     */
    (remoteChainInfo, connectionInfo) => {
      trace('making a RemoteChainFacade');
      return { remoteChainInfo, connectionInfo };
    },
    {
      public: {
        getChainInfo() {
          return watch(this.state.remoteChainInfo);
        },

        /** @returns {Vow<PromiseToVow<OrchestrationAccount<ChainInfo>>>} */
        makeAccount() {
          // @ts-expect-error 'Vow<Guarded<{...}>> is not assignable to type 'Vow<never>'
          return asVow(() => {
            const { remoteChainInfo, connectionInfo } = this.state;
            const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
            if (!stakingDenom) {
              throw Fail`chain info lacks staking denom`;
            }

            const icaP = E(orchestration).makeAccount(
              remoteChainInfo.chainId,
              connectionInfo.id,
              connectionInfo.counterparty.connection_id,
            );
            return watch(
              allVows([icaP, E(icaP).getAddress()]),
              this.facets.makeAccountWatcher,
              { stakingDenom },
            );
          });
        },
      },
      makeAccountWatcher: {
        /**
         * @param {[IcaAccount, ChainAddress]} results
         * @param {{ stakingDenom: Denom }} ctx
         */
        onFulfilled([account, chainAddress], { stakingDenom }) {
          return makeCosmosOrchestrationAccount(chainAddress, stakingDenom, {
            account,
            storageNode,
            // FIXME provide real ICQ connection
            // FIXME make Query Connection available via chain, not orchestrationAccount
            icqConnection: anyVal,
            timer,
          });
        },
      },
    },
  );
harden(prepareRemoteChainFacadeKit);

/**
 * @param {Zone} zone
 * @param {RemoteChainFacadePowers} powers
 */
export const prepareRemoteChainFacade = (zone, powers) => {
  const makeLocalChainFacadeKit = prepareRemoteChainFacadeKit(zone, powers);
  return pickFacet(makeLocalChainFacadeKit, 'public');
};
harden(prepareRemoteChainFacade);

/** @typedef {ReturnType<typeof prepareRemoteChainFacade>} MakeRemoteChainFacade */
