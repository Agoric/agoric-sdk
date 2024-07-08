/** @file Orchestration service */

import { Fail, b } from '@endo/errors';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { Shape as NetworkShape } from '@agoric/network';
import { prepareChainAccountKit } from './chain-account-kit.js';
import { prepareICQConnectionKit } from './icq-connection-kit.js';
import {
  makeICAChannelAddress,
  makeICQChannelAddress,
} from '../utils/address.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Remote} from '@agoric/internal';
 * @import {Connection, Port, PortAllocator} from '@agoric/network';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {ICQConnection, IcaAccount, ICQConnectionKit, ChainAccountKit} from '../types.js';
 */

const { Vow$ } = NetworkShape; // TODO #9611
/**
 * @typedef {object} OrchestrationPowers
 * @property {Remote<PortAllocator>} portAllocator
 */

/**
 * PowerStore is used so additional powers can be added on upgrade. See
 * [#7337](https://github.com/Agoric/agoric-sdk/issues/7337) for tracking on Exo
 * state migrations.
 *
 * @typedef {MapStore<
 *   keyof OrchestrationPowers,
 *   OrchestrationPowers[keyof OrchestrationPowers]
 * >} PowerStore
 */

/** @typedef {MapStore<IBCConnectionID, ICQConnectionKit>} ICQConnectionStore */

/** @typedef {ChainAccountKit | ICQConnectionKit} ConnectionKit */

/**
 * @template {keyof OrchestrationPowers} K
 * @param {PowerStore} powers
 * @param {K} name
 */
const getPower = (powers, name) => {
  powers.has(name) || Fail`need powers.${b(name)} for this method`;
  return /** @type {OrchestrationPowers[K]} */ (powers.get(name));
};

/** @typedef {{ powers: PowerStore; icqConnections: ICQConnectionStore }} OrchestrationState */

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {ReturnType<typeof prepareChainAccountKit>} makeChainAccountKit
 * @param {ReturnType<typeof prepareICQConnectionKit>} makeICQConnectionKit
 */
