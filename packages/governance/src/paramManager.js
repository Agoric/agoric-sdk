// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { assertKeywordName } from '@agoric/zoe/src/cleanProposal.js';
import { mustBeComparable } from '@agoric/same-structure';

/** @type {AssertParamManagerType} */
const looksLikeParam = (value, name) => {
  assert.typeof(name, 'string');
  mustBeComparable(value);
};

/** @type {BuildParamManager} */
const buildParamManager = paramDescriptions => {
  const paramValues = {};
  // updateFns will have updateFoo() for each Foo param.
  const updateFns = {};

  paramDescriptions.forEach(({ name, value }) => {
    // we want to create function names like updateFeeRatio(), so we insist that
    // the name has Keyword-nature.
    assertKeywordName(name);

    assert(
      !paramValues[name],
      X`each parameter name must be unique: ${name} duplicated`,
    );
    looksLikeParam(value, name);

    paramValues[name] = { value };
    updateFns[`update${name}`] = newValue => {
      looksLikeParam(newValue, name);
      paramValues[name].value = newValue;
      return newValue;
    };
  });

  const makeDescription = name => ({
    name,
    value: paramValues[name].value,
  });
  const getParams = () => {
    /** @type {Record<Keyword,ParamDescription>} */
    const descriptions = {};
    Object.getOwnPropertyNames(paramValues).forEach(name => {
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

harden(buildParamManager);
harden(looksLikeParam);
export { buildParamManager, looksLikeParam };
