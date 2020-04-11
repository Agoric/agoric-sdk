// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { assert, details } from '@agoric/assert';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';
import {
  makeGetOfferHandle,
  makeGetInstanceHandle,
} from '../../../src/clientSupport';

const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

test('simpleExchange with valid offers', async t => {
  t.plan(9);
  const { issuers, mints, amountMaths, moola, simoleans } = setup();
  const [moolaIssuer, simoleanIssuer] = issuers;
  const [moolaMint, simoleanMint] = mints;
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(simpleExchange);

  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const simonInvite = await zoe.makeInstance(installationHandle, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const instanceHandle = await getInstanceHandle(simonInvite);
  const { publicAPI } = zoe.getInstance(instanceHandle);

  const aliceInvite = publicAPI.makeInvite();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSellOrderProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(4) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceMoolaPayment };
  const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
    aliceInvite,
    aliceSellOrderProposal,
    alicePayments,
  );

  // 4: Alice adds her sell order to the exchange
  const aliceOfferResult = await aliceSeat.addOrder();
  const bobInvite = publicAPI.makeInvite();

  // 5: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstance(instanceHandle);

  t.equals(bobInstallationId, installationHandle);

  assert(
    bobIssuers.Asset === moolaIssuer,
    details`The Asset issuer should be the moola issuer`,
  );
  assert(
    bobIssuers.Price === simoleanIssuer,
    details`The Price issuer should be the simolean issuer`,
  );

  // Bob creates a buy order, saying that he wants exactly 3 moola,
  // and is willing to pay up to 7 simoleans.
  const bobBuyOrderProposal = harden({
    give: { Price: simoleans(7) },
    want: { Asset: moola(3) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobSimoleanPayment };

  // 6: Bob escrows with zoe
  const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
    bobExclusiveInvite,
    bobBuyOrderProposal,
    bobPayments,
  );

  // 8: Bob submits the buy order to the exchange
  const bobOfferResult = await bobSeat.addOrder();

  t.equals(
    bobOfferResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  t.equals(
    aliceOfferResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobMoolaPayout = await bobPayout.Asset;
  const bobSimoleanPayout = await bobPayout.Price;
  const aliceMoolaPayout = await alicePayout.Asset;
  const aliceSimoleanPayout = await alicePayout.Price;

  // Alice gets paid at least what she wanted
  t.ok(
    amountMaths[1].isGTE(
      await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
      aliceSellOrderProposal.want.Price,
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
  t.equals(aliceMoolaPurse.getCurrentAmount().extent, 0);
  t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 7);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
  t.equals(bobSimoleanPurse.getCurrentAmount().extent, 0);
});

test('simpleExchange with multiple sell offers', async t => {
  t.plan(1);
  try {
    const { issuers, mints, moola, simoleans } = setup();
    const [moolaIssuer, simoleanIssuer] = issuers;
    const [moolaMint, simoleanMint] = mints;
    const zoe = makeZoe({ require });
    const inviteIssuer = zoe.getInviteIssuer();
    const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(simpleExchange);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(30));
    const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(30));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    await aliceMoolaPurse.deposit(aliceMoolaPayment);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayment);

    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const simonInvite = await zoe.makeInstance(installationHandle, {
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });
    const instanceHandle = await getInstanceHandle(simonInvite);
    const { publicAPI } = zoe.getInstance(instanceHandle);

    const aliceInvite1 = publicAPI.makeInvite();

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSale1OrderProposal = harden({
      give: { Asset: moola(3) },
      want: { Price: simoleans(4) },
      exit: { onDemand: null },
    });

    const alicePayments = { Asset: aliceMoolaPurse.withdraw(moola(3)) };
    const { seat: aliceSeat1 } = await zoe.redeem(
      aliceInvite1,
      aliceSale1OrderProposal,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult1 = aliceSeat1.addOrder();

    // 5: Alice adds another sell order to the exchange
    const aliceInvite2 = await inviteIssuer.claim(publicAPI.makeInvite());
    const aliceSale2OrderProposal = harden({
      give: { Asset: moola(5) },
      want: { Price: simoleans(8) },
      exit: { onDemand: null },
    });
    const { seat: aliceSeat2 } = await zoe.redeem(
      aliceInvite2,
      aliceSale2OrderProposal,
      { Asset: aliceMoolaPurse.withdraw(moola(5)) },
    );
    const aliceOfferResult2 = aliceSeat2.addOrder();

    // 5: Alice adds a buy order to the exchange
    const aliceInvite3 = await inviteIssuer.claim(publicAPI.makeInvite());
    const aliceBuyOrderProposal = harden({
      give: { Price: simoleans(18) },
      want: { Asset: moola(29) },
      exit: { onDemand: null },
    });
    const { seat: aliceSeat3 } = await zoe.redeem(
      aliceInvite3,
      aliceBuyOrderProposal,
      { Price: aliceSimoleanPurse.withdraw(simoleans(18)) },
    );
    const aliceOfferResult3 = aliceSeat3.addOrder();

    Promise.all(aliceOfferResult1, aliceOfferResult2, aliceOfferResult3).then(
      () => {
        const expectedBook = {
          changed: {},
          buys: [[{ Asset: 29 }, { Price: 18 }]],
          sells: [
            [{ Price: 4 }, { Asset: 3 }],
            [{ Price: 8 }, { Asset: 5 }],
          ],
        };
        t.deepEquals(publicAPI.getBookOrders(), expectedBook);
      },
    );
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('simpleExchange showPayoutRules', async t => {
  t.plan(1);
  const { issuers, mints, moola, simoleans } = setup();
  const [moolaIssuer, simoleanIssuer] = issuers;
  const [moolaMint] = mints;
  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  const getOfferHandle = makeGetOfferHandle(inviteIssuer);
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(simpleExchange);

  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const simonInvite = await zoe.makeInstance(installationHandle, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });
  const instanceHandle = await getInstanceHandle(simonInvite);
  const { publicAPI } = zoe.getInstance(instanceHandle);

  const aliceInvite = publicAPI.makeInvite();
  const offerHandle = await getOfferHandle(aliceInvite);

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSale1OrderProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(4) },
    exit: { onDemand: null },
  });

  const alicePayments = { Asset: aliceMoolaPayment };
  const { seat: aliceSeat1 } = await zoe.redeem(
    aliceInvite,
    aliceSale1OrderProposal,
    alicePayments,
  );

  // 4: Alice adds her sell order to the exchange
  aliceSeat1.addOrder();

  const expected = [{ Price: 4 }, { Asset: 3 }];

  t.deepEquals(publicAPI.getOffer(offerHandle), expected);
});

