import { E } from '@endo/far';
import { prepareProvisionBridgeHandler } from '../lib-provisioning.js';

const convertProvisioningHandlerDurable = async ({
  consume: {
    provisioning: provisioningP,
    provisionBridgeManager: provisionBridgeManagerP,
    provisionWalletBridgeManager: provisionWalletBridgeManagerP,
    powerStore: powerStoreP,
  },
}) => {
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
  if (!provisionBridgeManager || !provisionWalletBridgeManager) {
    return;
  }

  // Using powerStore as the durable map here
  const makeProvisionBridgeHandler = prepareProvisionBridgeHandler(powerStore);
  const provisioningHandler = makeProvisionBridgeHandler(
    provisioning,
    provisionWalletBridgeManager,
  );

  const handler = provisioning
    ? provisioningHandler
    : provisionWalletBridgeManager;
  await E(provisionBridgeManager).setHandler(handler);
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
