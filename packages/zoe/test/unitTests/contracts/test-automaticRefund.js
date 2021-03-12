/* global __dirname */
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';

const automaticRefundRoot = `${__dirname}/../../../src/contracts/automaticRefund`;

test('multiple instances of automaticRefund for the same Zoe', async t => {
  t.plan(4);
  // Setup zoe and mints
  const { moolaR, simoleanR, moola, simoleans, zoe } = setup();

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(20));
  const moola10 = moola(10);
  const aliceMoolaPayments = await moolaR.issuer.splitMany(aliceMoolaPayment, [
    moola10,
    moola10,
  ]);

  // Alice creates 3 automatic refund instances
  // Pack the contract.
  const bundle = await bundleSource(automaticRefundRoot);

  const installation = await zoe.install(bundle);
  const issuerKeywordRecord = harden({
    ContributionA: moolaR.issuer,
    ContributionB: simoleanR.issuer,
  });
  const {
    creatorInvitation: aliceInvitation1,
    publicFacet: publicFacet1,
  } = await zoe.startInstance(installation, issuerKeywordRecord);

  const {
    creatorInvitation: aliceInvitation2,
    publicFacet: publicFacet2,
  } = await zoe.startInstance(installation, issuerKeywordRecord);

  const aliceProposal = harden({
    give: { ContributionA: moola(10) },
    want: { ContributionB: simoleans(7) },
  });

  const seat1 = await zoe.offer(
    aliceInvitation1,
    aliceProposal,
    harden({ ContributionA: aliceMoolaPayments[0] }),
  );

  const seat2 = await zoe.offer(
    aliceInvitation2,
    aliceProposal,
    harden({ ContributionA: aliceMoolaPayments[1] }),
  );

  const moolaPayout1 = await seat1.getPayout('ContributionA');
  const moolaPayout2 = await seat2.getPayout('ContributionA');

  // Ensure that she got what she put in for each
  t.deepEqual(
    await moolaR.issuer.getAmountOf(moolaPayout1),
    aliceProposal.give.ContributionA,
  );
  t.deepEqual(
    await moolaR.issuer.getAmountOf(moolaPayout2),
    aliceProposal.give.ContributionA,
  );

  // Ensure that the number of offers received by each instance is one
  t.is(await E(publicFacet1).getOffersCount(), 1n);
  t.is(await E(publicFacet2).getOffersCount(), 1n);
});
