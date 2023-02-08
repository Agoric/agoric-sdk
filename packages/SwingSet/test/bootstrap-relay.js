import { E } from '@endo/eventual-send';
import { Far, isObject, makeMarshal } from '@endo/marshal';
import { assert } from '@agoric/assert';
import { objectMap } from '@agoric/internal';
import { buildManualTimer } from '../tools/manual-timer.js';

const { Fail, quote: q } = assert;

const sink = () => {};

// TODO define these somewhere more accessible. https://github.com/endojs/endo/issues/1488
/**
 * @typedef {Promise | import('@agoric/internal').Remotable} PassByRef
 * Gets transformed by a marshaller encoding.
 * As opposed to pass-by-copy
 */

export const buildRootObject = () => {
  const timer = buildManualTimer();
  let vatAdmin;
  const vatData = new Map();

  // Represent all data as passable by replacing non-passable values
  // with special-prefix registered symbols.
  /** @type {Map<symbol, PassByRef>} */
  const replaced = new Map();
  /** @type {Map<PassByRef, symbol>} */
  const replacements = new Map(); // inverse of 'replaced'

  // This is testing code, so we don't enforce absence of this prefix
  // from manually created symbols.
  const replacementPrefix = 'replaced:';
  const provideReplacement = value => {
    if (replacements.has(value)) {
      return replacements.get(value);
    }

    const replacement = Symbol.for(`${replacementPrefix}${replaced.size}`);
    replacements.set(value, replacement);
    replaced.set(replacement, value);

    // Suppress unhandled promise rejection warnings.
    void E.when(value, sink, sink);

    return replacement;
  };
  const { serialize: encodeReplacements } = makeMarshal(
    provideReplacement,
    undefined,
    {
      marshalSaveError: () => {},
      serializeBodyFormat: 'capdata',
    },
  );
  const { unserialize: decodeReplacements } = makeMarshal(
    undefined,
    undefined,
    {
      serializeBodyFormat: 'capdata',
    },
  );
  const encodePassable = value => decodeReplacements(encodeReplacements(value));
  const decodePassable = arg => {
    // Recursively replace our symbols with their non-passable source data.
    if (Array.isArray(arg)) {
      return arg.map(decodePassable);
    } else if (isObject(arg)) {
      const entries = Object.entries(arg);
      const decodedEntries = entries.map(([key, value]) => [
        key,
        decodePassable(value),
      ]);
      return Object.fromEntries(decodedEntries);
    } else if (
      typeof arg !== 'symbol' ||
      !Symbol.keyFor(arg) ||
      !arg.description?.startsWith(replacementPrefix)
    ) {
      return arg;
    }
    const value =
      replaced.get(arg) || Fail`no value for replacement: ${q(arg)}`;
    return value;
  };

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
