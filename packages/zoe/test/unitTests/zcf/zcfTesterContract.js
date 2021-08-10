// @ts-check

import '../../../exported.js';

/**
 * Tests ZCF
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  // make the `zcf` and `instance` available to the tests
  const instance = zcf.getInstance();
  zcf.setTestJig(() => harden({ instance }));

  return {};
};

harden(start);
export { start };
