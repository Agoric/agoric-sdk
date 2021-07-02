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

/* @type {ContractStartFn} */
const start = async zcf => {
  const { electionManager, governedParams } = zcf.getTerms();
  const governorPublic = E(zcf.getZoeService()).getPublicFacet(electionManager);
  const paramManager = buildParamManager([
    {
      name: MALLEABLE_NUMBER,
      value: 602214090000000000000000n,
      type: ParamType.NAT,
    },
  ]);
  assert(
    sameStructure(governedParams, harden(governedParameterTerms)),
    X`Terms must include ${MALLEABLE_NUMBER}`,
  );

  const gCreator = await E(governorPublic).governContract(
    zcf.getInstance(),
    paramManager,
    'contractParams',
  );

  const publicFacet = Far('public face of governed contract', {
    getState: () => paramManager.getParams().MalleableNumber,
    getContractGovernor: () => governorPublic,
  });

  const creatorFacet = Far('creator facet of governed contract', {
    getContractGovernor: () => gCreator,
  });
  return { publicFacet, creatorFacet };
};
harden(start);
export { start };
