/* global harden */

import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import { assert, details } from '@agoric/assert';
import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';
import { makeGetInstanceHandle } from '../../../src/clientSupport';

const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

test('simpleExchange with valid offers', async t => {
  t.plan(14);
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

  // Pack the contract.
  const bundle = await bundleSource(simpleExchange);

  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));
  const bobMoolaPurse = moolaIssuer.makeEmptyPurse();
  const bobSimoleanPurse = simoleanIssuer.makeEmptyPurse();

  // 1: Simon creates a simpleExchange instance and spreads the publicAPI far
  // and wide with instructions on how to call makeInvite().
  const {
    instanceRecord: { publicAPI },
  } = await zoe.makeInstance(installationHandle, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

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
  // 4: Alice adds her sell order to the exchange
  const {
    payout: alicePayoutP,
    outcome: aliceOutcomeP,
    offerHandle: aliceOfferHandle,
  } = await zoe.offer(aliceInvite, aliceSellOrderProposal, alicePayments);

  aliceOfferHandle.then(handle => {
    const aliceNotifier = zoe.getOfferNotifier(handle);
    const firstUpdate = aliceNotifier.getUpdateSince();
    t.notOk(firstUpdate.value, 'notifier start state is empty');
    t.notOk(firstUpdate.done, 'notifier start state is not done');
    t.ok(firstUpdate.updateHandle, 'notifier start state has handle');
    const nextUpdateP = aliceNotifier.getUpdateSince(firstUpdate.updateHandle);
    Promise.all([nextUpdateP]).then(([nextRecord]) => {
      t.ok(nextRecord.value.Asset, 'following state has update');
      t.ok(nextRecord.value.Price, 'following state has Price');
    });
  });

  const bobInvite = publicAPI.makeInvite();

  // 5: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);
  const bobInstanceHandle = await getInstanceHandle(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInstanceHandle);

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

  const bobMoolaPayout = await bobPayout.Asset;
  const bobSimoleanPayout = await bobPayout.Price;
  const aliceMoolaPayout = await alicePayout.Asset;
  const aliceSimoleanPayout = await alicePayout.Price;

  // Alice gets paid at least what she wanted
  t.ok(
    amountMaths
      .get('simoleans')
      .isGTE(
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
  t.equals(aliceSimoleanPurse.getCurrentAmount().extent, 4);
  t.equals(bobMoolaPurse.getCurrentAmount().extent, 3);
  t.equals(bobSimoleanPurse.getCurrentAmount().extent, 3);
});

test('simpleExchange with multiple sell offers', async t => {
  t.plan(1);
  try {
    const {
      moolaIssuer,
      simoleanIssuer,
      moolaMint,
      simoleanMint,
      moola,
      simoleans,
    } = setup();
    const zoe = makeZoe();
    const inviteIssuer = zoe.getInviteIssuer();

    // Pack the contract.
    const bundle = await bundleSource(simpleExchange);

    const installationHandle = await zoe.install(bundle);

    // Setup Alice
    const aliceMoolaPayment = moolaMint.mintPayment(moola(30));
    const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(30));
    const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
    const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();
    await aliceMoolaPurse.deposit(aliceMoolaPayment);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayment);

    // 1: Simon creates a simpleExchange instance and spreads the invite far and
    // wide with instructions on how to use it.
    const {
      instanceRecord: { publicAPI },
    } = await zoe.makeInstance(installationHandle, {
      Asset: moolaIssuer,
      Price: simoleanIssuer,
    });

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
    // 4: Alice adds her sell order to the exchange
    const { outcome: aliceOutcome1P } = await zoe.offer(
      aliceInvite1,
      aliceSale1OrderProposal,
      alicePayments,
    );

    // 5: Alice adds another sell order to the exchange
    const aliceInvite2 = await inviteIssuer.claim(publicAPI.makeInvite());
    const aliceSale2OrderProposal = harden({
      give: { Asset: moola(5) },
      want: { Price: simoleans(8) },
      exit: { onDemand: null },
    });
    const { outcome: aliceOutcome2P } = await zoe.offer(
      aliceInvite2,
      aliceSale2OrderProposal,
      { Asset: aliceMoolaPurse.withdraw(moola(5)) },
    );

    // 5: Alice adds a buy order to the exchange
    const aliceInvite3 = await inviteIssuer.claim(publicAPI.makeInvite());
    const aliceBuyOrderProposal = harden({
      give: { Price: simoleans(18) },
      want: { Asset: moola(29) },
      exit: { onDemand: null },
    });
    const { outcome: aliceOutcome3P } = await zoe.offer(
      aliceInvite3,
      aliceBuyOrderProposal,
      { Price: aliceSimoleanPurse.withdraw(simoleans(18)) },
    );

    Promise.all([aliceOutcome1P, aliceOutcome2P, aliceOutcome3P]).then(() => {
      const expectedBook = {
        buys: [{ want: { Asset: moola(29) }, give: { Price: simoleans(18) } }],
        sells: [
          { want: { Price: simoleans(4) }, give: { Asset: moola(3) } },
          { want: { Price: simoleans(8) }, give: { Asset: moola(5) } },
        ],
      };
      t.deepEquals(
        publicAPI.getNotifier().getUpdateSince().value,
        expectedBook,
      );
    });
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  }
});

