import { Fail, q } from '@endo/errors';
import { objectMap } from '@agoric/internal';
import { Far, E } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { buildManualTimer } from './manual-timer.js';

export const buildRootObject = () => {
  const timer = buildManualTimer();
  let vatAdmin;
  const vatData = new Map();
  const devicesByName = new Map();
  const callLogsByRemotable = new Map();

  return Far('root', {
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

    /**
     * Derives a remotable from an object by mapping each object property into a method that returns the value.
     *
     * @param {string} label
     * @param {Record<string, any>} returnValues
     */
    makeRemotable: (label, returnValues) => {
      const callLogs = [];
      const makeGetterFunction = (value, name) => {
        const getValue = (...args) => {
          callLogs.push([name, ...args]);
          return value;
        };
        return getValue;
      };
      // `objectMap` hardens its result, but...
      const methods = objectMap(returnValues, makeGetterFunction);
      // ... `Far` requires its methods argument not to be hardened.
      const remotable = Far(label, { ...methods });
      callLogsByRemotable.set(remotable, callLogs);
      return remotable;
    },

    makePromiseKit: () => {
      const { promise, ...resolverMethods } = makePromiseKit();
      const resolver = Far('resolver', resolverMethods);
      return harden({ promise, resolver });
    },

    /**
     * Returns a copy of a remotable's logs.
     *
     * @param {object} remotable
     */
    getLogForRemotable: remotable => {
      const logs =
        callLogsByRemotable.get(remotable) ||
        Fail`logs not found for ${q(remotable)}`;
      // Return a copy so that the original remains mutable.
      return harden([...logs]);
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