const prepareCosmosOrchestrationServiceKit = (
  zone,
  { watch },
  makeChainAccountKit,
  makeICQConnectionKit,
) =>
  zone.exoClassKit(
    'Orchestration',
    {
      requestICAChannelWatcher: M.interface('RequestICAChannelWatcher', {
        onFulfilled: M.call(M.remotable('Port'))
          .optional({ chainId: M.string(), remoteConnAddr: M.string() })
          .returns(Vow$(NetworkShape.Connection)),
      }),
      requestICQChannelWatcher: M.interface('RequestICQChannelWatcher', {
        onFulfilled: M.call(M.remotable('Port'))
          .optional({
            remoteConnAddr: M.string(),
            controllerConnectionId: M.string(),
          })
          .returns(Vow$(NetworkShape.Connection)),
      }),
      channelOpenWatcher: M.interface('ChannelOpenWatcher', {
        onFulfilled: M.call(M.remotable('Connection'))
          .optional(
            M.splitRecord(
              { connectionKit: M.record(), returnFacet: M.string() },
              { saveICQConnection: M.string() },
            ),
          )
          .returns(M.remotable('ConnectionKit Holder facet')),
      }),
      public: M.interface('CosmosInterchainService', {
        makeAccount: M.call(M.string(), M.string(), M.string()).returns(
          Vow$(M.remotable('ChainAccountKit')),
        ),
        provideICQConnection: M.call(M.string()).returns(
          Vow$(M.remotable('ICQConnection')),
        ),
      }),
    },
    /** @param {Partial<OrchestrationPowers>} [initialPowers] */
    initialPowers => {
      /** @type {PowerStore} */
      const powers = zone.detached().mapStore('PowerStore');
      if (initialPowers) {
        for (const [name, power] of Object.entries(initialPowers)) {
          powers.init(/** @type {keyof OrchestrationPowers} */ (name), power);
        }
      }
      const icqConnections = zone.detached().mapStore('ICQConnections');
      return /** @type {OrchestrationState} */ ({ powers, icqConnections });
    },
    {
      requestICAChannelWatcher: {
        /**
         * @param {Port} port
         * @param {{
         *   chainId: string;
         *   remoteConnAddr: RemoteIbcAddress;
         * }} watchContext
         */
        onFulfilled(port, { chainId, remoteConnAddr }) {
          const chainAccountKit = makeChainAccountKit(
            chainId,
            port,
            remoteConnAddr,
          );
          return watch(
            E(port).connect(remoteConnAddr, chainAccountKit.connectionHandler),
            this.facets.channelOpenWatcher,
            { returnFacet: 'account', connectionKit: chainAccountKit },
          );
        },
      },
      requestICQChannelWatcher: {
        /**
         * @param {Port} port
         * @param {{
         *   remoteConnAddr: RemoteIbcAddress;
         *   controllerConnectionId: IBCConnectionID;
         * }} watchContext
         */
        onFulfilled(port, { remoteConnAddr, controllerConnectionId }) {
          const connectionKit = makeICQConnectionKit(port);
          /** @param {ICQConnectionKit} kit */
          return watch(
            E(port).connect(remoteConnAddr, connectionKit.connectionHandler),
            this.facets.channelOpenWatcher,
            {
              connectionKit,
              returnFacet: 'connection',
              saveICQConnection: controllerConnectionId,
            },
          );
        },
      },
      /**
       * Waits for a channel (ICA, ICQ) to open and returns the consumer-facing
       * facet of the ConnectionKit, specified by `returnFacet`. Saves the
       * ConnectionKit if `saveICQConnection` is provided.
       */
      channelOpenWatcher: {
        /**
         * @param {Connection} _connection
         * @param {{
         *   connectionKit: ConnectionKit;
         *   returnFacet: string;
         *   saveICQConnection?: IBCConnectionID;
         * }} watchContext
         */
        onFulfilled(
          _connection,
          { connectionKit, returnFacet, saveICQConnection },
        ) {
          if (saveICQConnection) {
            this.state.icqConnections.init(
              saveICQConnection,
              /** @type {ICQConnectionKit} */ (connectionKit),
            );
          }
          return connectionKit[returnFacet];
        },
        // TODO #9317 if we fail, should we revoke the port (if it was created in this flow)?
        // onRejected() {}
      },
      public: {
        /**
         * @param {string} chainId
         * @param {IBCConnectionID} hostConnectionId the counterparty
         *   connection_id
         * @param {IBCConnectionID} controllerConnectionId self connection_id
         * @returns {Vow<IcaAccount>}
         */
        makeAccount(chainId, hostConnectionId, controllerConnectionId) {
          const remoteConnAddr = makeICAChannelAddress(
            hostConnectionId,
            controllerConnectionId,
          );
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return watch(
            E(portAllocator).allocateICAControllerPort(),
            this.facets.requestICAChannelWatcher,
            {
              chainId,
              remoteConnAddr,
            },
          );
        },
        /**
         * @param {IBCConnectionID} controllerConnectionId
         * @returns {Vow<ICQConnection> | ICQConnection}
         */
        provideICQConnection(controllerConnectionId) {
          if (this.state.icqConnections.has(controllerConnectionId)) {
            // TODO #9281 do not return synchronously. see https://github.com/Agoric/agoric-sdk/pull/9454#discussion_r1626898694
            return this.state.icqConnections.get(controllerConnectionId)
              .connection;
          }
          const remoteConnAddr = makeICQChannelAddress(controllerConnectionId);
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return watch(
            // allocate a new Port for every Connection
            // TODO #9317 optimize ICQ port allocation
            E(portAllocator).allocateICQControllerPort(),
            this.facets.requestICQChannelWatcher,
            {
              remoteConnAddr,
              controllerConnectionId,
            },
          );
        },
      },
    },
  );

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareCosmosInterchainService = (zone, vowTools) => {
  const makeChainAccountKit = prepareChainAccountKit(zone, vowTools);
  const makeICQConnectionKit = prepareICQConnectionKit(zone, vowTools);
  const makeCosmosOrchestrationServiceKit =
    prepareCosmosOrchestrationServiceKit(
      zone,
      vowTools,
      makeChainAccountKit,
      makeICQConnectionKit,
    );

  const makeCosmosInterchainService = initialPowers =>
    makeCosmosOrchestrationServiceKit(initialPowers).public;

  return makeCosmosInterchainService;
};
harden(prepareCosmosInterchainService);

/** @typedef {ReturnType<typeof prepareCosmosInterchainService>} MakeCosmosInterchainService */
/** @typedef {ReturnType<MakeCosmosInterchainService>} CosmosInterchainService */
