import { E } from '@agoric/eventual-send';
import { producePromise } from '@agoric/produce-promise';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
      adminNode: {
        done: () => {
          return producePromise().promise;
        },
        terminate: () => {},
        adminData: () => ({}),
      },
    });
  },
});
