// @ts-check
/** @file Orchestration service */

// XXX ambient types runtime imports until https://github.com/Agoric/agoric-sdk/issues/6512
import '@agoric/network/exported.js';

import { V as E } from '@agoric/vat-data/vow.js';
import { M } from '@endo/patterns';
import { prepareChainAccountKit } from './exos/chainAccountKit.js';
import { makeICAConnectionAddress } from './utils/address.js';

/**
 * @import { PortAllocator} from '@agoric/network';
 * @import { IBCConnectionID } from '@agoric/vats';
 * @import { Zone } from '@agoric/base-zone';
 * @import { ChainAccount } from './types.js';
 */

const { Fail, bare } = assert;

/**
 * @typedef {object} OrchestrationPowers
 * @property {ERef<PortAllocator>} portAllocator
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
 * @template {keyof OrchestrationPowers} K
 * @param {PowerStore} powers
 * @param {K} name
 */
const getPower = (powers, name) => {
  powers.has(name) || Fail`need powers.${bare(name)} for this method`;
  return /** @type {OrchestrationPowers[K]} */ (powers.get(name));
};

export const OrchestrationI = M.interface('Orchestration', {
  makeAccount: M.callWhen(M.string(), M.string()).returns(
    M.remotable('ChainAccount'),
  ),
});

/**
 * @param {Zone} zone
 * @param {ReturnType<typeof prepareChainAccountKit>} makeChainAccountKit
 */
const prepareOrchestration = (zone, makeChainAccountKit) =>
  zone.exoClassKit(
    'Orchestration',
    {
      self: M.interface('OrchestrationSelf', {
        bindPort: M.callWhen().returns(M.remotable()),
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
      return { powers };
    },
    {
      self: {
        async bindPort() {
          const portAllocator = getPower(this.state.powers, 'portAllocator');
          return E(portAllocator).allocateICAControllerPort();
        },
      },
      public: {
        /**
         * @param {IBCConnectionID} hostConnectionId
         *   the counterparty connection_id
         * @param {IBCConnectionID} controllerConnectionId
         *   self connection_id
         * @returns {Promise<ChainAccount>}
         */
        async makeAccount(hostConnectionId, controllerConnectionId) {
          const port = await this.facets.self.bindPort();

          const remoteConnAddr = makeICAConnectionAddress(
            hostConnectionId,
            controllerConnectionId,
          );
          const chainAccountKit = makeChainAccountKit(port, remoteConnAddr);

          // await so we do not return a ChainAccount before it successfully instantiates
          await E(port).connect(
            remoteConnAddr,
            chainAccountKit.connectionHandler,
          );
          // XXX if we fail, should we close the port (if it was created in this flow)?

          return chainAccountKit.account;
        },
      },
    },
  );

/** @param {Zone} zone */
export const prepareOrchestrationTools = zone => {
  const makeChainAccountKit = prepareChainAccountKit(zone);
  const makeOrchestration = prepareOrchestration(zone, makeChainAccountKit);

  return harden({ makeOrchestration });
};
harden(prepareOrchestrationTools);

/** @typedef {ReturnType<typeof prepareOrchestrationTools>} OrchestrationTools */
/** @typedef {ReturnType<OrchestrationTools['makeOrchestration']>} OrchestrationKit */
/** @typedef {OrchestrationKit['public']} OrchestrationService */
