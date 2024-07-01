/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
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
    vowTools: { asVow, watch },
  },
) =>
  zone.exoClassKit(
    'RemoteChainFacade',
    {
      public: ChainFacadeI,
      makeAccountWatcher: M.interface('makeAccountWatcher', {
        onFulfilled: M.call(M.remotable())
          .optional(M.string())
          .returns(VowShape),
      }),
      getAddressWatcher: M.interface('makeAccountWatcher', {
        onFulfilled: M.call(M.record())
          .optional({ stakingDenom: M.string(), account: M.remotable() })
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
          // TODO #9449 fix types
          // @ts-expect-error Type 'Vow<Voidless>' is not assignable to type 'Vow<OrchestrationAccountI>'
          return asVow(() => {
            const { remoteChainInfo, connectionInfo } = this.state;
            const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
            if (!stakingDenom) {
              throw Fail`chain info lacks staking denom`;
            }

            return watch(
              E(orchestration).makeAccount(
                remoteChainInfo.chainId,
                connectionInfo.id,
                connectionInfo.counterparty.connection_id,
              ),
              this.facets.makeAccountWatcher,
              stakingDenom,
            );
          });
        },
      },
      makeAccountWatcher: {
        /**
         * @param {IcaAccount} account
         * @param {Denom} stakingDenom
         */
        onFulfilled(account, stakingDenom) {
          return watch(E(account).getAddress(), this.facets.getAddressWatcher, {
            stakingDenom,
            account,
          });
        },
      },
      getAddressWatcher: {
        /**
         * @param {ChainAddress} chainAddress
         * @param {{ stakingDenom: Denom; account: IcaAccount }} ctx
         */
        onFulfilled(chainAddress, { account, stakingDenom }) {
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
