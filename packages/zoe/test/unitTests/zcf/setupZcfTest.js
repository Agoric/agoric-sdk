// @ts-check

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import { assert } from '@agoric/assert';

import path from 'path';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/zcfTesterContract.js`;

export const setupZCFTest = async (issuerKeywordRecord, terms) => {
  /** @type {ContractFacet} */
  let zcf;
  const setZCF = jig => {
    zcf = jig.zcf;
  };
  // The contract provides the `zcf` via `setTestJig` upon `start`.
  const fakeVatAdmin = makeFakeVatAdmin(setZCF);
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin.admin);
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
