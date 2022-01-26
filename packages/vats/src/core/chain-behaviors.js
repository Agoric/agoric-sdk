// @ts-check
import { E, Far } from '@agoric/far';
import { deeplyFulfilled } from '@agoric/marshal';
import {
  makeNotifierKit,
  makeSubscriptionKit,
  observeIteration,
} from '@agoric/notifier';

import { makeBridgeManager as makeBridgeManagerKit } from '../bridge.js';

import { callProperties } from './utils.js';

const { details: X } = assert;

/**
 * @param {BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<ProvisioningVat>> }
 * }} powers
 */
export const makeProvisioner = async ({
  consume: { clientCreator, loadVat },
  vats: { comms, vattp },
  produce: { provisioning },
}) => {
  const provisionerVat = E(loadVat)('provisioning');
  await E(provisionerVat).register(clientCreator, comms, vattp);
  provisioning.resolve(provisionerVat);
};
harden(makeProvisioner);

/** @param {BootstrapPowers} powers */
export const bridgeProvisioner = async ({
  consume: { provisioning, bridgeManager: bridgeManagerP },
}) => {
  const bridgeManager = await bridgeManagerP;
  if (!bridgeManager) {
    return;
  }

  // Register a provisioning handler over the bridge.
  const handler = Far('provisioningHandler', {
    async fromBridge(_srcID, obj) {
      switch (obj.type) {
        case 'PLEASE_PROVISION': {
          const { nickname, address, powerFlags } = obj;
          return E(provisioning)
            .pleaseProvision(nickname, address, powerFlags)
            .catch(e =>
              console.error(`Error provisioning ${nickname} ${address}:`, e),
            );
        }
        default:
          assert.fail(X`Unrecognized request ${obj.type}`);
      }
    },
  });
  await E(bridgeManager).register('provision', handler);
};
harden(bridgeProvisioner);

/** @param {BootstrapPowers} powers */
export const makeClientManager = async ({
  produce: { client, clientCreator: clientCreatorP },
}) => {
  // Create a subscription of chain configurations.
  /** @type {SubscriptionRecord<PropertyMakers>} */
  const { subscription, publication } = makeSubscriptionKit();

  // Cache the latest full property maker state.
  /** @type { PropertyMakers } */
  let cachedPropertyMakers = {};

  /** @type {ClientManager} */
  const clientManager = Far('chainClientManager', {
    assignBundle: newPropertyMakers => {
      // Write the property makers to the cache, and update the subscription.
      cachedPropertyMakers = { ...cachedPropertyMakers, ...newPropertyMakers };
      publication.updateState(newPropertyMakers);
    },
  });

  /** @type {ClientCreator} */
  const clientCreator = Far('clientCreator', {
    createUserBundle: (nickname, clientAddress, powerFlags) => {
      const c = E(clientCreator).createClientFacet(
        nickname,
        clientAddress,
        powerFlags,
      );
      return E(c).getChainBundle();
    },
    createClientFacet: async (_nickname, clientAddress, _powerFlags) => {
      /** @type {Record<string, unknown>} */
      let clientHome = {};

      const makeUpdatedConfiguration = (newPropertyMakers = {}) => {
        // Specialize the property makers with the client address.
        const newProperties = callProperties(newPropertyMakers, clientAddress);
        clientHome = { ...clientHome, ...newProperties };
        const config = harden({ clientAddress, clientHome });
        /** @type {typeof config} */
        const df = deeplyFulfilled(config);
        return df;
      };

      // Publish new configurations.
      const { notifier, updater } = makeNotifierKit(
        makeUpdatedConfiguration(cachedPropertyMakers),
      );

      /** @type {ClientFacet} */
      const clientFacet = Far('chainProvisioner', {
        getChainBundle: () => clientHome,
        getConfiguration: () => notifier,
      });

      observeIteration(subscription, {
        updateState(newPropertyMakers) {
          updater.updateState(makeUpdatedConfiguration(newPropertyMakers));
        },
      });

      return clientFacet;
    },
  });

  clientCreatorP.resolve(clientCreator);
  client.resolve(clientManager);
};
harden(makeClientManager);

/** @param {BootstrapPowers} powers */
export const startTimerService = async ({
  devices: { timer: timerDevice },
  vats: { timer: timerVat },
  produce: { chainTimerService },
}) => {
  chainTimerService.resolve(E(timerVat).createTimerService(timerDevice));
};
harden(startTimerService);

/** @param {BootstrapPowers} powers */
export const makeBridgeManager = async ({
  devices: { bridge },
  vatPowers: { D },
  produce: { bridgeManager },
}) => {
  const myBridge = bridge ? makeBridgeManagerKit(E, D, bridge) : undefined;
  if (!myBridge) {
    console.warn(
      'Running without a bridge device; this is not an actual chain.',
    );
  }
  bridgeManager.resolve(myBridge);
};
harden(makeBridgeManager);

/** @param {BootstrapPowers} powers */
export const connectChainFaucet = async ({ consume: { client } }) => {
  const makeFaucet = async _address => {
    return Far('faucet', {
      tapFaucet: () => [], // no free lunch on chain
    });
  };

  return E(client).assignBundle({ faucet: makeFaucet });
};
harden(connectChainFaucet);
