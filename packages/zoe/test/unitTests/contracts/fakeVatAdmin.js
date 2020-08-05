import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
      adminNode: {
        done: () => {
          return makePromiseKit().promise;
        },
        terminate: () => {},
        adminData: () => ({}),
      },
    });
  },
});
