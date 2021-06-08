// @ts-check

import { makeStore } from '@agoric/store';
import { assert, details as X } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport';
import { AmountMath, looksLikeBrand } from '@agoric/ertp';

const ParamType = {
  NAT: 'nat',
  BIGINT: 'bigint',
  STRING: 'string',
  RATIO: 'ratio',
  AMOUNT: 'amount',
  BRAND: 'brand',
};
harden(ParamType);

const assertType = (type, value, name) => {
  if (!type) {
    // undefined type means don't verify. Did we omit an interesting type?
    return;
  }

  switch (type) {
    case ParamType.NAT:
      Nat(value);
      break;
    case ParamType.BIGINT:
      assert.typeof(value, 'bigint');
      break;
    case ParamType.STRING:
      assert.typeof(value, 'string');
      break;
    case ParamType.RATIO:
      assertIsRatio(value);
      break;
    case ParamType.AMOUNT:
      // TODO(hibbert): is there a clean way to assert something is an amount?
      // An alternate approach would be to say the contract knows the brand and
      // the managed parameter only needs to supply the value.
      assert(
        AmountMath.isEqual(value, value),
        X`value for ${name} must be an Amount, was ${value}`,
      );
      break;
    case ParamType.BRAND:
      assert(
        looksLikeBrand(value),
        X`value for ${name} must be a brand, was ${value}`,
      );
      break;
    default:
      assert.fail(X`unknown type guard ${type}`);
  }
};

const parse = paramDesc => {
  const bindings = makeStore('name');
  const types = makeStore('name');

  paramDesc.forEach(({ name, value, type }) => {
    assert.typeof(name, 'string');
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
