// @ts-check
import { E } from '@endo/far';
import {
  getManifestForUpgradingVats,
  upgradeVatsGeneric,
} from './upgrade-vats-generic-proposal.js';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vtransferBridgeManager: import('../types.js').ScopedBridgeManager<'vtransfer'>;
 *     transferMiddleware: import('../transfer.js').TransferMiddleware;
 *     vatAdminSvc: VatAdminSvc;
 *     vatStore: MapStore<
 *       string,
 *       import('@agoric/swingset-vat').CreateVatResults
 *     >;
 *   };
 * }} powers
 * @param {object} options
 */
export const upgradeAndInterceptMsgSend = async (powers, options) => {
  const {
    consume: {
      vtransferBridgeManager: vtransferBridgeManagerP,
      transferMiddleware: transferMiddlewareP,
    },
  } = powers;

  // Go on to upgrade the vats and provide the transferBridgeManager.
  const upgradeRoots = await upgradeVatsGeneric(powers, options);

  const [transferMiddleware, transferBridgeManager] = await Promise.all([
    transferMiddlewareP,
    vtransferBridgeManagerP,
  ]);

  // Link the transferBridgeManager with the localchain vat.
  await E(upgradeRoots.localchain).linkTransferMiddlewareToBridgeManager(
    transferMiddleware,
    transferBridgeManager,
  );
};

export const getManifestForMsgSendToTransfer = (powers, arg) => {
  const {
    manifest: { [upgradeVatsGeneric.name]: upgradeVatsManifest, ...empty },
    ...rest
  } = getManifestForUpgradingVats(powers, arg);
  assert.equal(
    Object.keys(empty).length,
    0,
    'expected empty remaining manifest',
  );

  return {
    manifest: {
      [upgradeAndInterceptMsgSend.name]: {
        ...upgradeVatsManifest,
        consume: {
          ...upgradeVatsManifest.consume,
          vtransferBridgeManager: 'hookedMsgSend',
          transferMiddleware: 'hookedMsgSend',
          vatStore: 'hookedMsgSend',
        },
      },
    },
    ...rest,
  };
};
