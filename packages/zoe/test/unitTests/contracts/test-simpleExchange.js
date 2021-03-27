/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import { E } from '@agoric/eventual-send';

import { amountMath, MathKind } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';
// noinspection ES6PreferShortImport
import { setup } from '../setupBasicMints';
import { setupNonFungible } from '../setupNonFungibleMints';
import { installationPFromSource } from '../installFromSource';
import { assertPayoutAmount, assertOfferResult } from '../../zoeTestHelpers';

const simpleExchange = `${__dirname}/../../../src/contracts/simpleExchange`;

test('simpleExchange with valid offers', async t => {
  t.plan(17);
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
  const installation = await installationPFromSource(zoe, simpleExchange);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3));

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7));

  // 1: Alice creates a simpleExchange instance and spreads the publicFacet far
  // and wide with instructions on how to call makeInvitation().
  const { publicFacet, instance } = await zoe.startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  const aliceInvitation = E(publicFacet).makeInvitation();

  const aliceNotifier = publicFacet.getNotifier();
  E(aliceNotifier)
    .getUpdateSince()
    .then(({ value: beforeAliceOrders, updateCount: beforeAliceCount }) => {
      t.deepEqual(
        beforeAliceOrders,
        {
          buys: [],
          sells: [],
        },
        `Order book is empty`,
      );
      t.is(beforeAliceCount, 3);
    });

  const {
    value: initialOrders,
  } = await publicFacet.getNotifier().getUpdateSince();
  t.deepEqual(
    initialOrders,
    { buys: [], sells: [] },
    `order notifier is initialized`,
  );

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
  const aliceSeat = await E(zoe).offer(
    aliceInvitation,
    aliceSellOrderProposal,
    alicePayments,
  );

  const part1 = E(aliceNotifier)
    .getUpdateSince()
    .then(({ value: afterAliceOrders, updateCount: afterAliceCount }) => {
      t.deepEqual(
        afterAliceOrders,
        {
          buys: [],
          sells: [
            {
              want: aliceSellOrderProposal.want,
              give: aliceSellOrderProposal.give,
            },
          ],
        },
        `order notifier is updated with Alice's sell order`,
      );
      t.is(afterAliceCount, 4);

      return aliceNotifier.getUpdateSince(afterAliceCount).then(update => {
        t.falsy(update.value.sells[0], 'accepted offer from Bob');
        t.is(update.updateCount, 5);
      });
    });

  const bobInvitation = await E(publicFacet).makeInvitation();
  const bobInstallation = await E(zoe).getInstallation(bobInvitation);

  // 5: Bob decides to join.
  const bobExclusiveInvitation = await invitationIssuer.claim(bobInvitation);

  const bobIssuers = zoe.getIssuers(instance);

  t.is(bobInstallation, installation);

  assert(
    bobIssuers.Asset === moolaIssuer,
    X`The Asset issuer should be the moola issuer`,
  );
  assert(
    bobIssuers.Price === simoleanIssuer,
    X`The Price issuer should be the simolean issuer`,
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
  const bobSeat = await zoe.offer(
    bobExclusiveInvitation,
    bobBuyOrderProposal,
    bobPayments,
  );

  const { value: afterBobOrders } = await E(
    E(publicFacet).getNotifier(),
  ).getUpdateSince();
  t.deepEqual(
    afterBobOrders,
    { buys: [], sells: [] },
    `order notifier is updated when Bob fulfills the order`,
  );

  assertOfferResult(t, bobSeat, 'Order Added');
  assertOfferResult(t, aliceSeat, 'Order Added');

  const {
    Asset: bobMoolaPayout,
    Price: bobSimoleanPayout,
  } = await bobSeat.getPayouts();

  const {
    Asset: aliceMoolaPayout,
    Price: aliceSimoleanPayout,
  } = await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    amountMath.isGTE(
      await simoleanIssuer.getAmountOf(aliceSimoleanPayout),
      aliceSellOrderProposal.want.Price,
    ),
    `Alice got the simoleans she wanted`,
  );

  // Alice sold all of her moola
  t.deepEqual(await moolaIssuer.getAmountOf(aliceMoolaPayout), moola(0n));

  await Promise.all([
    part1,
    // 6: Alice deposits her payout to ensure she can
    // Alice had 0 moola and 4 simoleans.
    assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(0n)),
    assertPayoutAmount(t, simoleanIssuer, aliceSimoleanPayout, simoleans(4)),

    // 7: Bob deposits his original payments to ensure he can
    // Bob had 3 moola and 3 simoleans.
    assertPayoutAmount(t, moolaIssuer, bobMoolaPayout, moola(3)),
    assertPayoutAmount(t, simoleanIssuer, bobSimoleanPayout, simoleans(3)),
  ]);
});

