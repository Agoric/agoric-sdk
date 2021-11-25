// @ts-check

import { handleParamGovernance } from '../../../src/contractHelper.js';
import {
  ParamType,
  makeParamManagerBuilder,
} from '../../../src/paramGovernance/paramManager.js';

const MALLEABLE_NUMBER = 'MalleableNumber';

/** @type {ContractStartFn} */
const start = async zcf => {
  const {
    main: { [MALLEABLE_NUMBER]: numberParam },
  } = zcf.getTerms();
  assert(
    numberParam.type === ParamType.NAT,
    `${MALLEABLE_NUMBER} Should be a Nat: ${numberParam.type}`,
  );

  const { wrapPublicFacet, wrapCreatorFacet } = handleParamGovernance(
    zcf,
    makeParamManagerBuilder()
      .addNat(MALLEABLE_NUMBER, numberParam.value)
      .build(),
  );

  return {
    publicFacet: wrapPublicFacet({}),
    creatorFacet: wrapCreatorFacet({}),
  };
};

harden(start);
harden(MALLEABLE_NUMBER);

export { start, MALLEABLE_NUMBER };
