// @ts-check

import { makeStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport';
import { AmountMath, looksLikeBrand } from '@agoric/ertp';
/**
 * @type {{
 *  AMOUNT: 'amount',
 *  ANY: 'any',
 *  BRAND: 'brand',
 *  INSTANCE: 'instance',
 *  INSTALLATION: 'installation',
 *  NAT: 'nat',
 *  RATIO: 'ratio',
 *  STRING: 'string',
 * }}
 */
const ParamType = {
  AMOUNT: 'amount',
  ANY: 'any',
  BRAND: 'brand',
  INSTANCE: 'instance',
  INSTALLATION: 'installation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
};
harden(ParamType);

const assertType = (type, value, name) => {
  if (!type) {
    // undefined type means don't verify. Did we omit an interesting type?
    return;
  }

  switch (type) {
    case ParamType.AMOUNT:
      // It would be nice to have a clean way to assert something is an amount.
      assert(
        AmountMath.isEqual(value, value),
        X`value for ${name} must be an Amount, was ${value}`,
      );
      break;
    case ParamType.ANY:
      break;
    case ParamType.BRAND:
      assert(
        looksLikeBrand(value),
        X`value for ${name} must be a brand, was ${value}`,
      );
      break;
    case ParamType.INSTALLATION:
      // TODO(3344): add a better assertion once Zoe validates installations
      assert(
        typeof value === 'object' && !Object.getOwnPropertyNames(value).length,
        X`value for ${name} must be an empty object, was ${value}`,
      );
      break;
    case ParamType.INSTANCE:
      // TODO(3344): add a better assertion once Zoe validates instances
      assert(
        typeof value === 'object' && !Object.getOwnPropertyNames(value).length,
        X`value for ${name} must be an empty object, was ${value}`,
      );
      break;
    case ParamType.NAT:
      assert.typeof(value, 'bigint');
      break;
    case ParamType.RATIO:
      assertIsRatio(value);
      break;
    case ParamType.STRING:
      assert.typeof(value, 'string');
      break;
    default:
      assert.fail(X`unknown type guard ${type}`);
  }
};

const parse = paramDesc => {
  const bindings = makeStore('name');
  const types = makeStore('name');

  paramDesc.forEach(({ name, value, type }) => {
    assertType(type, value, name);
    bindings.init(name, value);
    types.init(name, type);
  });

  return { bindings, types };
};

/** @type {BuildParamManager} */
const buildParamManager = paramDesc => {
  const { bindings, types } = parse(paramDesc);

  const params = {
    lookup: name => bindings.get(name),
    getDetails: name => ({
      name,
      value: bindings.get(name),
      type: types.get(name),
    }),
    definedNames: () => bindings.keys(),
  };

  const manager = {
    update(name, value) {
      assertType(types.get(name), value, name);
      bindings.set(name, value);
    },
  };

  return { params, manager };
};
harden(buildParamManager);

export { ParamType, buildParamManager };
