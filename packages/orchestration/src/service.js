/** @file Orchestration service */

import { V as E } from '@agoric/vow/vat.js';
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
 * @import {Port, PortAllocator} from '@agoric/network';
 * @import {IBCConnectionID} from '@agoric/vats';
 * @import {ICQConnection, IcaAccount, ICQConnectionKit} from './types.js';
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

/**
 * @typedef {MapStore<IBCConnectionID, ICQConnectionKit>} ICQConnectionStore
 */

/**
 * @template {keyof OrchestrationPowers} K
 * @param {PowerStore} powers
 * @param {K} name
 */
const getPower = (powers, name) => {
  powers.has(name) || Fail`need powers.${bare(name)} for this method`;
  return /** @type {OrchestrationPowers[K]} */ (powers.get(name));
};

export const OrchestrationI = M.interface('Orchestration', {
  makeAccount: M.callWhen(M.string(), M.string(), M.string()).returns(
    M.remotable('ChainAccount'),
  ),
  provideICQConnection: M.callWhen(M.string()).returns(
    M.remotable('Connection'),
  ),
});

/** @typedef {{ powers: PowerStore; icqConnections: ICQConnectionStore }} OrchestrationState */

/**
 * @param {Zone} zone
 * @param {ReturnType<typeof prepareChainAccountKit>} makeChainAccountKit
 * @param {ReturnType<typeof prepareICQConnectionKit>} makeICQConnectionKit
 */
const prepareOrchestrationKit = (
  zone,
  makeChainAccountKit,
  makeICQConnectionKit,
) =>
  zone.exoClassKit(
    'Orchestration',
    {
      self: M.interface('OrchestrationSelf', {
        allocateICAControllerPort: M.callWhen().returns(
          NetworkShape.Vow$(NetworkShape.Port),
        ),
        allocateICQControllerPort: M.callWhen().returns(
          NetworkShape.Vow$(NetworkShape.Port),
        ),
      }),
      public: OrchestrationI,
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
      self: {
        async allocateICAControllerPort() {
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return E(portAllocator).allocateICAControllerPort();
        },
        async allocateICQControllerPort() {
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return E(portAllocator).allocateICAControllerPort();
        },
      },
      public: {
        /**
         * @param {string} chainId
         * @param {IBCConnectionID} hostConnectionId the counterparty
         *   connection_id
         * @param {IBCConnectionID} controllerConnectionId self connection_id
         * @returns {Promise<IcaAccount>}
         */
        async makeAccount(chainId, hostConnectionId, controllerConnectionId) {
          const port = await this.facets.self.allocateICAControllerPort();

          const remoteConnAddr = makeICAChannelAddress(
            hostConnectionId,
            controllerConnectionId,
          );
          const chainAccountKit = makeChainAccountKit(
            chainId,
            port,
            remoteConnAddr,
          );

          // await so we do not return a ChainAccount before it successfully instantiates
          await E(port).connect(
            remoteConnAddr,
            chainAccountKit.connectionHandler,
          );
          // XXX if we fail, should we close the port (if it was created in this flow)?
          return chainAccountKit.account;
        },
        /**
         * @param {IBCConnectionID} controllerConnectionId
         * @returns {Promise<ICQConnection>}
         */
        async provideICQConnection(controllerConnectionId) {
          if (this.state.icqConnections.has(controllerConnectionId)) {
            return this.state.icqConnections.get(controllerConnectionId)
              .connection;
          }
          // allocate a new Port for every Connection
          // TODO #9317 optimize ICQ port allocation
          const port = await this.facets.self.allocateICQControllerPort();
          const remoteConnAddr = makeICQChannelAddress(controllerConnectionId);
          const icqConnectionKit = makeICQConnectionKit(port);

          // await so we do not return/save a ICQConnection before it successfully instantiates
          await E(port).connect(
            remoteConnAddr,
            icqConnectionKit.connectionHandler,
          );

          this.state.icqConnections.init(
            controllerConnectionId,
            icqConnectionKit,
          );

          return icqConnectionKit.connection;
        },
      },
    },
  );

/** @param {Zone} zone */
export const prepareOrchestrationTools = zone => {
  const makeChainAccountKit = prepareChainAccountKit(zone);
  const makeICQConnectionKit = prepareICQConnectionKit(zone);
  const makeOrchestrationKit = prepareOrchestrationKit(
    zone,
    makeChainAccountKit,
    makeICQConnectionKit,
  );

  return harden({ makeOrchestrationKit });
};
harden(prepareOrchestrationTools);

/** @typedef {ReturnType<typeof prepareOrchestrationTools>} OrchestrationTools */
/** @typedef {ReturnType<OrchestrationTools['makeOrchestrationKit']>} OrchestrationKit */
/** @typedef {OrchestrationKit['public']} OrchestrationService */
