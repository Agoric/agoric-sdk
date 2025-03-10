import { E, makeLoopback } from '@endo/captp';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import bundleSource from '@endo/bundle-source';
import { makeDurableZoeKit } from '../src/zoeService/zoe.js';
import fakeVatAdmin, { makeFakeVatAdmin } from './fakeVatAdmin.js';

/**
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
   * @returns {Promise<Installation>}
   */
  const bundleAndInstall = async pathOrExports => {
    await null;
    let id;
    let bundle;
    if (typeof pathOrExports === 'string') {
      const path = pathOrExports;
      bundle = await bundleSource(path);
      id = `b1-${path}`;
    }
    {
      assert.equal(
        Object.prototype.toString.call(pathOrExports),
        '[object Module]',
      );
      // Copy all the properties so this object can be hardened.
      const exports = { ...pathOrExports };
      bundle = harden({
        moduleFormat: 'test',
        [Symbol.for('exports')]: exports,
      });
      id = `b1-test-exports-${Math.random()}`;
    }
    assert(vatAdminState, 'installBundle called before vatAdminState defined');
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
