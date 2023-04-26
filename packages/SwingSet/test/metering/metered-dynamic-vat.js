import { makePromiseKit } from '@endo/promise-kit';
import { Far } from '@endo/far';
import { meterMe } from './metered-code.js';

export function buildRootObject(_dynamicVatPowers) {
  return Far('root', {
    never() {
      return makePromiseKit().promise;
    },

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
