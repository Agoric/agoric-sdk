// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { assert, details as X } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

import { buildParamManager, ParamType } from '../../../src/paramManager';

const MALLEABLE_NUMBER = 'MalleableNumber';

export const governedParameterTerms = {
  contractParams: [MALLEABLE_NUMBER],
};

/** @type {ContractStartFn} */
const start = async zcf => {
  const {
    /** @type {Instance} */ electionManager,
    /** @type {ParamDescriptions} */ governedParams,
  } = zcf.getTerms();
  /** @type {ERef<GovernorPublic>} */
  const governorPublic = E(zcf.getZoeService()).getPublicFacet(electionManager);
  const paramDesc = [
    {
      name: MALLEABLE_NUMBER,
      value: 602214090000000000000000n,
      type: ParamType.NAT,
    },
  ];
  const paramManager = buildParamManager(paramDesc);

  assert(
    sameStructure(governedParams, harden(governedParameterTerms)),
    X`Terms must include ${MALLEABLE_NUMBER}`,
  );

  // There's only one paramManager, so just return it.
  const getParamMgrAccessor = () =>
    Far('paramManagerAccessor', {
      get: () => paramManager,
    });

  const publicFacet = Far('public face of governed contract', {
    getState: () => paramManager.getParams().MalleableNumber,
    getContractGovernor: () => governorPublic,
  });

  const creatorFacet = Far('creator facet of governed contract', {
    getContractGovernor: () => electionManager,
    getParamMgrAccessor,
  });
  return { publicFacet, creatorFacet };
};
harden(start);
export { start };
