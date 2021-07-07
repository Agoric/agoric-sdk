// @ts-check

import { Far } from '@agoric/marshal';
import { assert, details as X } from '@agoric/assert';
import { sameStructure } from '@agoric/same-structure';

import { buildParamManager, ParamType } from '../../../src/paramManager';

const MALLEABLE_NUMBER = 'MalleableNumber';

const governedParameterTerms = harden([MALLEABLE_NUMBER]);

/** @type {ContractStartFn} */
const start = async zcf => {
  /** @type {{ governor: Instance, governedParams: Array<string> }} */
  const { governor, governedParams } = zcf.getTerms();

  assert(
    sameStructure(governedParams, governedParameterTerms),
    X`governedParams must be ${governedParameterTerms}`,
  );

  const paramManager = buildParamManager([
    {
      name: MALLEABLE_NUMBER,
      value: 602214090000000000000000n, // initial value
      type: ParamType.NAT,
    },
  ]);

  const publicFacet = Far('public face of governed contract', {
    getParams: paramManager.getParams,
    getGovernor: () => governor,
    addOne: () =>
      /** @type {NatValue} */ (paramManager.getParams()[MALLEABLE_NUMBER]
        .value) + 1n,
  });

  const creatorFacet = Far('creator facet of governed contract', {
    getParamManager: () => paramManager,
  });
  return { publicFacet, creatorFacet };
};
harden(start);
export { start };
