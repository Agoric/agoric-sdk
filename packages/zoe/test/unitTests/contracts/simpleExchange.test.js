import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { E } from '@endo/eventual-send';

import { AmountMath, AssetKind } from '@agoric/ertp';
import { claim } from '@agoric/ertp/src/legacy-payment-helpers.js';

import { setup } from '../setupBasicMints.js';
import { setupNonFungible } from '../setupNonFungibleMints.js';
import { installationPFromSource } from '../installFromSource.js';
import { assertPayoutAmount, assertOfferResult } from '../../zoeTestHelpers.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const simpleExchange = `${dirname}/../../../src/contracts/simpleExchange.js`;

test('simpleExchange with valid offers', async t => {
  t.plan(16);
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
    simpleExchange,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(3n));

  // Setup Bob
  const bobSimoleanPayment = simoleanMint.mintPayment(simoleans(7n));

  // 1: Alice creates a simpleExchange instance and spreads the publicFacet far
  // and wide with instructions on how to call makeInvitation().
  const { publicFacet, instance } = await E(zoe).startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  const aliceInvitation = E(publicFacet).makeInvitation();

  const aliceNotifier = publicFacet.getNotifier();
  let aliceNotifierInitialCount;
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
      aliceNotifierInitialCount = beforeAliceCount;
    });

  const { value: initialOrders } = await publicFacet
    .getNotifier()
    .getUpdateSince();
  t.deepEqual(
    initialOrders,
    { buys: [], sells: [] },
    `order notifier is initialized`,
  );

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSellOrderProposal = harden({
    give: { Asset: moola(3n) },
    want: { Price: simoleans(4n) },
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
      t.is(BigInt(afterAliceCount), BigInt(aliceNotifierInitialCount) + 1n);

      return aliceNotifier.getUpdateSince(afterAliceCount).then(update => {
        t.falsy(update.value.sells[0], 'accepted offer from Bob');
        t.is(
          BigInt(update.updateCount),
          BigInt(aliceNotifierInitialCount) + 2n,
        );
      });
    });

  const bobInvitation = await E(publicFacet).makeInvitation();
  const bobInstallation = await E(zoe).getInstallation(bobInvitation);

  // 5: Bob decides to join.
  const bobExclusiveInvitation = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    bobInvitation,
  );

  const bobIssuers = await E(zoe).getIssuers(instance);

  t.is(bobInstallation, installation);

  assert(
    bobIssuers.Asset === moolaIssuer,
    'The Asset issuer should be the moola issuer',
  );
  assert(
    bobIssuers.Price === simoleanIssuer,
    'The Price issuer should be the simolean issuer',
  );

  // Bob creates a buy order, saying that he wants exactly 3 moola,
  // and is willing to pay up to 7 simoleans.
  const bobBuyOrderProposal = harden({
    give: { Price: simoleans(7n) },
    want: { Asset: moola(3n) },
    exit: { onDemand: null },
  });
  const bobPayments = { Price: bobSimoleanPayment };

  // 6: Bob escrows with zoe
  // 8: Bob submits the buy order to the exchange
  const bobSeat = await E(zoe).offer(
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

  const { Asset: bobMoolaPayout, Price: bobSimoleanPayout } =
    await bobSeat.getPayouts();

  const { Asset: aliceMoolaPayout, Price: aliceSimoleanPayout } =
    await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    AmountMath.isGTE(
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
    await assertPayoutAmount(t, moolaIssuer, aliceMoolaPayout, moola(0n)),
    await assertPayoutAmount(
      t,
      simoleanIssuer,
      aliceSimoleanPayout,
      simoleans(4n),
    ),

    // 7: Bob deposits his original payments to ensure he can
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

test('simpleExchange with multiple sell offers', async t => {
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
    simpleExchange,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaMint.mintPayment(moola(30n));
  const aliceSimoleanPayment = simoleanMint.mintPayment(simoleans(30n));
  const aliceMoolaPurse = moolaIssuer.makeEmptyPurse();
  const aliceSimoleanPurse = simoleanIssuer.makeEmptyPurse();
  await aliceMoolaPurse.deposit(aliceMoolaPayment);
  await aliceSimoleanPurse.deposit(aliceSimoleanPayment);

  // 1: Simon creates a simpleExchange instance and spreads the publicFacet
  // far and wide with instructions on how to use it.
  const { publicFacet } = await E(zoe).startInstance(installation, {
    Asset: moolaIssuer,
    Price: simoleanIssuer,
  });

  // 2: Alice escrows with zoe to create a sell order. She wants to
  // sell 3 moola and wants to receive at least 4 simoleans in
  // return.
  const aliceSale1OrderProposal = harden({
    give: { Asset: moola(3n) },
    want: { Price: simoleans(4n) },
    exit: { onDemand: null },
  });

  const alicePayments = { Asset: aliceMoolaPurse.withdraw(moola(3n)) };

  const aliceInvitation1 = E(publicFacet).makeInvitation();
  // 4: Alice adds her sell order to the exchange
  const aliceSeat = await E(zoe).offer(
    aliceInvitation1,
    aliceSale1OrderProposal,
    alicePayments,
  );

  // 5: Alice adds another sell order to the exchange
  const aliceInvitation2 = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    await E(publicFacet).makeInvitation(),
  );
  const aliceSale2OrderProposal = harden({
    give: { Asset: moola(5n) },
    want: { Price: simoleans(8n) },
    exit: { onDemand: null },
  });
  const proposal2 = {
    Asset: aliceMoolaPurse.withdraw(moola(5n)),
  };
  const aliceSeat2 = await E(zoe).offer(
    aliceInvitation2,
    aliceSale2OrderProposal,
    proposal2,
  );

  // 5: Alice adds a buy order to the exchange
  const aliceInvitation3 = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    await E(publicFacet).makeInvitation(),
  );
  const aliceBuyOrderProposal = harden({
    give: { Price: simoleans(18n) },
    want: { Asset: moola(29n) },
    exit: { onDemand: null },
  });
  const proposal3 = { Price: aliceSimoleanPurse.withdraw(simoleans(18n)) };
  const aliceSeat3 = await E(zoe).offer(
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
      buys: [{ want: { Asset: moola(29n) }, give: { Price: simoleans(18n) } }],
      sells: [
        { want: { Price: simoleans(4n) }, give: { Asset: moola(3n) } },
        { want: { Price: simoleans(8n) }, give: { Asset: moola(5n) } },
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
    vatAdminState,
  } = setupNonFungible();
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const installation = await installationPFromSource(
    zoe,
    vatAdminState,
    simpleExchange,
  );

  // Setup Alice
  const spell = createRpgItem('Spell of Binding', 'binding');
  const aliceRpgPayment = rpgMint.mintPayment(rpgItems(spell));

  // Setup Bob
  const bobCcPayment = ccMint.mintPayment(cryptoCats(harden(['Cheshire Cat'])));

  // 1: Simon creates a simpleExchange instance and spreads the invitation far and
  // wide with instructions on how to use it.
  const { publicFacet } = await E(zoe).startInstance(installation, {
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
  const aliceSeat = await E(zoe).offer(
    aliceInvitation,
    aliceSellOrderProposal,
    alicePayments,
  );

  const bobInvitation = await E(publicFacet).makeInvitation();

  // 5: Bob decides to join.
  const bobInstance = await E(zoe).getInstance(bobInvitation);
  const bobInstallation = await E(zoe).getInstallation(bobInvitation);
  const bobExclusiveInvitation = await claim(
    E(invitationIssuer).makeEmptyPurse(),
    bobInvitation,
  );

  t.is(bobInstallation, installation);

  const bobIssuers = await E(zoe).getIssuers(bobInstance);
  assert(
    bobIssuers.Asset === rpgIssuer,
    'The Asset issuer should be the RPG issuer',
  );
  assert(
    bobIssuers.Price === ccIssuer,
    'The Price issuer should be the CryptoCat issuer',
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
  const bobSeat = await E(zoe).offer(
    bobExclusiveInvitation,
    bobBuyOrderProposal,
    bobPayments,
  );

  assertOfferResult(t, bobSeat, 'Order Added');
  assertOfferResult(t, aliceSeat, 'Order Added');

  const { Asset: bobRpgPayout, Price: bobCcPayout } =
    await bobSeat.getPayouts();

  const { Asset: aliceRpgPayout, Price: aliceCcPayout } =
    await aliceSeat.getPayouts();

  // Alice gets paid at least what she wanted
  t.truthy(
    AmountMath.isGTE(
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
  // @ts-expect-error get may fail
  const noCats = AmountMath.makeEmpty(brands.get('cc'), AssetKind.SET);
  // @ts-expect-error get may fail
  const noRpgItems = AmountMath.makeEmpty(brands.get('rpg'), AssetKind.SET);
  await assertPayoutAmount(t, rpgIssuer, aliceRpgPayout, noRpgItems);
  const cheshireCatAmount = cryptoCats(harden(['Cheshire Cat']));
  await assertPayoutAmount(t, ccIssuer, aliceCcPayout, cheshireCatAmount);
  await assertPayoutAmount(t, rpgIssuer, bobRpgPayout, rpgItems(spell));
  await assertPayoutAmount(t, ccIssuer, bobCcPayout, noCats);
});
