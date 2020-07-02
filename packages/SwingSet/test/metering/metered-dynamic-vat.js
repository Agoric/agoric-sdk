/* global harden */

import meterMe from './metered-code';

export function buildRootObject(_dynamicVatPowers) {
  return harden({
    async run() {
      meterMe([], 'no');
      return 42;
    },

    async explode(how) {
      meterMe([], how);
      return -1;
    },
  });
}
