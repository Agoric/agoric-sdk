/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';

// noinspection ES6PreferShortImport
import { E } from '@agoric/eventual-send';
import { makeZoe } from '../../../src/zoeService/zoe';
import { setup } from '../setupBasicMints';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

const contractRoot = `${__dirname}/useObjExample`;

test('zoe - useObj', async t => {
  t.plan(3);
  const { moolaIssuer, moolaMint, moola } = setup();
  const zoe = makeZoe(fakeVatAdmin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
  });
  const { publicFacet } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );

  const invitation = E(publicFacet).makeInvitation();

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Pixels: moola(3) },
  });
  const alicePayments = { Pixels: aliceMoolaPayment };

  // Alice makes an offer
  const aliceSeat = await zoe.offer(invitation, aliceProposal, alicePayments);

  const useObj = await E(aliceSeat).getOfferResult();

  t.is(
    useObj.colorPixels('purple'),
    `successfully colored 3 pixels purple`,
    `use of use object works`,
  );

  aliceSeat.tryExit();

  const aliceMoolaPayoutPayment = await E(aliceSeat).getPayout('Pixels');

  t.deepEqual(
    await moolaIssuer.getAmountOf(aliceMoolaPayoutPayment),
    moola(3),
    `alice gets everything she escrowed back`,
  );

  t.throws(
    () => useObj.colorPixels('purple'),
    { message: /the escrowing offer is no longer active/ },
    `use of use object fails once offer is withdrawn or amounts are reallocated`,
  );
});
