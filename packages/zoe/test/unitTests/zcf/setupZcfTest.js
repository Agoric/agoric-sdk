import { E } from '@endo/eventual-send';
import bundleSource from '@endo/bundle-source';
import { assert } from '@agoric/assert';

import path from 'path';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/zcfTesterContract.js`;

/**
 * Test setup utility
 *
 * @template {object} [T=object] terms
 * @param {IssuerKeywordRecord} [issuerKeywordRecord]
 * @param {T} [terms]
 */
export const setupZCFTest = async (issuerKeywordRecord, terms) => {
  /** @type {ZCF<T>} */
  let zcf;

  const setZCF = jig => (zcf = jig.zcf);
  // The contract provides the `zcf` via `setTestJig` upon `start`.
  const fakeVatAdmin = makeFakeVatAdmin(setZCF);
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin.admin);
  const bundle = await bundleSource(contractRoot);
  fakeVatAdmin.vatAdminState.installBundle('b1-contract', bundle);
  const installation = await E(zoe).installBundleID('b1-contract');
  const startInstanceResult = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    // @ts-expect-error TS is confused between <T> above and Omit<> in utils.d.ts
    terms,
  );
  const { vatAdminState } = fakeVatAdmin;
  // @ts-expect-error setZCF may not have been called yet
  assert(zcf, 'zcf is required; did you forget to setZCF?');
  return {
    zoe,
    zcf,
    instance: startInstanceResult.instance,
    installation,
    creatorFacet: startInstanceResult.creatorFacet,
    vatAdminState,
    feeMintAccess,
    startInstanceResult,
  };
};
