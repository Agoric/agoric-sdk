// @ts-check

import { E } from '@agoric/eventual-send';
import bundleSource from '@endo/bundle-source';
import { assert } from '@agoric/assert';

import path from 'path';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/zcfTesterContract.js`;

export const setupZCFTest = async (issuerKeywordRecord, terms) => {
  /** @type {ContractFacet} */
  let zcf;
  /** @type {ContractFacet} */
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
  const installation = await E(zoe).install(bundle);
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );
  // In case a second zcf is needed
  const { creatorFacet: creatorFacet2, instance: instance2 } = await E(
    zoe,
  ).startInstance(installation, issuerKeywordRecord, terms);
  const { vatAdminState } = fakeVatAdmin;
  // @ts-ignore fix types to understand that zcf is always defined
  assert(zcf !== undefined);
  return {
    zoe,
    zcf,
    instance,
    installation,
    creatorFacet,
    vatAdminState,
    feeMintAccess,

    // Additional ZCF
    // @ts-ignore zcf2 is accessible before it is set
    zcf2,
    creatorFacet2,
    instance2,
  };
};
