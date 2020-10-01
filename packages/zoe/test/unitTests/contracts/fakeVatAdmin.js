import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import { evalContractBundle } from '../../../src/contractFacet/evalContractCode';

function makeFakeVatAdmin(testContextSetter = undefined, makeRemote = x => x) {
  // FakeVatPowers isn't intended to support testing of vat termination, it is
  // provided to allow unit testing of contracts that call zcf.shutdown()
  let exitMessage;
  let exitWithFailure = false;
  const fakeVatPowers = {
    exitVat: completion => {
      exitMessage = completion;
      exitWithFailure = false;
    },
    exitVatWithFailure: reason => {
      exitMessage = reason;
      exitWithFailure = true;
    },
  };

  // This is explicitly intended to be mutable so that
  // test-only state can be provided from contracts
  // to their tests.
  const admin = harden({
    createVat: bundle => {
      return harden({
        root: makeRemote(
          E(evalContractBundle(bundle)).buildRootObject(
            fakeVatPowers,
            undefined,
            testContextSetter,
          ),
        ),
        adminNode: {
          done: () => {
            const kit = makePromiseKit();
            // Don't trigger Node.js's UnhandledPromiseRejectionWarning
            kit.promise.catch(_ => {});
            return kit.promise;
          },
          terminateWithFailure: () => {},
          adminData: () => {},
        },
      });
    },
    createVatByName: _name => {
      throw Error(`createVatByName not supported in fake mode`);
    },
  });
  const vatAdminState = {
    getExitMessage: () => exitMessage,
    getHasExited: () => exitWithFailure,
  };
  return { admin, vatAdminState };
}

const fakeVatAdmin = makeFakeVatAdmin().admin;

export default fakeVatAdmin;
export { makeFakeVatAdmin };
