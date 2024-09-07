/** @file Remote Chain Facade exo */
import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import {
  ChainAddressShape,
  chainFacadeMethods,
  ICQMsgShape,
} from '../typeGuards.js';

/**
 * @import {HostOf} from '@agoric/async-flow';
 * @import {Zone} from '@agoric/base-zone';
 * @import {JsonSafe} from '@agoric/cosmic-proto';
 * @import {RequestQuery, ResponseQuery} from '@agoric/cosmic-proto/tendermint/abci/types.js';
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {CosmosInterchainService} from './exo-interfaces.js';
 * @import {prepareCosmosOrchestrationAccount} from './cosmos-orchestration-account.js';
 * @import {CosmosChainInfo, IBCConnectionInfo, ChainAddress, IcaAccount, Chain, ICQConnection} from '../types.js';
 */

const trace = makeTracer('RemoteChainFacade');

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
 * @typedef {{
 *   remoteChainInfo: CosmosChainInfo;
 *   connectionInfo: IBCConnectionInfo;
 *   icqConnection: ICQConnection | undefined;
 * }} RemoteChainFacadeState
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
    vowTools: { allVows, asVow, watch },
  },
) =>
  zone.exoClassKit(
    'RemoteChainFacade',
    {
      public: M.interface('RemoteChainFacade', {
        ...chainFacadeMethods,
        query: M.call(M.arrayOf(ICQMsgShape)).returns(VowShape),
      }),
      makeICQConnectionQueryWatcher: M.interface(
        'makeICQConnectionQueryWatcher',
        {
          onFulfilled: M.call(M.remotable(), M.arrayOf(ICQMsgShape)).returns(
            VowShape,
          ),
        },
      ),
      makeAccountAndProvideQueryConnWatcher: M.interface(
        'makeAccountAndProvideQueryConnWatcher',
        {
          onFulfilled: M.call([
            M.remotable(),
            M.or(M.remotable(), M.undefined()),
          ]).returns(VowShape),
        },
      ),
      getAddressesWatcher: M.interface('getAddressWatcher', {
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
      return /** @type {RemoteChainFacadeState} */ ({
        remoteChainInfo,
        connectionInfo,
        icqConnection: undefined,
      });
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
            if (!stakingDenom) throw Fail`chain info lacks staking denom`;

            // icqConnection is ultimately retrieved from state, but let's
            // create a connection if it doesn't exist
            const icqConnOrUndefinedV =
              remoteChainInfo.icqEnabled && !this.state.icqConnection
                ? E(orchestration).provideICQConnection(connectionInfo.id)
                : undefined;

            const makeAccountV = E(orchestration).makeAccount(
              remoteChainInfo.chainId,
              connectionInfo.counterparty.connection_id,
              connectionInfo.id,
            );

            return watch(
              allVows([makeAccountV, icqConnOrUndefinedV]),
              this.facets.makeAccountAndProvideQueryConnWatcher,
            );
          });
        },
        /**
         * @type {HostOf<
         *   Chain<CosmosChainInfo & { icqEnabled: true }>['query']
         * >}
         */
        query(msgs) {
          return asVow(() => {
            const {
              remoteChainInfo: { icqEnabled, chainId },
              connectionInfo,
            } = this.state;
            if (!icqEnabled) {
              throw Fail`Queries not available for chain ${q(chainId)}`;
            }
            // if none exists, make one and still send the query in the handler
            if (!this.state.icqConnection) {
              return watch(
                E(orchestration).provideICQConnection(connectionInfo.id),
                this.facets.makeICQConnectionQueryWatcher,
                msgs,
              );
            }
            return watch(E(this.state.icqConnection).query(msgs));
          });
        },
      },
      makeAccountAndProvideQueryConnWatcher: {
        /**
         * @param {[IcaAccount, ICQConnection | undefined]} account
         */
        onFulfilled([account, icqConnection]) {
          if (icqConnection && !this.state.icqConnection) {
            this.state.icqConnection = icqConnection;
            // no need to pass icqConnection in ctx; we can get it from state
          }
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
      makeICQConnectionQueryWatcher: {
        /**
         * @param {ICQConnection} icqConnection
         * @param {JsonSafe<RequestQuery>[]} msgs
         * @returns {Vow<JsonSafe<ResponseQuery>[]>}
         */
        onFulfilled(icqConnection, msgs) {
          if (!this.state.icqConnection) {
            this.state.icqConnection = icqConnection;
          }
          return watch(E(icqConnection).query(msgs));
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
          const { icqConnection } = this.state;

          return makeCosmosOrchestrationAccount(
            {
              chainAddress,
              localAddress,
              remoteAddress,
            },
            {
              account,
              // FIXME storage path https://github.com/Agoric/agoric-sdk/issues/9066
              storageNode: childNode,
              icqConnection,
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
