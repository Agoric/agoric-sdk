// @ts-check

import '../../../exported';

/**
 * Tests ZCF
 *
 * @type {ContractStartFn}
 */
const start = zcf => {
  // make the `zcf` available to the tests
  zcf.setTestJig();
  return {};
};

harden(start);
export { start };
