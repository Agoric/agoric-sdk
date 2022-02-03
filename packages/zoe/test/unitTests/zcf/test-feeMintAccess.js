// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@endo/bundle-source';

import { makeZoeKit } from '../../../src/zoeService/zoe.js';
import fakeVatAdmin from '../../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const contractRoot = `${dirname}/registerFeeMintContract.js`;

test(`feeMintAccess`, async t => {
  const { zoeService: zoe, feeMintAccess } = makeZoeKit(fakeVatAdmin);
  const bundle = await bundleSource(contractRoot);
  const installation = await E(zoe).install(bundle);
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
