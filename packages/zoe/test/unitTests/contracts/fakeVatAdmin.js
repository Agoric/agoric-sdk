import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

function makeFakeVatAdmin(testContext = undefined, makeFar = x => x) {
  // This is explicitly intended to be mutable so that 
  // test-only state can be provided from contracts
  // to their tests.
  const admin = harden({
    createVat: bundle => {
      return harden({
        root: makeFar(E(evalContractBundle(bundle)).buildRootObject(testContext)),
        adminNode: {
          done: () => {
            const kit = makePromiseKit();
            // Don't trigger Node.js's UnhandledPromiseRejectionWarning
            kit.promise.catch(_ => { });
            return kit.promise;
          },
          terminate: () => { },
          adminData: () => ({}),
        },
      });
    },
    createVatByName: _name => {
      throw Error(`createVatByName not supported in fake mode`);
    },
  });
  return admin;
}

const fakeVatAdmin = makeFakeVatAdmin();

export default fakeVatAdmin;
export { makeFakeVatAdmin };