// @ts-check

import '../../../exported';

/**
 * Tests ZCF
 * @type {ContractStartFn}
 */
const start = zcf => {
  return { creatorFacet: zcf };
};

harden(start);
export { start };
