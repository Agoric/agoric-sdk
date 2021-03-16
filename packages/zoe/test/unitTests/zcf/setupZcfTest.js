/* global __dirname */
// @ts-check

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import { assert } from '@agoric/assert';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { makeFakeVatAdmin } from '../../../src/contractFacet/fakeVatAdmin';

const contractRoot = `${__dirname}/zcfTesterContract`;

export const setupZCFTest = async (issuerKeywordRecord, terms) => {
  /** @type {ContractFacet} */
  let zcf;
  const setZCF = jig => {
    zcf = jig.zcf;
  };
  // The contract provides the `zcf` via `setTestJig` upon `start`.
  const fakeVatAdmin = makeFakeVatAdmin(setZCF);
  const zoe = makeZoe(fakeVatAdmin.admin);
  const bundle = await bundleSource(contractRoot);
  const installation = await E(zoe).install(bundle);
  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    terms,
  );
  const { vatAdminState } = fakeVatAdmin;
  // @ts-ignore fix types to understand that zcf is always defined
  assert(zcf !== undefined);
  return { zoe, zcf, instance, installation, creatorFacet, vatAdminState };
};
