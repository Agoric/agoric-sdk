import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal';
import { prepareProvisionBridgeHandler } from '../lib-provisioning.js';

const trace = makeTracer('ReplaceProvisioningHandler');

export const convertProvisioningHandlerDurable = async ({
  consume: {
    provisioning: provisioningP,
    provisionBridgeManager: provisionBridgeManagerP,
    provisionWalletBridgeManager: provisionWalletBridgeManagerP,
    powerStore: powerStoreP,
  },
}) => {
  trace('start core eval for replacing provisioningHandler with a durable one');

  const [
    provisioning,
    provisionBridgeManager,
    provisionWalletBridgeManager,
    powerStore,
  ] = await Promise.all([
    provisioningP,
    provisionBridgeManagerP,
    provisionWalletBridgeManagerP,
    powerStoreP,
  ]);
  trace('Powers awaited', {
    provisionBridgeManager,
    provisioning,
    provisionWalletBridgeManager,
    powerStore,
  });
  if (!provisionBridgeManager || !provisionWalletBridgeManager) {
    return;
  }

  // Using powerStore as the durable map here
  trace('building the exo object');
  const makeProvisionBridgeHandler = prepareProvisionBridgeHandler(powerStore);
  const provisioningHandler = makeProvisionBridgeHandler(
    provisioning,
    provisionWalletBridgeManager,
  );

  trace('setting handler');
  const handler = provisioning
    ? provisioningHandler
    : provisionWalletBridgeManager;

  trace('new handler:', handler);
  await E(provisionBridgeManager).setHandler(handler);

  trace('Done.');
};

export const getConvertProvisioningHandlerDurable = _powers => ({
  manifest: {
    [convertProvisioningHandlerDurable.name]: {
      consume: {
        provisioning: true,
        bridgeManager: 'bridge',
        provisionBridgeManager: 'bridge',
        provisionWalletBridgeManager: 'bridge',
        powerStore: 'bridge',
      },
    },
  },
});
