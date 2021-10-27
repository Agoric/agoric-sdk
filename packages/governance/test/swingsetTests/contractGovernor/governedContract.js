// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

/** @type {ContractStartFn} */
const start = async zcf => {
  const { main: initialValue } = zcf.getTerms();
  const { makePublicFacet, makeCreatorFacet } = handleParamGovernance(
    zcf,
    harden(initialValue),
  );

  return {
    publicFacet: makePublicFacet({}),
    creatorFacet: makeCreatorFacet({}),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);

export { start, MALLEABLE_NUMBER };
