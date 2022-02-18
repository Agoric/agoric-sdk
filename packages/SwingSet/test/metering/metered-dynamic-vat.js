import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';
import { meterMe } from './metered-code.js';

export const buildRootObject = _dynamicVatPowers =>
  Far('root', {
    never: () => makePromiseKit().promise,

    run: async () => {
      meterMe([], 'no');
      return 42;
    },

    explode: async how => {
      meterMe([], how);
      return -1;
    },
  });
