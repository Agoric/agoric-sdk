import harden from '@agoric/harden';
import meterMe from './metered-code';

export default function buildRoot(_dynamicVatPowers) {
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
