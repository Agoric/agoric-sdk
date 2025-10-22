/**
 * @file Source code for a bootstrap vat that runs blockchain behaviors (such as
 *   bridge vat integration) and exposes reflective methods for use in testing.
 *
 * TODO: Share code with packages/vats/tools/bootstrap-chain-reflective.js
 * (which basically extends this for better [mock] blockchain integration).
 */

import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { buildManualTimer } from './manual-timer.js';
import { makeReflectionMethods } from './vat-puppet.js';

/** @import { CreateVatResults } from '../src/types-external.js' */

/**
 * @typedef {{ root: object; incarnationNumber?: number }} VatRecord
 * @typedef {VatRecord & CreateVatResults & { bundleCap: unknown }} DynamicVatRecord
 */

export const buildRootObject = (vatPowers, bootstrapParameters, baggage) => {
  const manualTimer = buildManualTimer();

  // Captured/populated by bootstrap.
  let vatAdmin;
  const devicesByName = new Map();
  /** @type {Map<string, VatRecord | DynamicVatRecord>} */
  const vatRecords = new Map();

  const reflectionMethods = makeReflectionMethods(
    vatPowers,
    baggage,
    bootstrapParameters,
  );

  return Far('root', {
    ...reflectionMethods,

    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      for (const [name, root] of Object.entries(vats)) {
        if (name !== 'vatAdmin') {
          vatRecords.set(name, { root });
        }
      }
      for (const [name, device] of Object.entries(devices)) {
        devicesByName.set(name, device);
      }
    },

    getDevice: deviceName => devicesByName.get(deviceName),

    /** @todo Reconcile with packages/vats/tools/bootstrap-chain-reflective.js */
    getTimer: () => manualTimer,

    getVatAdmin: () => vatAdmin,

    getVatAdminNode: vatName => {
      const vat =
        vatRecords.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { adminNode } = /** @type {DynamicVatRecord} */ (vat);
      return adminNode;
    },

    getVatRoot: vatName => {
      const vat =
        vatRecords.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { root } = vat;
      return root;
    },

    /**
     * @todo Reconcile with packages/vats/tools/bootstrap-chain-reflective.js
     * @param {object} details
     * @param {string} details.name name by which the new vat can be referenced
     * @param {string} [details.bundleCapName] defaults to name
     * @param {Record<string, unknown>} [details.vatParameters]
     * @param {{ vatParameters?: object } & Record<string, unknown>} [vatOptions] for specifying more than vatParameters
     * @returns {Promise<DynamicVatRecord['root']>} root object of the new vat
     */
    createVat: async (
      { name, bundleCapName = name, vatParameters = undefined },
      vatOptions = {},
    ) => {
      if (Object.hasOwn(vatOptions, 'vatParameters') && vatParameters) {
        Fail`Conflicting specification of vatParameters`;
      }
      const bundleCap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const { root, adminNode } = await E(vatAdmin).createVat(bundleCap, {
        vatParameters: vatParameters || {},
        ...vatOptions,
      });
      vatRecords.set(name, { root, adminNode, bundleCap });
      return root;
    },

    /**
     * @todo Reconcile with packages/vats/tools/bootstrap-chain-reflective.js
     * @param {object} details
     * @param {string} details.name name of the vat to upgrade
     * @param {string} [details.bundleCapName] defaults to the current vat bundle
     * @param {Record<string, unknown>} [details.vatParameters]
     * @param {{ vatParameters?: object } & Record<string, unknown>} [vatOptions] for specifying more than vatParameters
     * @returns {Promise<{ incarnationNumber: number }>} the resulting incarnation number
     */
    upgradeVat: async (
      { name, bundleCapName = undefined, vatParameters = undefined },
      vatOptions = {},
    ) => {
      if (Object.hasOwn(vatOptions, 'vatParameters') && vatParameters) {
        Fail`Conflicting specification of vatParameters`;
      }
      const vatRecord =
        /** @type {DynamicVatRecord} */ (vatRecords.get(name)) ||
        Fail`unknown vat name: ${q(name)}`;
      const bundleCap = await (bundleCapName
        ? E(vatAdmin).getNamedBundleCap(bundleCapName)
        : vatRecord.bundleCap);
      const options = { vatParameters: vatParameters || {}, ...vatOptions };
      const { incarnationNumber } = await E(vatRecord.adminNode).upgrade(
        bundleCap,
        options,
      );
      vatRecord.incarnationNumber = incarnationNumber;
      return { incarnationNumber };
    },

    awaitVatObject: async (presence, path = []) => {
      let value = await presence;
      for (const key of path) {
        value = await value[key];
      }
      return value;
    },
  });
};
