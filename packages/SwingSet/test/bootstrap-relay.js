import { assert } from '@agoric/assert';
import { objectMap } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { buildManualTimer } from '../tools/manual-timer.js';
import { makePassableEncoding } from '../tools/passableEncoding.js';

const { Fail, quote: q } = assert;

export const buildRootObject = () => {
  const timer = buildManualTimer();
  let vatAdmin;
  const vatData = new Map();

  const { encodePassable, decodePassable } = makePassableEncoding();

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
      for (const [name, root] of Object.entries(vats)) {
        if (name !== 'vatAdmin') {
          vatData.set(name, { root });
        }
      }
    },

    getVatAdmin: async () => encodePassable(vatAdmin),

    getTimer: async () => encodePassable(timer),

    createVat: async ({ name, bundleCapName, vatParameters = {} }) => {
      const bcap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const options = { vatParameters };
      const { adminNode, root } = await E(vatAdmin).createVat(bcap, options);
      vatData.set(name, { adminNode, root });
      return encodePassable(root);
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
     * Turns an object into a remotable by ensuring that each property is a function
     *
     * @param {string} label
     * @param {Record<string, any>} methodReturnValues
     */
    makeSimpleRemotable: (label, methodReturnValues) =>
      // braces to unharden so it can be hardened
      encodePassable(
        Far(label, {
          ...objectMap(methodReturnValues, v => () => decodePassable(v)),
        }),
      ),

    messageVat: async ({ name, methodName, args = [] }) => {
      const vat = vatData.get(name) || Fail`unknown vat name: ${q(name)}`;
      const { root } = vat;
      const decodedArgs = args.map(decodePassable);
      const result = await E(root)[methodName](...decodedArgs);
      return encodePassable(result);
    },

    messageVatObject: async ({ presence, methodName, args = [] }) => {
      const object = decodePassable(presence);
      const decodedArgs = args.map(decodePassable);
      const result = await E(object)[methodName](...decodedArgs);
      return encodePassable(result);
    },

    awaitVatObject: async ({ presence, path = [] }) => {
      let value = await decodePassable(presence);
      for (const key of path) {
        // eslint-disable-next-line no-await-in-loop
        value = await value[key];
      }
      return encodePassable(value);
    },
  });
};
