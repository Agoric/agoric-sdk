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
 *
 * UNKNOWN is an escape hatch for types we haven't added yet. If you are
 * developing a new contract and use UNKNOWN, please also file an issue to ask
 * us to support the new type.
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

/** @type {AssertParamManagerType} */
const assertType = (type, value, name) => {
  switch (type) {
    case ParamType.AMOUNT:
      // It would be nice to have a clean way to assert something is an amount.
      // @ts-ignore value is undifferentiated to this point
      AmountMath.coerce(value.brand, value);
      break;
    case ParamType.BRAND:
      assert(
        // @ts-ignore value is undifferentiated to this point
        looksLikeBrand(value),
        X`value for ${name} must be a brand, was ${value}`,
      );
      break;
    case ParamType.INSTALLATION:
      // TODO(3344): add a better assertion once Zoe validates installations
      assert(
        typeof value === 'object' &&
          Object.getOwnPropertyNames(value).length === 1,
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
    case ParamType.UNKNOWN:
      break;
    default:
      assert.fail(X`unrecognized type ${type}`);
  }
};

/** @type {BuildParamManager} */
const buildParamManager = paramDescriptions => {
  const typesAndValues = {};
  // updateFns will have updateFoo() for each Foo param.
  const updateFns = {};

  paramDescriptions.forEach(({ name, value, type }) => {
    // we want to create function names like updateFeeRatio(), so we insist that
    // the name has Keyword-nature.
    assertKeywordName(name);

    assert(
      !typesAndValues[name],
      X`each parameter name must be unique: ${name} duplicated`,
    );
    assertType(type, value, name);

    typesAndValues[name] = { type, value };
    updateFns[`update${name}`] = newValue => {
      assertType(type, newValue, name);
      typesAndValues[name].value = newValue;
      return newValue;
    };
  });

  const makeDescription = name => ({
    name,
    type: typesAndValues[name].type,
    value: typesAndValues[name].value,
  });
  const getParams = () => {
    /** @type {Record<Keyword,ParamDescription>} */
    const descriptions = {};
    Object.getOwnPropertyNames(typesAndValues).forEach(name => {
      descriptions[name] = makeDescription(name);
    });
    return harden(descriptions);
  };
  const getParam = name => harden(makeDescription(name));

  // Contracts that call buildParamManager should only export the resulting
  // paramManager to their creatorFacet, where it will be picked up by
  // contractGovernor. The getParams method can be shared widely.
  return Far('param manager', {
    getParams,
    getParam,
    ...updateFns,
  });
};

harden(ParamType);
harden(buildParamManager);
harden(assertType);
export { ParamType, buildParamManager, assertType };
