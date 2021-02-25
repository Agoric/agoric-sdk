import { assert } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@agoric/marshal';
import { meterMe } from './metered-code';

export function buildRootObject(_dynamicVatPowers) {
  let grandchildNS;

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

    async load(bundle) {
      const require = harden(() => 0);
      grandchildNS = await importBundle(bundle, {
        endowments: { console, assert, require },
      });
    },

    async meterThem(explode) {
      grandchildNS.meterThem(explode);
    },
  });
}
