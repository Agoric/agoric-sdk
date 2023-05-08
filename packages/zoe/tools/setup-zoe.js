import { makeLoopback } from '@endo/captp';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import { makeZoeKit } from '../src/zoeService/zoe.js';
import fakeVatAdmin, { makeFakeVatAdmin } from './fakeVatAdmin.js';

/**
 * @param {VatAdminSvc} [vatAdminSvc]
 */
export const makeZoeKitForTest = (vatAdminSvc = fakeVatAdmin) => {
  return makeZoeKit(
    vatAdminSvc,
    undefined,
    undefined,
    undefined,
    makeScalarBigMapStore('zoe baggage', { durable: true }),
  );
};

/**
 * @param {VatAdminSvc} [vatAdminSvc]
 */
export const makeZoeForTest = vatAdminSvc =>
  makeZoeKitForTest(vatAdminSvc).zoeService;

/**
 * Returns promises for `zoe` and the `feeMintAccess`.
 *
 * @template {object} [T=unknown]
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
    makeZoeKit(
      vatAdminSvc,
      undefined,
      feeIssuerConfig,
      undefined,
      makeScalarBigMapStore('zoe baggage', { durable: true }),
    ),
  );
  return {
    zoe: zoeService,
    feeMintAccessP: feeMintAccess,
    vatAdminSvc,
    vatAdminState,
  };
};
harden(setUpZoeForTest);
