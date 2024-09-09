/** @file Orchestration service */

import { Shape as NetworkShape } from '@agoric/network';
import { pickFacet } from '@agoric/vat-data';
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import {
  DEFAULT_ICQ_VERSION,
  makeICAChannelAddress,
  makeICQChannelAddress,
} from '../utils/address.js';
import { prepareIcaAccountKit } from './ica-account-kit.js';
import { prepareICQConnectionKit } from './icq-connection-kit.js';

/**
 * @import {Zone} from '@agoric/base-zone';
 * @import {Remote} from '@agoric/internal';
 * @import {Connection, Port, PortAllocator} from '@agoric/network';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {ICQConnection, IcaAccount, ICQConnectionKit, IcaAccountKit} from '../types.js';
 * @import {ICAChannelAddressOpts} from '../utils/address.js';
 */

const { Vow$ } = NetworkShape; // TODO #9611
/**
 * @typedef {object} OrchestrationPowers
 * @property {Remote<PortAllocator>} portAllocator
 * @property {undefined} reserved reserve a state key for future use. can hold
 *   an additional power or a record of powers
 */

/** @typedef {MapStore<string, ICQConnectionKit>} ICQConnectionStore */

/** @typedef {IcaAccountKit | ICQConnectionKit} ConnectionKit */

/**
 * @typedef {{
 *   icqConnections: ICQConnectionStore;
 *   sharedICQPort: Remote<Port> | undefined;
 * } & OrchestrationPowers} OrchestrationState
 */

/**
 * Creates a key for the icqConnections mapStore based on connectionId and
 * version
 *
 * @param {IBCConnectionID} controllerConnectionId
 * @param {string} [version]
 * @returns {string}
 */
const getICQConnectionKey = (controllerConnectionId, version) => {
  return `${controllerConnectionId}:${version || DEFAULT_ICQ_VERSION}`;
};

/**
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @param {ReturnType<typeof prepareIcaAccountKit>} makeIcaAccountKit
 * @param {ReturnType<typeof prepareICQConnectionKit>} makeICQConnectionKit
 */
const prepareCosmosOrchestrationServiceKit = (
  zone,
  { watch, asVow },
  makeIcaAccountKit,
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
            icqLookupKey: M.string(),
          })
          .returns(Vow$(NetworkShape.Connection)),
      }),
      channelOpenWatcher: M.interface('ChannelOpenWatcher', {
        onFulfilled: M.call(M.remotable('Connection'))
          .optional(
            M.splitRecord(
              { connectionKit: M.record(), returnFacet: M.string() },
              { icqLookupKey: M.string() },
            ),
          )
          .returns(M.remotable('ConnectionKit Holder facet')),
      }),
      public: M.interface('CosmosInterchainService', {
        makeAccount: M.call(M.string(), M.string(), M.string())
          .optional(M.record())
          .returns(Vow$(M.remotable('IcaAccountKit'))),
        provideICQConnection: M.call(M.string())
          .optional(M.string())
          .returns(Vow$(M.remotable('ICQConnection'))),
      }),
    },
    /** @param {Partial<OrchestrationPowers>} powers */
    powers => {
      mustMatch(powers?.portAllocator, M.remotable('PortAllocator'));
      const icqConnections = zone.detached().mapStore('ICQConnections');
      return /** @type {OrchestrationState} */ ({
        icqConnections,
        sharedICQPort: undefined,
        reserved: undefined,
        ...powers,
      });
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
          const connectionKit = makeIcaAccountKit(
            chainId,
            port,
            remoteConnAddr,
          );
          return watch(
            E(port).connect(remoteConnAddr, connectionKit.connectionHandler),
            this.facets.channelOpenWatcher,
            { returnFacet: 'account', connectionKit },
          );
        },
      },
      requestICQChannelWatcher: {
        /**
         * @param {Port} port
         * @param {{
         *   remoteConnAddr: RemoteIbcAddress;
         *   icqLookupKey: string;
         * }} watchContext
         */
        onFulfilled(port, { remoteConnAddr, icqLookupKey }) {
          if (!this.state.sharedICQPort) {
            this.state.sharedICQPort = port;
          }
          const connectionKit = makeICQConnectionKit(port);
          return watch(
            E(port).connect(remoteConnAddr, connectionKit.connectionHandler),
            this.facets.channelOpenWatcher,
            {
              connectionKit,
              returnFacet: 'connection',
              icqLookupKey,
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
         *   icqLookupKey?: string;
         * }} watchContext
         */
        onFulfilled(_connection, { connectionKit, returnFacet, icqLookupKey }) {
          if (icqLookupKey) {
            this.state.icqConnections.init(
              icqLookupKey,
              /** @type {ICQConnectionKit} */ (connectionKit),
            );
          }
          return connectionKit[returnFacet];
        },
      },
      public: {
        /**
         * @satisfies {CosmosInterchainService['makeAccount']}
         * @param {string} chainId
         * @param {IBCConnectionID} hostConnectionId the counterparty
         *   connection_id
         * @param {IBCConnectionID} controllerConnectionId self connection_id
         * @param {ICAChannelAddressOpts} [opts] optional to configure the
         *   channel address, such as version and ordering
         * @returns {Vow<IcaAccount>}
         */
        makeAccount(chainId, hostConnectionId, controllerConnectionId, opts) {
          const remoteConnAddr = makeICAChannelAddress(
            hostConnectionId,
            controllerConnectionId,
            opts,
          );
          const { portAllocator } = this.state;
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
         * @satisfies {CosmosInterchainService['provideICQConnection']}
         * @param {IBCConnectionID} controllerConnectionId
         * @param {string} [version]
         * @returns {Vow<ICQConnection> | ICQConnection}
         */
        provideICQConnection(controllerConnectionId, version) {
          const icqLookupKey = getICQConnectionKey(
            controllerConnectionId,
            version,
          );
          if (this.state.icqConnections.has(icqLookupKey)) {
            return asVow(
              () => this.state.icqConnections.get(icqLookupKey).connection,
            );
          }
          const remoteConnAddr = makeICQChannelAddress(
            controllerConnectionId,
            version,
          );
          const { portAllocator, sharedICQPort } = this.state;
          const portOrPortVow =
            sharedICQPort || E(portAllocator).allocateICQControllerPort();

          return watch(portOrPortVow, this.facets.requestICQChannelWatcher, {
            remoteConnAddr,
            icqLookupKey,
          });
        },
      },
    },
    {
      stateShape: {
        icqConnections: M.remotable('icqConnections mapStore'),
        sharedICQPort: M.or(M.remotable('Port'), M.undefined()),
        portAllocator: M.remotable('PortAllocator'),
        reserved: M.any(),
      },
    },
  );

/**
 * Used only by vat-orchestration and tests mocking it
 *
 * @param {Zone} zone
 * @param {VowTools} vowTools
 * @internal
 */
export const prepareCosmosInterchainService = (zone, vowTools) => {
  const makeIcaAccountKit = prepareIcaAccountKit(zone, vowTools);
  const makeICQConnectionKit = prepareICQConnectionKit(zone, vowTools);
  const makeCosmosOrchestrationServiceKit =
    prepareCosmosOrchestrationServiceKit(
      zone,
      vowTools,
      makeIcaAccountKit,
      makeICQConnectionKit,
    );

  const makeCosmosInterchainService = pickFacet(
    makeCosmosOrchestrationServiceKit,
    'public',
  );

  return makeCosmosInterchainService;
};
harden(prepareCosmosInterchainService);

/** @typedef {ReturnType<typeof prepareCosmosInterchainService>} MakeCosmosInterchainService */
