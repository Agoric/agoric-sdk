import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@endo/eventual-send';
import { AmountMath } from '@agoric/ertp';
import { claim } from '@agoric/ertp/src/legacy-payment-helpers.js';

import { setup } from '../setupBasicMints.js';
import { installationPFromSource } from '../installFromSource.js';
import { assertPayoutAmount, assertOfferResult } from '../../zoeTestHelpers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const barter = `${dirname}/../../../src/contracts/barterExchange.js`;

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
    vatAdminState,
  } = setup();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    barter,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3n));

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7n));

  // 1: Simon creates a barter instance and spreads the instance far and
  // wide with instructions on how to use it.
  const { instance } = await E(zoe).startInstance(installation, {
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
    give: { In: moola(3n) },
    want: { Out: simoleans(4n) },
    exit: { onDemand: null },
  });
  const alicePayments = { In: aliceMoolaPayment };
  // 3: Alice adds her sell order to the exchange
  const aliceSeat = await E(zoe).offer(
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
  const bobExclusiveInvitation = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    bobInvitation,
  );

  t.is(bobInstallation, installation);
  t.is(bobInstance, instance);

  // Bob creates a buy order, saying that he wants exactly 3 moola,
  // and is willing to pay up to 7 simoleans.
  const bobBuyOrderProposal = harden({
    give: { In: simoleans(7n) },
    want: { Out: moola(3n) },
    exit: { onDemand: null },
  });
  const bobPayments = { In: bobSimoleanPayment };

  // 5: Bob escrows with zoe
  const bobSeat = await E(zoe).offer(
    bobExclusiveInvitation,
    bobBuyOrderProposal,
    bobPayments,
  );

  const { In: bobSimoleanPayout, Out: bobMoolaPayout } =
    await bobSeat.getPayouts();

  assertOfferResult(t, bobSeat, 'Trade completed.');

  const { In: aliceMoolaPayout, Out: aliceSimoleanPayout } =
    await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    AmountMath.isGTE(
      await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
      aliceSellOrderProposal.want.Out,
    ),
  );

  // Alice sold all of her moola
  t.deepEqual(await moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0n));

  await Promise.all([
    // Alice had 0 moola and 4 simoleans.
    await assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(0n)),
    await assertPayoutAmount(
      t,
      simoleanIssuer,
      aliceSimoleanPayout,
      simoleans(4n),
    ),

    // Bob had 3 moola and 3 simoleans.
    await assertPayoutAmount(t, moolaIssuer, bobMoolaPayout, moola(3n)),
    await assertPayoutAmount(
      t,
      simoleanIssuer,
      bobSimoleanPayout,
      simoleans(3n),
    ),
  ]);
});
