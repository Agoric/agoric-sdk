import { E } from '@endo/eventual-send';
import { Far, makeMarshal } from '@endo/marshal';
import { assert } from '@agoric/assert';

const { details: X, quote: q } = assert;

export const buildRootObject = () => {
  let vatAdmin;
  const vatData = new Map();

  // Represent all data as copyable by overloading symbols.
  const valToSymbol = new Map();
  const symbolToVal = new Map();
  // This is testing code, so we don't enforce absence of this prefix
  // from manually created symbols.
  const remotePrefix = 'remote:';
  const mapValToSymbol = value => {
    const mapped = Symbol.for(`${remotePrefix}${valToSymbol.size}`);
    valToSymbol.set(value, mapped);
    symbolToVal.set(mapped, value);
    return mapped;
  };
  const slotToVal = undefined;
  const { unserialize: unencode } = makeMarshal(undefined, undefined, {
    serializeBodyFormat: 'capdata',
  });
  const { serialize: symbolEncode } = makeMarshal(mapValToSymbol, slotToVal, {
    marshalSaveError: () => {},
    serializeBodyFormat: 'capdata',
  });
  const copyableFromValue = value => unencode(symbolEncode(value));
  const valueFromCopyable = arg => {
    // This is testing code, so we look for special symbols only at top level.
    if (typeof arg !== 'symbol' || !Symbol.keyFor(arg)) {
      return arg;
    }
    const { description } = arg;
    if (description.startsWith(remotePrefix)) {
      const value =
        symbolToVal.get(arg) || assert.fail(X`no value for symbol: ${q(arg)}`);
      return value;
    }
    return arg;
  };

  return Far('root', {
    bootstrap: async (vats, devices) => {
      vatAdmin = await E(vats.vatAdmin).createVatAdminService(devices.vatAdmin);
    },

    createVat: async ({ name, bundleCapName, vatParameters = {} }) => {
      const bcap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const options = { vatParameters };
      const { adminNode, root } = await E(vatAdmin).createVat(bcap, options);
      vatData.set(name, { adminNode, root });
      return root;
    },

    upgradeVat: async ({ name, bundleCapName, vatParameters = {} }) => {
      const vat =
        vatData.get(name) || assert.fail(X`unknown vat name: ${q(name)}`);
      const bcap = await E(vatAdmin).getNamedBundleCap(bundleCapName);
      const options = { vatParameters };
      const result = await E(vat.adminNode).upgrade(bcap, options);
      const { rootObject, incarnationNumber } = result;
      vat.root = rootObject;
      vat.incarnationNumber = incarnationNumber;
      return incarnationNumber;
    },

    messageVat: async ({ name, methodName, args = [] }) => {
      const vat =
        vatData.get(name) || assert.fail(X`unknown vat name: ${q(name)}`);
      const { root } = vat;
      const result = await E(root)[methodName](...args);
      const copyableResult = copyableFromValue(result);
      return copyableResult;
    },

    messageVatObject: async ({ presence, methodName, args = [] }) => {
      const object = valueFromCopyable(presence);
      const mappedArgs = args.map(valueFromCopyable);
      const result = await E(object)[methodName](...mappedArgs);
      const copyableResult = copyableFromValue(result);
      return copyableResult;
    },

    awaitVatObject: async ({ presence, path = [] }) => {
      const object = await valueFromCopyable(presence);
      let value = object;
      for (const key of path) {
        // eslint-disable-next-line no-await-in-loop
        value = await value[key];
      }
      const copyableValue = copyableFromValue(value);
      return copyableValue;
    },
  });
};
