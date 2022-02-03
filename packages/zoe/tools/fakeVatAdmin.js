// @ts-check

import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';

import { assert, details as X } from '@agoric/assert';
import { evalContractBundle } from '../src/contractFacet/evalContractCode.js';
import { handlePKitWarning } from '../src/handleWarning.js';

function makeFakeVatAdmin(testContextSetter, makeRemote = x => x) {
  // FakeVatPowers isn't intended to support testing of vat termination, it is
  // provided to allow unit testing of contracts that call zcf.shutdown()
  let exitMessage;
  let hasExited = false;
  let exitWithFailure;
  const fakeVatPowers = {
    exitVat: completion => {
      exitMessage = completion;
      hasExited = true;
      exitWithFailure = false;
    },
    exitVatWithFailure: reason => {
      exitMessage = reason;
      hasExited = true;
      exitWithFailure = true;
    },
  };

  // This is explicitly intended to be mutable so that
  // test-only state can be provided from contracts
  // to their tests.
  const admin = Far('vatAdmin', {
    createVat: bundle => {
      return harden({
        root: makeRemote(
          E(evalContractBundle(bundle)).buildRootObject(
            fakeVatPowers,
            undefined,
            testContextSetter,
          ),
        ),
        adminNode: Far('adminNode', {
          done: () => {
            const kit = makePromiseKit();
            handlePKitWarning(kit);
            return kit.promise;
          },
          terminateWithFailure: () => {},
        }),
      });
    },
    createVatByName: _name => {
      assert.fail(X`createVatByName not supported in fake mode`);
    },
  });
  const vatAdminState = {
    getExitMessage: () => exitMessage,
    getHasExited: () => hasExited,
    getExitWithFailure: () => exitWithFailure,
  };
  return { admin, vatAdminState };
}

const fakeVatAdmin = makeFakeVatAdmin().admin;

export default fakeVatAdmin;
export { makeFakeVatAdmin };
