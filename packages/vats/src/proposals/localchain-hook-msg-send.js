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
    consume: { vtransferBridgeManager: transferBridgeManagerP },
  } = powers;
  const [upgradeRoots, transferBridgeManager] = await Promise.all([
    upgradeVatsGeneric(powers, options),
    transferBridgeManagerP,
  ]);

  // Link in the transferBridgeManager to the localchain vat.
  await E(upgradeRoots.localchain).overridePowers({
    transferBridgeManager,
  });
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
        },
      },
    },
    ...rest,
  };
};
