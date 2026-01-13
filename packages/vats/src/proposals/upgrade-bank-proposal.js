import { E } from '@endo/far';

/**
 * @import {CreateVatResults, VatAdminSvc} from '@agoric/swingset-vat';
 * @import {MapStore} from '@agoric/store';
 * @import {BootstrapPowers} from '../core/types.ts';
 * @import {VatSourceRef} from '../core/types.ts';
 */

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vatAdminSvc: VatAdminSvc;
 *     vatStore: MapStore<string, CreateVatResults>;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ bankRef: VatSourceRef }} options.options
 */
export const upgradeBank = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { bankRef } = options.options;

  assert(bankRef.bundleID);
  const bankBundleCap = await E(vatAdminSvc).getBundleCap(bankRef.bundleID);
  console.log(`BANK BUNDLE ID: `, bankRef.bundleID);

  const { adminNode } = await E(vatStore).get('bank');

  await E(adminNode).upgrade(bankBundleCap, {});
};

export const getManifestForUpgradingBank = (_powers, { bankRef }) => ({
  manifest: {
    [upgradeBank.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: { bankRef },
});
