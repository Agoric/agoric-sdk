/* global harden */

import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const contractRoot = `${__dirname}/../../../src/contracts/useObj`;

test.only('zoe - useObj', async t => {
  t.plan(3);
  const { moolaIssuer, moolaMint, moola } = setup();
  const zoe = makeZoe();

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Pixels: moolaIssuer,
  });
  const { invite: aliceInvite } = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );

  // Alice escrows with zoe
  const aliceProposal = harden({
    give: { Pixels: moola(3) },
  });
  const alicePayments = { Pixels: aliceMoolaPayment };

  // Alice makes the first offer in the swap.
  const {
    payout: alicePayoutP,
    outcome: useObjP,
    completeObj,
  } = await zoe.offer(aliceInvite, aliceProposal, alicePayments);

  const useObj = await useObjP;

  t.equals(
    useObj.colorPixels('purple'),
    `successfully colored 3 pixels purple`,
    `use of use object works`,
  );

  completeObj.complete();

  const alicePayout = await alicePayoutP;

  const aliceMoolaPayoutPayment = await alicePayout.Pixels;

  t.deepEquals(
    await moolaIssuer.getAmountOf(aliceMoolaPayoutPayment),
    moola(3),
    `alice gets everything she escrowed back`,
  );

  console.log('EXPECTED ERROR ->>>');
  t.throws(
    () => useObj.colorPixels('purple'),
    /the escrowing offer is no longer active/,
    `use of use object fails once offer is withdrawn or amounts are reallocated`,
  );
});
