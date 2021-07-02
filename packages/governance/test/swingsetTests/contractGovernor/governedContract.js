// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { sameStructure } from '@agoric/same-structure';

import { buildParamManager, ParamType } from '../../../src/paramManager';

const MALLEABLE_NUMBER = 'MalleableNumber';

/** @type {ParameterNameList} */
const governedParameterTerms = {
  contractParams: [MALLEABLE_NUMBER],
};

/** @type {ParamDescriptions} */
const governedParameterInitialValues = [
  {
    name: MALLEABLE_NUMBER,
    value: 602214090000000000000000n,
    type: ParamType.NAT,
  },
];
harden(governedParameterTerms);

/** @type {ContractStartFn} */
const start = async zcf => {
  const {
    /** @type {Instance} */ electionManager,
    /** @type {ParameterNameList} */ governedParams,
  } = zcf.getTerms();
  /** @type {ERef<GovernorPublic>} */

  assert(
    sameStructure(governedParams, governedParameterTerms),
    X`Terms must include ${MALLEABLE_NUMBER}`,
  );
  const paramManager = buildParamManager(governedParameterInitialValues);

  const getParamMgrAccessor = () =>
    Far('paramManagerAccessor', {
      get: ({ key }) => {
        assert(
          key === `contractParams`,
          X`"contractParams" is a required key: ${key}`,
        );
        return paramManager;
      },
    });

  const publicFacet = Far('public face of governed contract', {
    getState: () => paramManager.getParams(),
    getContractGovernor: () => electionManager,
  });

  /** @type {LimitedCreatorFacet} */
  const limitedCreatorFacet = Far('governedContract creator facet', {
    getContractGovernor: () => electionManager,
  });

  const creatorFacet = Far('governedContract powerful creator facet', {
    getParamMgrAccessor,
    getLimitedCreatorFacet: () => limitedCreatorFacet,
  });
  return { publicFacet, creatorFacet };
};
harden(start);
harden(MALLEABLE_NUMBER);
harden(governedParameterTerms);

export { start, governedParameterTerms, MALLEABLE_NUMBER };