test('simpleExchange with non-fungible assets', async t => {
  t.plan(9);
  const {
    ccIssuer,
    rpgIssuer,
    ccMint,
    rpgMint,
    cryptoCats,
    rpgItems,
    amountMaths,
    createRpgItem,
  } = setupNonFungible();

  const zoe = makeZoe({ require });
  const inviteIssuer = zoe.getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  // Pack the contract.
  const { source, moduleFormat } = await bundleSource(simpleExchange);

  const installationHandle = zoe.install(source, moduleFormat);

  // Setup Alice
  const spell = createRpgItem('Spell of Binding', 'binding');
  const aliceRpgPayment = rpgMint.mintPayment(rpgItems(spell));
  const aliceRpgPurse = rpgIssuer.makeEmptyPurse();
  const aliceCcPurse = ccIssuer.makeEmptyPurse();

  // Setup Bob
  const bobCcPayment = ccMint.mintPayment(cryptoCats(harden(['Cheshire Cat'])));
  const bobRpgPurse = rpgIssuer.makeEmptyPurse();
  const bobCcPurse = ccIssuer.makeEmptyPurse();

  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const simonInvite = await zoe.makeInstance(installationHandle, {
    Asset: rpgIssuer,
    Price: ccIssuer,
  });
  const instanceHandle = await getInstanceHandle(simonInvite);
  const { publicAPI } = zoe.getInstance(instanceHandle);

  const aliceInvite = publicAPI.makeInvite();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell a Spell of Binding and wants to receive CryptoCats in return.
  const aliceSellOrderProposal = harden({
    give: { Asset: rpgItems(spell) },
    want: { Price: cryptoCats(harden([])) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceRpgPayment };
  const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
    aliceInvite,
    aliceSellOrderProposal,
    alicePayments,
  );

  // 4: Alice adds her sell order to the exchange
  const aliceOfferResult = await aliceSeat.addOrder();
  const bobInvite = publicAPI.makeInvite();

  // 5: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstance(instanceHandle);

  t.equals(bobInstallationId, installationHandle);

  assert(
    bobIssuers.Asset === rpgIssuer,
    details`The Asset issuer should be the RPG issuer`,
  );
  assert(
    bobIssuers.Price === ccIssuer,
    details`The Price issuer should be the CryptoCat issuer`,
  );

  // Bob creates a buy order, saying that he wants the Spell of Binding,
  // and is willing to pay a Cheshire Cat.
  const bobBuyOrderProposal = harden({
    give: { Price: cryptoCats(harden(['Cheshire Cat'])) },
    want: { Asset: rpgItems(spell) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobCcPayment };

  // 6: Bob escrows with zoe
  const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
    bobExclusiveInvite,
    bobBuyOrderProposal,
    bobPayments,
  );

  // 8: Bob submits the buy order to the exchange
  const bobOfferResult = await bobSeat.addOrder();

  t.equals(
    bobOfferResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  t.equals(
    aliceOfferResult,
    'The offer has been accepted. Once the contract has been completed, please check your payout',
  );
  const bobPayout = await bobPayoutP;
  const alicePayout = await alicePayoutP;

  const bobRpgPayout = await bobPayout.Asset;
  const bobCcPayout = await bobPayout.Price;
  const aliceRpgPayout = await alicePayout.Asset;
  const aliceCcPayout = await alicePayout.Price;

  // Alice gets paid at least what she wanted
  t.ok(
    amountMaths
      .get('cc')
      .isGTE(
        await ccIssuer.getAmountOf(aliceCcPayout),
        aliceSellOrderProposal.want.Price,
      ),
  );

  // Alice sold the Spell
  t.deepEquals(
    await rpgIssuer.getAmountOf(aliceRpgPayout),
    rpgItems(harden([])),
  );

  // 13: Alice deposits her payout to ensure she can
  await aliceRpgPurse.deposit(aliceRpgPayout);
  await aliceCcPurse.deposit(aliceCcPayout);

  // 14: Bob deposits his original payments to ensure he can
  await bobRpgPurse.deposit(bobRpgPayout);
  await bobCcPurse.deposit(bobCcPayout);

  // Assert that the correct payout were received.
  // Alice has an empty RPG purse, and the Cheshire Cat.
  // Bob has an empty CryptoCat purse, and the Spell of Binding he wanted.
  t.deepEquals(aliceRpgPurse.getCurrentAmount().extent, []);
  t.deepEquals(aliceCcPurse.getCurrentAmount().extent, ['Cheshire Cat']);
  t.deepEquals(bobRpgPurse.getCurrentAmount().extent, spell);
  t.deepEquals(bobCcPurse.getCurrentAmount().extent, []);
});
