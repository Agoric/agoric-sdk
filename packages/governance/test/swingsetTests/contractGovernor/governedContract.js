// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

/** @type {ContractStartFn} */
const start = async zcf => {
  const { main: initialValue } = zcf.getTerms();
  const { wrapPublicFacet, wrapCreatorFacet } = handleParamGovernance(
    zcf,
    harden(initialValue),
  );

  return {
    publicFacet: wrapPublicFacet({}),
    creatorFacet: wrapCreatorFacet({}),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);

export { start, MALLEABLE_NUMBER };
