// @ts-check

import { makeStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport';
import { AmountMath, looksLikeBrand } from '@agoric/ertp';

const ParamType = {
  AMOUNT: 'amount',
  ANY: 'any',
  BIGINT: 'bigint',
  BRAND: 'brand',
  HANDLE: 'handle',
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
      // TODO(hibbert): is there a clean way to assert something is an amount?
      // An alternate approach would be to say the contract knows the brand and
      // the managed parameter only needs to supply the value.
      assert(
        AmountMath.isEqual(value, value),
        X`value for ${name} must be an Amount, was ${value}`,
      );
      break;
    case ParamType.ANY:
      break;
    case ParamType.BIGINT:
      assert.typeof(value, 'bigint');
      break;
    case ParamType.BRAND:
      assert(
        looksLikeBrand(value),
        X`value for ${name} must be a brand, was ${value}`,
      );
      break;
    case ParamType.HANDLE:
      assert(
        typeof value === 'object' && !Object.getOwnPropertyNames(value).length,
        X`value for ${name} must be an empty object, was ${value}`,
      );
      break;
    case ParamType.NAT:
      Nat(value);
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

  const publicFacet = {
    lookup(name) {
      return bindings.get(name);
    },
  };

  const manager = {
    update(name, value) {
      assertType(types.get(name), value, name);
      bindings.set(name, value);
    },
  };

  return { publicFacet, manager };
};
harden(buildParamManager);

export { ParamType, buildParamManager };
