import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';

import bundleSource from '@endo/bundle-source';

import { makeZoeKitForTest } from '../../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../../tools/fakeVatAdmin.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractRoot = `${dirname}/registerFeeMintContract.js`;

test(`feeMintAccess`, async t => {
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest(fakeVatAdmin);
  const bundle = await bundleSource(contractRoot);
  vatAdminState.installBundle('b1-registerfee', bundle);
  const installation = await E(zoe).installBundleID('b1-registerfee');
  const { creatorFacet } = await E(zoe).startInstance(
    installation,
    undefined,
    undefined,
    harden({ feeMintAccess }),
  );
  const mintedAmount = await E(creatorFacet).getMintedAmount();
  const feeIssuer = E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();
  t.true(AmountMath.isEqual(mintedAmount, AmountMath.make(feeBrand, 10n)));

  const mintedPayment = await E(creatorFacet).getMintedPayout();
  const mintedAmount2 = await E(feeIssuer).getAmountOf(mintedPayment);

  t.true(AmountMath.isEqual(mintedAmount2, AmountMath.make(feeBrand, 10n)));
});
