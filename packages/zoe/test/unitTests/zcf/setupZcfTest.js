// @ts-check

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
 * @template {object} [T2=object] terms2
 * @param {IssuerKeywordRecord} [issuerKeywordRecord]
 * @param {T} [terms]
 * @param {T2} [terms2] terms for zcf2
 */
export const setupZCFTest = async (issuerKeywordRecord, terms, terms2) => {
  /** @type {ZCF<T>} */
  let zcf;
  /** @type {ZCF<T2>} */
  let zcf2;

  // We would like to start two contract instances in order to get two
  // different `zcfs`. However, we only pass in one `setTestJig`, so
  // here, we set the first `zcf` if it has not been set before, and
  // if it has, we set the second `zcf`.
  const setZCF = jig => {
    if (zcf === undefined) {
      zcf = jig.zcf;
    } else {
      zcf2 = jig.zcf;
    }
  };
  // The contract provides the `zcf` via `setTestJig` upon `start`.
  const fakeVatAdmin = makeFakeVatAdmin(setZCF);
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin.admin);
  const bundle = await bundleSource(contractRoot);
  fakeVatAdmin.vatAdminState.installBundle('b1-contract', bundle);
  const installation = await E(zoe).installBundleID('b1-contract');
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    // @ts-expect-error generics mismatch
    terms,
  );
  // In case a second zcf is needed
  const { creatorFacet: creatorFacet2, instance: instance2 } = await E(
    zoe,
  ).startInstance(installation, issuerKeywordRecord, terms2);
  const { vatAdminState } = fakeVatAdmin;
  // @ts-expect-error setZCF may not have been called yet
  assert(zcf, 'zcf is required; did you forget to setZCF?');
  return {
    zoe,
    zcf,
    instance,
    installation,
    creatorFacet,
    vatAdminState,
    feeMintAccess,

    // Additional ZCF
    // @ts-expect-error zcf2 is accessible before it is set
    zcf2,
    creatorFacet2,
    instance2,
  };
};
