import { E, makeLoopback } from '@endo/captp';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import bundleSource from '@endo/bundle-source';
import { bundleTestExports } from '@endo/import-bundle';
import { makeDurableZoeKit } from '../src/zoeService/zoe.js';
import fakeVatAdmin, { makeFakeVatAdmin } from './fakeVatAdmin.js';

/**
 * @import {EndoZipBase64Bundle, TestBundle} from '@agoric/swingset-vat';
 * @import {FeeIssuerConfig, Installation} from '../src/types-index.js';
 */

/**
 * @param {VatAdminSvc} [vatAdminSvc]
 */
export const makeZoeKitForTest = (vatAdminSvc = fakeVatAdmin) => {
  return makeDurableZoeKit({
    vatAdminSvc,
    zoeBaggage: makeScalarBigMapStore('zoe baggage', { durable: true }),
  });
};

/**
 * @param {VatAdminSvc} [vatAdminSvc]
 */
export const makeZoeForTest = vatAdminSvc =>
  makeZoeKitForTest(vatAdminSvc).zoeService;

/**
 * Returns promises for `zoe` and the `feeMintAccess`.
 * Provide testing versions of capabilities for Zoe contracts.
 *
 * @template {object} [T=any]
 * @param {object} options
 * @param {(jig: T) => void} [options.setJig]
 * @param {FeeIssuerConfig} [options.feeIssuerConfig]
 * @param {VatAdminSvc} [options.vatAdminSvc]
 * @param {boolean} [options.useNearRemote]
 */
export const setUpZoeForTest = async ({
  setJig = () => {},
  feeIssuerConfig,
  vatAdminSvc,
  useNearRemote = false,
} = {}) => {
  const { makeFar, makeNear } = makeLoopback('zoeTest');

  /** @type {ReturnType<typeof makeFakeVatAdmin>['vatAdminState'] | undefined} */
  let vatAdminState;
  if (!vatAdminSvc) {
    ({ admin: vatAdminSvc, vatAdminState } = makeFakeVatAdmin(
      setJig,
      useNearRemote ? makeNear : undefined,
    ));
  }
  const { zoeService, feeMintAccess } = await makeFar(
    makeDurableZoeKit({
      vatAdminSvc,
      feeIssuerConfig,
      zoeBaggage: makeScalarBigMapStore('zoe baggage', { durable: true }),
    }),
  );

  /**
   * @param {object} pathOrExports
   * @returns {Promise<EndoZipBase64Bundle | TestBundle>}
   */
  const bundleModule = async pathOrExports => {
    if (typeof pathOrExports === 'string') {
      const path = pathOrExports;
      return bundleSource(path);
    } else {
      assert.equal(
        Object.getOwnPropertyDescriptor(pathOrExports, Symbol.toStringTag)
          ?.value,
        'Module',
      );
      // Copy all the properties so this object can be hardened.
      const exports = { ...pathOrExports };
      return /** @type TestBundle */ (bundleTestExports(exports));
    }
  };

  /**
   * Bundle the source module (either as file system path or a Module object)
   * and return an Installation. The bundleID is random and should not be relied
   * upon in tests of this variety.
   *
   * @param {object} pathOrExports
   * @returns {Promise<Installation>}
   */
  const bundleAndInstall = async pathOrExports => {
    const bundle = await bundleModule(pathOrExports);
    assert(
      vatAdminState,
      'bundleAndInstall called before vatAdminState defined',
    );
    const id = `b1-zoe-test-${Math.random()}`;
    vatAdminState.installBundle(id, bundle);
    return E(zoeService).installBundleID(id);
  };

  return {
    zoe: zoeService,
    feeMintAccessP: feeMintAccess,
    bundleAndInstall,
    vatAdminSvc,
    vatAdminState,
  };
};
harden(setUpZoeForTest);
