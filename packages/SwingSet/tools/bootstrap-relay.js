/**
 * @file Source code for a bootstrap vat that runs blockchain behaviors (such as
 *   bridge vat integration) and exposes reflective methods for use in testing.
 *
 * TODO: Share code with packages/vats/tools/vat-reflective-chain-bootstrap.js
 * (which basically extends this for better [mock] blockchain integration).
 */

import { Fail, q } from '@endo/errors';
import { Far, E } from '@endo/far';
import { buildManualTimer } from './manual-timer.js';
import { makeReflectionMethods } from './vat-puppet.js';

export const buildRootObject = (vatPowers, bootstrapParameters, baggage) => {
  const timer = buildManualTimer();
  let vatAdmin;
  const vatData = new Map();
  const devicesByName = new Map();

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
          vatData.set(name, { root });
        }
      }
      for (const [name, device] of Object.entries(devices)) {
        devicesByName.set(name, device);
      }
    },

    getDevice: async deviceName => devicesByName.get(deviceName),

    getVatAdmin: async () => vatAdmin,

    getTimer: async () => timer,

    getVatRoot: async vatName => {
      const vat = vatData.get(vatName) || Fail`unknown vat name: ${q(vatName)}`;
      const { root } = vat;
      return root;
    },

    createVat: async (
      { name, bundleCapName, vatParameters = {} },
      options = {},
    ) => {
      const bcap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const vatOptions = { ...options, vatParameters };
      const { adminNode, root } = await E(vatAdmin).createVat(bcap, vatOptions);
      vatData.set(name, { adminNode, root });
      return root;
    },

    upgradeVat: async ({ name, bundleCapName, vatParameters = {} }) => {
      const vat = vatData.get(name) || Fail`unknown vat name: ${q(name)}`;
      const bcap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const options = { vatParameters };
      const incarnationNumber = await E(vat.adminNode).upgrade(bcap, options);
      vat.incarnationNumber = incarnationNumber;
      return incarnationNumber;
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
