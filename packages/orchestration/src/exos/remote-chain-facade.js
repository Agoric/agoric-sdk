/** @file Remote Chain Facade exo */
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
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
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
    vowTools: { asVow, watch, allVows },
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
      getAddressesWatcher: M.interface('getAddressesWatcher', {
        onFulfilled: M.call(
          [ChainAddressShape, M.string(), M.string()],
          M.remotable(),
        ).returns(VowShape),
      }),
      makeChildNodeWatcher: M.interface('makeChildNodeWatcher', {
        onFulfilled: M.call(M.remotable(), {
          account: M.remotable(),
          chainAddress: ChainAddressShape,
          localAddress: M.string(),
          remoteAddress: M.string(),
        }).returns(M.remotable()),
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
                connectionInfo.counterparty.connection_id,
                connectionInfo.id,
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
            allVows([
              E(account).getAddress(),
              E(account).getLocalAddress(),
              E(account).getRemoteAddress(),
            ]),
            this.facets.getAddressesWatcher,
            account,
          );
        },
      },
      getAddressesWatcher: {
        /**
         * @param {[ChainAddress, LocalIbcAddress, RemoteIbcAddress]} chainAddresses
         * @param {IcaAccount} account
         */
        onFulfilled([chainAddress, localAddress, remoteAddress], account) {
          return watch(
            E(storageNode).makeChildNode(chainAddress.value),
            this.facets.makeChildNodeWatcher,
            { account, chainAddress, localAddress, remoteAddress },
          );
        },
      },
      makeChildNodeWatcher: {
        /**
         * @param {Remote<StorageNode>} childNode
         * @param {{
         *   account: IcaAccount;
         *   chainAddress: ChainAddress;
         *   localAddress: LocalIbcAddress;
         *   remoteAddress: RemoteIbcAddress;
         * }} ctx
         */
        onFulfilled(
          childNode,
          { account, chainAddress, localAddress, remoteAddress },
        ) {
          const { remoteChainInfo } = this.state;
          const stakingDenom = remoteChainInfo.stakingTokens?.[0]?.denom;
          if (!stakingDenom) {
            throw Fail`chain info lacks staking denom`;
          }
          return makeCosmosOrchestrationAccount(
            {
              chainAddress,
              bondDenom: stakingDenom,
              localAddress,
              remoteAddress,
            },
            {
              account,
              // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
              storageNode: childNode,
              // FIXME provide real ICQ connection
              // FIXME make Query Connection available via chain, not orchestrationAccount
              icqConnection: anyVal,
              timer,
            },
          );
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
/** @typedef {ReturnType<MakeRemoteChainFacade>} RemoteChainFacade */