test('simpleExchange with multiple sell offers', async t => {
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
  const installation = await installationPFromSource(zoe, simpleExchange);

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(30));
  const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(30));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();
  await aliceMoolaPurse.deposit(aliceMoolaPayment);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayment);

  // 1: Simon creates a simpleExchange instance and spreads the publicFacet
  // far and wide with instructions on how to use it.
  const { publicFacet } = await zoe.startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSale1OrderProposal = harden({
    give: { Asset: moola(3) },
    want: { Price: simoleans(4) },
    exit: { onDemand: null },
  });

  const alicePayments = { Asset: aliceMoolaPurse.withdraw(moola(3)) };

  const aliceInvitation1 = E(publicFacet).makeInvitation();
  // 4: Alice adds her sell order to the exchange
  const aliceSeat = await zoe.offer(
    aliceInvitation1,
    aliceSale1OrderProposal,
    alicePayments,
  );

  // 5: Alice adds another sell order to the exchange
  const aliceInvitation2 = await invitationIssuer.claim(
    await E(publicFacet).makeInvitation(),
  );
  const aliceSale2OrderProposal = harden({
    give: { Asset: moola(5) },
    want: { Price: simoleans(8) },
    exit: { onDemand: null },
  });
  const proposal2 = {
    Asset: aliceMoolaPurse.withdraw(moola(5)),
  };
  const aliceSeat2 = await zoe.offer(
    aliceInvitation2,
    aliceSale2OrderProposal,
    proposal2,
  );

  // 5: Alice adds a buy order to the exchange
  const aliceInvitation3 = await invitationIssuer.claim(
    await E(publicFacet).makeInvitation(),
  );
  const aliceBuyOrderProposal = harden({
    give: { Price: simoleans(18) },
    want: { Asset: moola(29) },
    exit: { onDemand: null },
  });
  const proposal3 = { Price: aliceSimoleanPurse.withdraw(simoleans(18)) };
  const aliceSeat3 = await zoe.offer(
    aliceInvitation3,
    aliceBuyOrderProposal,
    proposal3,
  );

  await Promise.all([
    aliceSeat.getOfferResult(),
    aliceSeat2.getOfferResult(),
    aliceSeat3.getOfferResult(),
  ]).then(async () => {
    const expectedBook = {
      buys: [{ want: { Asset: moola(29) }, give: { Price: simoleans(18) } }],
      sells: [
        { want: { Price: simoleans(4) }, give: { Asset: moola(3) } },
        { want: { Price: simoleans(8) }, give: { Asset: moola(5) } },
      ],
    };
    t.deepEqual(
      (await E(E(publicFacet).getNotifier()).getUpdateSince()).value,
      expectedBook,
    );
  });
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
    createRpgItem,
    zoe,
    brands,
  } = setupNonFungible();
  const invitationIssuer = zoe.getInvitationIssuer();
  const installation = await installationPFromSource(zoe, simpleExchange);

  // Setup Alice
  const spell = createRpgItem('Spell of Binding', 'binding');
  const aliceRpgPayment = rpgMint.mintPayment(rpgItems(spell));

  // Setup Bob
  const bobCcPayment = ccMint.mintPayment(cryptoCats(harden(['Cheshire Cat'])));

  // 1: Simon creates a simpleExchange instance and spreads the invitation far and
  // wide with instructions on how to use it.
  const { publicFacet } = await zoe.startInstance(installation, {
    Asset: rpgIssuer,
    Price: ccIssuer,
  });
  const aliceInvitation = E(publicFacet).makeInvitation();

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell a Spell of Binding and wants to receive CryptoCats in return.
  const aliceSellOrderProposal = harden({
    give: { Asset: rpgItems(spell) },
    want: { Price: cryptoCats(harden(['Cheshire Cat'])) },
    exit: { onDemand: null },
  });
  const alicePayments = { Asset: aliceRpgPayment };
  // 4: Alice adds her sell order to the exchange
  const aliceSeat = await zoe.offer(
    aliceInvitation,
    aliceSellOrderProposal,
    alicePayments,
  );

  const bobInvitation = await E(publicFacet).makeInvitation();

  // 5: Bob decides to join.
  const bobInstance = await E(zoe).getInstance(bobInvitation);
  const bobInstallation = await E(zoe).getInstallation(bobInvitation);
  const bobExclusiveInvitation = await invitationIssuer.claim(bobInvitation);

  t.is(bobInstallation, installation);

  const bobIssuers = zoe.getIssuers(bobInstance);
  assert(
    bobIssuers.Asset === rpgIssuer,
    X`The Asset issuer should be the RPG issuer`,
  );
  assert(
    bobIssuers.Price === ccIssuer,
    X`The Price issuer should be the CryptoCat issuer`,
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
  const bobSeat = await zoe.offer(
    bobExclusiveInvitation,
    bobBuyOrderProposal,
    bobPayments,
  );

  assertOfferResult(t, bobSeat, 'Order Added');
  assertOfferResult(t, aliceSeat, 'Order Added');

  const {
    Asset: bobRpgPayout,
    Price: bobCcPayout,
  } = await bobSeat.getPayouts();

  const {
    Asset: aliceRpgPayout,
    Price: aliceCcPayout,
  } = await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    amountMath.isGTE(
      await ccIssuer.getAmountOf(aliceCcPayout),
      aliceSellOrderProposal.want.Price,
    ),
  );

  // Alice sold the Spell
  t.deepEqual(
    await rpgIssuer.getAmountOf(aliceRpgPayout),
    rpgItems(harden([])),
  );

  // Assert that the correct payout were received.
  // Alice has an empty RPG purse, and the Cheshire Cat.
  // Bob has an empty CryptoCat purse, and the Spell of Binding he wanted.
  const noCats = amountMath.makeEmpty(brands.get('cc'), MathKind.SET);
  const noRpgItems = amountMath.makeEmpty(brands.get('rpg'), MathKind.SET);
  await assertPayoutAmount(t, rpgIssuer, aliceRpgPayout, noRpgItems);
  const cheshireCatAmount = cryptoCats(harden(['Cheshire Cat']));
  await assertPayoutAmount(t, ccIssuer, aliceCcPayout, cheshireCatAmount);
  await assertPayoutAmount(t, rpgIssuer, bobRpgPayout, rpgItems(spell));
  await assertPayoutAmount(t, ccIssuer, bobCcPayout, noCats);
});
