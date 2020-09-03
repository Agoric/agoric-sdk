// @ts-check

import '../../../exported';

/**
 * Tests ZCF
 * @type {ContractStartFn}
 */
const start = zcf => {
  zcf.setTestJig(() => ({ zcf }));
  return { };
};

harden(start);
export { start };
