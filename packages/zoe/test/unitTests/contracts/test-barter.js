// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

// noinspection ES6PreferShortImport
import { setup } from '../setupBasicMints';

const barter = `${__dirname}/../../../src/contracts/barterExchange`;

test('barter with valid offers', async t => {
  t.plan(10);
  const {
    moolaIssuer,
    simoleanIssuer,
    moolaMint,
    simoleanMint,
    amountMaths,
    moola,
    simoleans,
    zoe,
  } = setup();
  const inviteIssuer = zoe.getInvitationIssuer();

  // Pack the contract.
  const bundle = await bundleSource(barter);

  const installation = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Simon creates a barter instance and spreads the instance far and
  // wide with instructions on how to use it.
  const { creatorFacet } = await zoe.makeInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const publicFacet = await E(creatorFacet).getPublicFacet();
  const getInviteValue = iP =>
    E(inviteIssuer)
      .getAmountOf(iP)
      .then(amount => amount.value[0]);
  const simonInvite = await E(publicFacet).makeInvite();
  const { instance } = await getInviteValue(simonInvite);

  const aliceInvite = await E(E(zoe).getPublicFacet(instance)).makeInvite();

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
    aliceInvite,
    aliceSellOrderProposal,
    alicePayments,
  );

  aliceSeat.getOfferResult().then(
    result => t.equals(result, 'Trade completed.'),
    e => t.fail(`expecting Alice's offer to have been accepted ${e}`),
  );

  const bobInvite = await E(E(zoe).getPublicFacet(instance)).makeInvite();
  const {
    installation: bobInstallation,
    instance: bobInstance,
  } = await getInviteValue(bobInvite);

  // 4: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

  t.equals(bobInstallation, installation);
  t.equals(bobInstance, instance);

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
    bobExclusiveInvite,
    bobBuyOrderProposal,
    bobPayments,
  );

  const {
    In: bobSimoleanPayout,
    Out: bobMoolaPayout,
  } = await bobSeat.getPayouts();

  bobSeat.getOfferResult().then(
    result => t.equals(result, 'Trade completed.'),
    e => t.fail(`expecting Bob's offer to have been accepted ${e}`),
  );

  const {
    In: aliceMoolaPayout,
    Out: aliceSimoleanPayout,
  } = await aliceSeat.getPayouts();

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

  // 6: Alice deposits her payout to ensure she can
  // Alice had 3 moola and 0 simoleans.
  aliceMoolaPayout.then(payment => {
    aliceMoolaPurse.deposit(payment);
    t.equals(aliceMoolaPurse.getCurrentAmount().value, 0);
  });
  aliceSimoleanPayout.then(payment => {
    aliceSimoleanPurse.deposit(payment);
    t.equals(aliceSimoleanPurse.getCurrentAmount().value, 4);
  });

  // 7: Bob deposits his original payments to ensure he can
  // Bob had 0 moola and 7 simoleans.
  bobMoolaPayout.then(payment => {
    bobMoolaPurse.deposit(payment);
    t.equals(bobMoolaPurse.getCurrentAmount().value, 3);
  });
  bobSimoleanPayout.then(payment => {
    bobSimoleanPurse.deposit(payment);
    t.equals(bobSimoleanPurse.getCurrentAmount().value, 3);
  });
});
