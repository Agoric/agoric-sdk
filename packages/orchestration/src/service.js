/** @file Orchestration service */

import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { Shape as NetworkShape } from '@agoric/network';
import { prepareChainAccountKit } from './exos/chainAccountKit.js';
import { prepareICQConnectionKit } from './exos/icqConnectionKit.js';
import {
  makeICAChannelAddress,
  makeICQChannelAddress,
} from './utils/address.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Remote} from '@agoric/internal';
 * @import {Connection, Port, PortAllocator} from '@agoric/network';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {VowTools} from '@agoric/vow';
 * @import {ICQConnection, IcaAccount, ICQConnectionKit, ChainAccountKit} from './types.js';
 */

const { Fail, bare } = assert;

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
  powers.has(name) || Fail`need powers.${bare(name)} for this method`;
  return /** @type {OrchestrationPowers[K]} */ (powers.get(name));
};

/** @typedef {{ powers: PowerStore; icqConnections: ICQConnectionStore }} OrchestrationState */

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {ReturnType<typeof prepareChainAccountKit>} makeChainAccountKit
 * @param {ReturnType<typeof prepareICQConnectionKit>} makeICQConnectionKit
 */
const prepareOrchestrationKit = (
  zone,
  { when, watch },
  makeChainAccountKit,
  makeICQConnectionKit,
) =>
  zone.exoClassKit(
    'Orchestration',
    {
      requestICAConnectionWatcher: M.interface('RequestICAConnectionWatcher', {
        onFulfilled: M.call(M.remotable('Port'))
          .optional({ remoteConnAddr: M.string() })
          .returns(NetworkShape.Vow$(NetworkShape.Connection)),
      }),
      requestICQConnectionWatcher: M.interface('RequestICQConnectionWatcher', {
        onFulfilled: M.call(M.remotable('Port'))
          .optional({
            remoteConnAddr: M.string(),
            controllerConnectionId: M.string(),
          })
          .returns(NetworkShape.Vow$(NetworkShape.Connection)),
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
      public: M.interface('OrchestrationService', {
        makeAccount: M.callWhen(M.string(), M.string()).returns(
          M.remotable('ChainAccountKit'),
        ),
        provideICQConnection: M.callWhen(M.string()).returns(
          M.remotable('ICQConnection'),
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
      requestICAConnectionWatcher: {
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
      requestICQConnectionWatcher: {
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
         * @returns {Promise<IcaAccount>}
         */
        makeAccount(chainId, hostConnectionId, controllerConnectionId) {
          const remoteConnAddr = makeICAChannelAddress(
            hostConnectionId,
            controllerConnectionId,
          );
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return when(
            watch(
              E(portAllocator).allocateICAControllerPort(),
              this.facets.requestICAConnectionWatcher,
              {
                chainId,
                remoteConnAddr,
              },
            ),
          );
        },
        /**
         * @param {IBCConnectionID} controllerConnectionId
         * @returns {ICQConnection | Promise<ICQConnection>}
         */
        provideICQConnection(controllerConnectionId) {
          if (this.state.icqConnections.has(controllerConnectionId)) {
            return this.state.icqConnections.get(controllerConnectionId)
              .connection;
          }
          const remoteConnAddr = makeICQChannelAddress(controllerConnectionId);
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return when(
            watch(
              // allocate a new Port for every Connection
              // TODO #9317 optimize ICQ port allocation
              E(portAllocator).allocateICQControllerPort(),
              this.facets.requestICQConnectionWatcher,
              {
                remoteConnAddr,
                controllerConnectionId,
              },
            ),
          );
        },
      },
    },
  );

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 */
export const prepareOrchestrationTools = (zone, vowTools) => {
  const makeChainAccountKit = prepareChainAccountKit(zone, vowTools);
  const makeICQConnectionKit = prepareICQConnectionKit(zone, vowTools);
  const makeOrchestrationKit = prepareOrchestrationKit(
    zone,
    vowTools,
    makeChainAccountKit,
    makeICQConnectionKit,
  );

  return harden({ makeOrchestrationKit });
};
harden(prepareOrchestrationTools);

/** @typedef {ReturnType<typeof prepareOrchestrationTools>} OrchestrationTools */
/** @typedef {ReturnType<OrchestrationTools['makeOrchestrationKit']>} OrchestrationKit */
/** @typedef {OrchestrationKit['public']} OrchestrationService */
