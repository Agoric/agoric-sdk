// @ts-check

import { E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';
import { Far } from '@endo/marshal';
import { makeStore } from '@agoric/store';

import { assert } from '@agoric/assert';
import { evalContractBundle } from '../src/contractFacet/evalContractCode.js';
import { handlePKitWarning } from '../src/handleWarning.js';
import { makeHandle } from '../src/makeHandle.js';
import zcfContractBundle from '../bundles/bundle-contractFacet.js';

// this simulates a bundlecap, which is normally a swingset "device node"
/** @type {Bundlecap} */
export const zcfBundlecap = makeHandle('Bundlecap');

/**
 * @param { (...args) => unknown } [testContextSetter]
 * @param { (x: unknown) => unknown } [makeRemote]
 */
function makeFakeVatAdmin(testContextSetter = undefined, makeRemote = x => x) {
  // FakeVatPowers isn't intended to support testing of vat termination, it is
  // provided to allow unit testing of contracts that call zcf.shutdown()
  let exitMessage;
  let hasExited = false;
  let exitWithFailure;
  /** @type {Store<BundleID, Bundlecap>} */
  const idToBundlecap = makeStore('idToBundlecap');
  /** @type {Store<Bundlecap, EndoZipBase64Bundle>} */
  const bundlecapToBundle = makeStore('bundlecapToBundle');
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
    D: bundlecap => ({
      getBundle: () => bundlecapToBundle.get(bundlecap),
    }),
  };

  // This is explicitly intended to be mutable so that
  // test-only state can be provided from contracts
  // to their tests.
  const admin = Far('vatAdmin', {
    getBundlecap: bundleID => {
      if (!idToBundlecap.has(bundleID)) {
        idToBundlecap.init(bundleID, makeHandle('Bundlecap'));
      }
      return Promise.resolve(idToBundlecap.get(bundleID));
    },
    getNamedBundlecap: name => {
      assert.equal(name, 'zcf', 'fakeVatAdmin only knows ZCF');
      return Promise.resolve(zcfBundlecap);
    },
    createVat: bundlecap => {
      assert.equal(bundlecap, zcfBundlecap, 'fakeVatAdmin only knows ZCF');
      const bundle = zcfContractBundle;
      return Promise.resolve(
        harden({
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
        }),
      );
    },
  });
  const vatAdminState = {
    getExitMessage: () => exitMessage,
    getHasExited: () => hasExited,
    getExitWithFailure: () => exitWithFailure,
    installBundle: (id, bundle) => {
      if (idToBundlecap.has(id)) {
        assert.equal(
          bundle.endoZipBase64,
          bundlecapToBundle.get(idToBundlecap.get(id)).endoZipBase64,
        );
        return;
      }
      const bundlecap = makeHandle('Bundlecap');
      idToBundlecap.init(id, bundlecap);
      bundlecapToBundle.init(bundlecap, bundle);
    },
  };
  return { admin, vatAdminState };
}

// Tests which use this global/shared fakeVatAdmin should really import
// makeFakeVatAdmin() instead, and build their own private instance. This
// will be forced when #4565 requires them to use
// vatAdminState.installBundle().

const fakeVatAdmin = makeFakeVatAdmin().admin;

export default fakeVatAdmin;
export { makeFakeVatAdmin };
