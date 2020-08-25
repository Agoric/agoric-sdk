import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

export default harden({
  createVat: bundle => {
    return harden({
      root: E(evalContractBundle(bundle)).buildRootObject(),
      adminNode: {
        done: () => {
          const kit = makePromiseKit();
          kit.promise.catch(err => console.log(err));
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
