// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { AmountMath, AssetKind } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/zcf/zcfTesterContract.js`;

test(`fee charged for install, startInstance, offer, getPublicFacet`, async t => {
  /** @type {ContractFacet} */
  let zcf;
  const setZCF = jig => {
    zcf = jig.zcf;
  };
  // The contract provides the `zcf` via `setTestJig` upon `start`.
  const fakeVatAdmin = makeFakeVatAdmin(setZCF);
  const zoeFeesConfig = harden({
    getPublicFacetFee: 1n,
    installFee: 2n,
    startInstanceFee: 100n,
    offerFee: 5n,
  });

  const feeIssuerConfig = {
    name: 'RUN',
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces: 6, assetKind: AssetKind.NAT },
    initialFunds: 200n,
  };

  const { zoeService, initialFeeFunds, feeCollectionPurse } = makeZoeKit(
    fakeVatAdmin.admin,
    undefined,
    feeIssuerConfig,
    zoeFeesConfig,
  );
  const feePurse = E(zoeService).makeFeePurse();
  const zoe = E(zoeService).bindDefaultFeePurse(feePurse);
  const feeIssuer = E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();

  let expectedBalance = AmountMath.make(feeBrand, feeIssuerConfig.initialFunds);

  await E(feePurse).deposit(initialFeeFunds);

  const bundle = await bundleSource(contractRoot);

  t.true(
    AmountMath.isEqual(await E(feePurse).getCurrentAmount(), expectedBalance),
  );

  const installation = await E(zoe).install(bundle);

  expectedBalance = AmountMath.subtract(
    expectedBalance,
    AmountMath.make(feeBrand, zoeFeesConfig.installFee),
  );

  t.true(
    AmountMath.isEqual(await E(feePurse).getCurrentAmount(), expectedBalance),
  );

  const { instance } = await E(zoe).startInstance(installation);

  expectedBalance = AmountMath.subtract(
    expectedBalance,
    AmountMath.make(feeBrand, zoeFeesConfig.startInstanceFee),
  );

  t.true(
    AmountMath.isEqual(await E(feePurse).getCurrentAmount(), expectedBalance),
  );

  const invitation = zcf.makeInvitation(() => {}, 'invitation');
  await E(zoe).offer(invitation);

  expectedBalance = AmountMath.subtract(
    expectedBalance,
    AmountMath.make(feeBrand, zoeFeesConfig.offerFee),
  );

  t.true(
    AmountMath.isEqual(await E(feePurse).getCurrentAmount(), expectedBalance),
  );

  await E(zoe).getPublicFacet(instance);

  expectedBalance = AmountMath.subtract(
    expectedBalance,
    AmountMath.make(feeBrand, zoeFeesConfig.getPublicFacetFee),
  );

  t.true(
    AmountMath.isEqual(await E(feePurse).getCurrentAmount(), expectedBalance),
  );

  const allFees = AmountMath.make(
    feeBrand,
    zoeFeesConfig.installFee +
      zoeFeesConfig.startInstanceFee +
      zoeFeesConfig.offerFee +
      zoeFeesConfig.getPublicFacetFee,
  );
  t.true(
    AmountMath.isEqual(await E(feeCollectionPurse).getCurrentAmount(), allFees),
  );
});
