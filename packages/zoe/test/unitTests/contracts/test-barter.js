/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import { amountMath } from '@agoric/ertp';

import { setup } from '../setupBasicMints';
import { installationPFromSource } from '../installFromSource';
import { assertPayoutAmount, assertOfferResult } from '../../zoeTestHelpers';

const barter = `${__dirname}/../../../src/contracts/barterExchange`;

test('barter with valid offers', async t => {
  t.plan(10);
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    moola,
    simoleans,
    zoe,
  } = setup();
  const invitationIssuer = zoe.getInvitationIssuer();
  const installation = await installationPFromSource(zoe, barter);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));

  // 1: Simon creates a barter instance and spreads the instance far and
  // wide with instructions on how to use it.
  const { instance } = await zoe.startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  const aliceInvitation = await E(
    E(zoe).getPublicFacet(instance),
  ).makeInvitation();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSellOrderProposal = harden({
    give: { In: moola(3) },
    want: { Out: simoleans(4) },
    exit: { onDemand: null },
  });
  const alicePayments = { In: aliceMoolaPayment };
  // 3: Alice adds her sell order to the exchange
  const aliceSeat = await zoe.offer(
    aliceInvitation,
    aliceSellOrderProposal,
    alicePayments,
  );

  assertOfferResult(t, aliceSeat, 'Trade completed.');

  const bobInvitation = await E(
    E(zoe).getPublicFacet(instance),
  ).makeInvitation();
  const bobInstance = await E(zoe).getInstance(bobInvitation);
  const bobInstallation = await E(zoe).getInstallation(bobInvitation);

  // 4: Bob decides to join.
  const bobExclusiveInvitation = await invitationIssuer.claim(bobInvitation);

  t.is(bobInstallation, installation);
  t.is(bobInstance, instance);

  // Bob creates a buy order, saying that he wants exactly 3 moola,
  // and is willing to pay up to 7 simoleans.
  const bobBuyOrderProposal = harden({
    give: { In: simoleans(7) },
    want: { Out: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { In: bobSimoleanPayment };

  // 5: Bob escrows with zoe
  const bobSeat = await zoe.offer(
    bobExclusiveInvitation,
    bobBuyOrderProposal,
    bobPayments,
  );

  const {
    In: bobSimoleanPayout,
    Out: bobMoolaPayout,
  } = await bobSeat.getPayouts();

  assertOfferResult(t, bobSeat, 'Trade completed.');

  const {
    In: aliceMoolaPayout,
    Out: aliceSimoleanPayout,
  } = await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    amountMath.isGTE(
      await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
      aliceSellOrderProposal.want.Out,
    ),
  );

  // Alice sold all of her moola
  t.deepEqual(await moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0n));

  await Promise.all([
    // Alice had 0 moola and 4 simoleans.
    assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(0n)),
    assertPayoutAmount(t, simoleanIssuer, aliceSimoleanPayout, simoleans(4)),

    // Bob had 3 moola and 3 simoleans.
    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout, moola(3)),
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout, simoleans(3)),
  ]);
});
