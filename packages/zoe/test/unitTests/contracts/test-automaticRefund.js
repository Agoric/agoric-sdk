/* global __dirname */
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoeService/zoe';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('multiple instances of automaticRefund for the same Zoe', async t => {
  t.plan(4);
  // Setup zoe
  const zoe = makeZoe(fakeVatAdmin);

  // Alice creates 3 automatic refund instances
  // Pack the contract.
  const bundle = await bundleSource(automaticRefundRoot);

  const installation = await E(zoe).install(bundle);

  const {
    creatorInvitation: aliceInvitation1,
    publicFacet: publicFacet1,
  } = await E(zoe).startInstance(installation);

  const {
    creatorInvitation: aliceInvitation2,
    publicFacet: publicFacet2,
  } = await E(zoe).startInstance(installation);

  const seat1 = await E(zoe).offer(aliceInvitation1);

  const seat2 = await E(zoe).offer(aliceInvitation2);

  const offerResult1 = await E(seat1).getOfferResult();
  const offerResult2 = await E(seat2).getOfferResult();

  t.is(offerResult1, 'The offer was accepted');
  t.is(offerResult2, 'The offer was accepted');

  // Ensure that the number of offers received by each instance is one
  t.is(await E(publicFacet1).getOffersCount(), 1n);
  t.is(await E(publicFacet2).getOffersCount(), 1n);
});
