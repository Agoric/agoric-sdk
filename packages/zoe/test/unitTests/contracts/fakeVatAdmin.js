import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

export const testContext = {};

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(testContext),
      adminNode: {
        done: () => {
          const kit = makePromiseKit();
          // Don't trigger Node.js's UnhandledPromiseRejectionWarning
          kit.promise.catch(_ => {});
          return kit.promise;
        },
        terminate: () => {},
        adminData: () => ({}),
      },
    });
  },
  createVatByName: _name => {
    throw Error(`createVatByName not supported in fake mode`);
  },
});
