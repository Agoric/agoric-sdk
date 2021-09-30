// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';
import { ParamType } from '../../../src/paramManager.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

/** @type {ParameterNameList} */
const governedParameterTerms = {
  main: [MALLEABLE_NUMBER],
};

/** @type {ParamDescriptions} */
const governedParameterInitialValues = [
  {
    name: MALLEABLE_NUMBER,
    value: 602214090000000000000000n,
    type: ParamType.NAT,
  },
];
harden(governedParameterInitialValues);

/** @type {ContractStartFn} */
const start = async zcf => {
  const { makePublicFacet, makeCreatorFacet } = handleParamGovernance(
    zcf,
    governedParameterInitialValues,
  );

  return {
    publicFacet: makePublicFacet({}),
    creatorFacet: makeCreatorFacet({}),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);
harden(governedParameterTerms);

export {
  start,
  governedParameterTerms,
  MALLEABLE_NUMBER,
  governedParameterInitialValues,
};
