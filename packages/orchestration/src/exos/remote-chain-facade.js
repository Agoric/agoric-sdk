/** @file ChainAccount exo */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { ChainAddressShape, ChainFacadeI } from '../typeGuards.js';

/**
 * @import {HostInterface, HostOf} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/base-zone';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {CosmosInterchainService} from './cosmos-interchain-service.js';
 * @import {prepareCosmosOrchestrationAccount} from './cosmos-orchestration-account.js';
 * @import {ChainInfo, CosmosChainInfo, IBCConnectionInfo, OrchestrationAccount, ChainAddress, IcaAccount, Denom, Chain} from '../types.js';
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
 *   orchestration: Remote<CosmosInterchainService>;
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
    // TODO vstorage design https://github.com/Agoric/agoric-sdk/issues/9066
    // consider making an `accounts` childNode
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
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(VowShape),
      }),
      getAddressWatcher: M.interface('getAddressWatcher', {
        onFulfilled: M.call(M.record())
          .optional(M.remotable())
          .returns(VowShape),
      }),
      makeChildNodeWatcher: M.interface('makeChildNodeWatcher', {
        onFulfilled: M.call(M.remotable())
          .optional({
            account: M.remotable(),
            chainAddress: ChainAddressShape,
          })
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
        /** @type {HostOf<Chain['getChainInfo']>} */
        getChainInfo() {
          return watch(this.state.remoteChainInfo);
        },

        /** @type {HostOf<Chain['makeAccount']>} */
        makeAccount() {
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
            );
          });
        },
      },
      makeAccountWatcher: {
        /**
         * XXX Pipeline vows allVows and E
         *
         * @param {IcaAccount} account
         */
        onFulfilled(account) {
          return watch(
            E(account).getAddress(),
            this.facets.getAddressWatcher,
            account,
          );
        },
      },
      getAddressWatcher: {
        /**
         * @param {ChainAddress} chainAddress
         * @param {IcaAccount} account
         */
        onFulfilled(chainAddress, account) {
          return watch(
            E(storageNode).makeChildNode(chainAddress.value),
            this.facets.makeChildNodeWatcher,
            { account, chainAddress },
          );
        },
      },
      makeChildNodeWatcher: {
        /**
         * @param {Remote<StorageNode>} childNode
         * @param {{
         *   account: IcaAccount;
         *   chainAddress: ChainAddress;
         * }} ctx
         */
        onFulfilled(childNode, { account, chainAddress }) {
          const { remoteChainInfo } = this.state;
          const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
          if (!stakingDenom) {
            throw Fail`chain info lacks staking denom`;
          }
          return makeCosmosOrchestrationAccount(chainAddress, stakingDenom, {
            account,
            // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
            storageNode: childNode,
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
