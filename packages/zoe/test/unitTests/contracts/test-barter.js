/* global harden */

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { makeGetInstanceHandle } from '../../../src/clientSupport';

const barter = `${__dirname}/../../../src/contracts/barterExchange`;

test('barter with valid offers', async t => {
  t.plan(9);
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    amountMaths,
    moola,
    simoleans,
  } = setup();
  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  // Pack the contract.
  const bundle = await bundleSource(barter);

  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Simon creates a barter instance and spreads the invite far and
  // wide with instructions on how to use it.
  const { invite: simonInvite } = await zoe.makeInstance(installationHandle, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const instanceHandle = await getInstanceHandle(simonInvite);
  const { publicAPI } = zoe.getInstanceRecord(instanceHandle);

  const aliceInvite = publicAPI.makeInvite();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSellOrderProposal = harden({
    give: { In: moola(3) },
    want: { Out: simoleans(4) },
    exit: { onDemand: null },
  });
  const alicePayments = { In: aliceMoolaPayment };
  // 4: Alice adds her sell order to the exchange
  const { payout: alicePayoutP, outcome: aliceOutcomeP } = await zoe.offer(
    aliceInvite,
    aliceSellOrderProposal,
    alicePayments,
  );

  const bobInvite = publicAPI.makeInvite();

  // 5: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

  const { installationHandle: bobInstallationId } = zoe.getInstanceRecord(
    instanceHandle,
  );

  t.equals(bobInstallationId, installationHandle);

  // Bob creates a buy order, saying that he wants exactly 3 moola,
  // and is willing to pay up to 7 simoleans.
  const bobBuyOrderProposal = harden({
    give: { In: simoleans(7) },
    want: { Out: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { In: bobSimoleanPayment };

  // 6: Bob escrows with zoe
  // 8: Bob submits the buy order to the exchange
  const { payout: bobPayoutP, outcome: bobOutcomeP } = await zoe.offer(
    bobExclusiveInvite,
    bobBuyOrderProposal,
    bobPayments,
  );

  t.equals(
    await bobOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  t.equals(
    await aliceOutcomeP,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobMoolaPayout = await bobPayout.Out;
  const bobSimoleanPayout = await bobPayout.In;
  const aliceMoolaPayout = await alicePayout.In;
  const aliceSimoleanPayout = await alicePayout.Out;

  // Alice gets paid at least what she wanted
  t.ok(
    amountMaths
      .get('simoleans')
      .isGTE(
        await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
        aliceSellOrderProposal.want.Out,
      ),
  );

  // Alice sold all of her moola
  t.deepEquals(await moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0));

  // 13: Alice deposits her payout to ensure she can
  await aliceMoolaPurse.deposit(aliceMoolaPayout);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

  // 14: Bob deposits his original payments to ensure he can
  await bobMoolaPurse.deposit(bobMoolaPayout);
  await bobSimoleanPurse.deposit(bobSimoleanPayout);

  // Assert that the correct payout were received.
  // Alice had 3 moola and 0 simoleans.
  // Bob had 0 moola and 7 simoleans.
  t.equals(aliceMoolaPurse.getCurrentAmount().value, 0);
  t.equals(aliceSimoleanPurse.getCurrentAmount().value, 4);
  t.equals(bobMoolaPurse.getCurrentAmount().value, 3);
  t.equals(bobSimoleanPurse.getCurrentAmount().value, 3);
});
