// @ts-check

import { assert, details as X } from '@agoric/assert';
import { assertIsRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath, looksLikeBrand } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { Nat } from '@agoric/nat';

/**
 * @type {{
 *  AMOUNT: 'amount',
 *  BRAND: 'brand',
 *  INSTANCE: 'instance',
 *  INSTALLATION: 'installation',
 *  NAT: 'nat',
 *  RATIO: 'ratio',
 *  STRING: 'string',
 *  UNKNOWN: 'unknown',
 * }}
 */
const ParamType = {
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTANCE: 'instance',
  INSTALLATION: 'installation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  UNKNOWN: 'unknown',
};
harden(ParamType);

const assertType = (type, value, name) => {
  switch (type) {
    case ParamType.AMOUNT:
      // It would be nice to have a clean way to assert something is an amount.
      AmountMath.coerce(value.brand, value);
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
        X`value for ${name} must be an Installation, was ${value}`,
      );
      break;
    case ParamType.INSTANCE:
      // TODO(3344): add a better assertion once Zoe validates instances
      assert(
        typeof value === 'object' && !Object.getOwnPropertyNames(value).length,
        X`value for ${name} must be an Instance, was ${value}`,
      );
      break;
    case ParamType.NAT:
      assert.typeof(value, 'bigint');
      Nat(value);
      break;
    case ParamType.RATIO:
      assertIsRatio(value);
      break;
    case ParamType.STRING:
      assert.typeof(value, 'string');
      break;
    // This is an escape hatch for types we haven't added yet. If you need to
    // use it, please file an issue and ask us to support the new type.
    case ParamType.UNKNOWN:
      break;
    default:
      assert.fail(X`unrecognized type ${type}`);
  }
};

const parse = paramDesc => {
  const typesAndValues = {};
  // manager has an updateFoo() for each Foo param. It will be returned.
  const manager = {};

  paramDesc.forEach(({ name, value, type }) => {
    // we want to create function names like updateFeeRatio(), so we insist that
    // the name has Keyword-nature.
    assertKeywordName(name);

    assert(
      !typesAndValues[name],
      X`each parameter name must be unique: ${name} duplicated`,
    );
    assertType(type, value, name);

    typesAndValues[name] = { type, value };
    manager[`update${name}`] = newValue => {
      assertType(type, newValue, name);
      typesAndValues[name].value = newValue;
    };
  });

  const getParams = () => {
    /** @type {Record<Keyword,ParamDescription>} */
    const descriptions = {};
    Object.getOwnPropertyNames(typesAndValues).forEach(name => {
      descriptions[name] = {
        name,
        type: typesAndValues[name].type,
        value: typesAndValues[name].value,
      };
    });
    return harden(descriptions);
  };

  return { getParams, manager };
};

/** @type {BuildParamManager} */
const buildParamManager = paramDesc => {
  const { getParams, manager } = parse(paramDesc);

  return Far('param manager', {
    getParams,
    ...manager,
  });
};
harden(buildParamManager);

export { ParamType, buildParamManager };