test('simpleExchange showPayoutRules', async t => {
  t.plan(1);
  const { moolaIssuer, simoleanIssuer, moolaMint, moola, simoleans } = setup();
  const zoe = makeZoe();

  // Pack the contract.
  const bundle = await bundleSource(simpleExchange);

  const installationHandle = await zoe.install(bundle);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));
  // 1: Simon creates a simpleExchange instance and spreads the invite far and
  // wide with instructions on how to use it.
  const {
    instanceRecord: { publicAPI },
  } = await zoe.makeInstance(installationHandle, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  const aliceInvite = publicAPI.makeInvite();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSale1OrderProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(4) },
    exit: { onDemand: null },
  });

  const alicePayments = { Asset: aliceMoolaPayment };

  // 4: Alice adds her sell order to the exchange
  const { offerHandle: aliceOfferHandleP } = await zoe.offer(
    aliceInvite,
    aliceSale1OrderProposal,
    alicePayments,
  );

  const expected = { want: { Price: simoleans(4) }, give: { Asset: moola(3) } };

  t.deepEquals(publicAPI.getOffer(await aliceOfferHandleP), expected);
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

  const zoe = makeZoe();
  const inviteIssuer = zoe.getInviteIssuer();

  // Pack the contract.
  const bundle = await bundleSource(simpleExchange);

  const installationHandle = await zoe.install(bundle);

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
  const {
    instanceRecord: { publicAPI },
  } = await zoe.makeInstance(installationHandle, {
    Asset: rpgIssuer,
    Price: ccIssuer,
  });

  const aliceInvite = publicAPI.makeInvite();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell a Spell of Binding and wants to receive CryptoCats in return.
  const aliceSellOrderProposal = harden({
    give: { Asset: rpgItems(spell) },
    want: { Price: cryptoCats(harden(['Cheshire Cat'])) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceRpgPayment };
  // 4: Alice adds her sell order to the exchange
  const { payout: alicePayoutP, outcome: aliceOutcomeP } = await zoe.offer(
    aliceInvite,
    aliceSellOrderProposal,
    alicePayments,
  );

  const bobInvite = publicAPI.makeInvite();

  // 5: Bob decides to join.
  const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);
  const bobInstanceHandle = await getInstanceHandle(bobExclusiveInvite);

  const {
    installationHandle: bobInstallationId,
    issuerKeywordRecord: bobIssuers,
  } = zoe.getInstanceRecord(bobInstanceHandle);

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
