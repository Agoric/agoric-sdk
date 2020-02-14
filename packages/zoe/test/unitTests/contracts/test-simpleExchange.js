// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';

import harden from '@agoric/harden';

import { makeZoe } from '../../../src/zoe';
import { setup } from '../setupBasicMints';

const simpleExchangeRoot = `${__dirname}/../../../src/contracts/simpleExchange`;

test('zoe - simpleExchange', async t => {
  try {
    const {
      issuers: originalIssuers,
      mints,
      amountMaths,
      moola,
      simoleans,
    } = setup();
    const issuers = originalIssuers.slice(0, 2);
    const zoe = makeZoe({ require });
    // Pack the contract.
    const { source, moduleFormat } = await bundleSource(simpleExchangeRoot);

    const installationHandle = zoe.install(source, moduleFormat);

    // Setup Alice
    const aliceMoolaPayment = mints[0].mintPayment(moola(3));
    const aliceMoolaPurse = issuers[0].makeEmptyPurse();
    const aliceSimoleanPurse = issuers[1].makeEmptyPurse();

    // Setup Bob
    const bobSimoleanPayment = mints[1].mintPayment(simoleans(7));
    const bobMoolaPurse = issuers[0].makeEmptyPurse();
    const bobSimoleanPurse = issuers[1].makeEmptyPurse();

    // 1: Alice creates a simpleExchange instance
    const aliceInvite = await zoe.makeInstance(installationHandle, {
      issuers,
    });
    const inviteIssuer = zoe.getInviteIssuer();
    const { instanceHandle } = inviteIssuer.getBalance(aliceInvite).extent[0];
    const { publicAPI } = zoe.getInstance(instanceHandle);

    // 2: Alice escrows with zoe to create a sell order. She wants to
    // sell 3 moola and wants to receive at least 4 simoleans in
    // return.
    const aliceSellOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'offerAtMost',
          amount: moola(3),
        },
        {
          kind: 'wantAtLeast',
          amount: simoleans(4),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const alicePayments = [aliceMoolaPayment, undefined];
    const { seat: aliceSeat, payout: alicePayoutP } = await zoe.redeem(
      aliceInvite,
      aliceSellOrderOfferRules,
      alicePayments,
    );

    // 4: Alice adds her sell order to the exchange
    const aliceOfferResult = await aliceSeat.addOrder();
    const bobInvite = publicAPI.makeInvite();

    // 5: Alice spreads the invite far and wide with instructions
    // on how to use it and Bob decides he wants to join.

    const bobExclusiveInvite = await inviteIssuer.claim(bobInvite);
    const {
      extent: [{ instanceHandle: bobInstanceHandle }],
    } = inviteIssuer.getBalance(bobExclusiveInvite);

    const {
      installationHandle: bobInstallationId,
      terms: bobTerms,
    } = zoe.getInstance(bobInstanceHandle);

    t.equals(bobInstallationId, installationHandle);
    t.deepEquals(bobTerms.issuers, issuers);

    // Bob creates a buy order, saying that he wants exactly 3 moola,
    // and is willing to pay up to 7 simoleans.

    const bobBuyOrderOfferRules = harden({
      payoutRules: [
        {
          kind: 'wantAtLeast',
          amount: moola(3),
        },
        {
          kind: 'offerAtMost',
          amount: simoleans(7),
        },
      ],
      exitRule: {
        kind: 'onDemand',
      },
    });
    const bobPayments = [undefined, bobSimoleanPayment];

    // 6: Bob escrows with zoe
    const { seat: bobSeat, payout: bobPayoutP } = await zoe.redeem(
      bobExclusiveInvite,
      bobBuyOrderOfferRules,
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

    const [bobMoolaPayout, bobSimoleanPayout] = await Promise.all(bobPayout);
    const [aliceMoolaPayout, aliceSimoleanPayout] = await Promise.all(
      alicePayout,
    );

    // Alice gets paid at least what she wanted
    t.ok(
      amountMaths[1].isGTE(
        issuers[1].getBalance(aliceSimoleanPayout),
        aliceSellOrderOfferRules.payoutRules[1].amount,
      ),
    );

    // Alice sold all of her moola
    t.deepEquals(issuers[0].getBalance(aliceMoolaPayout), moola(0));

    // 13: Alice deposits her payout to ensure she can
    await aliceMoolaPurse.deposit(aliceMoolaPayout);
    await aliceSimoleanPurse.deposit(aliceSimoleanPayout);

    // 14: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.deposit(bobMoolaPayout);
    await bobSimoleanPurse.deposit(bobSimoleanPayout);

    // Assert that the correct payout were received.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getBalance().extent, 0);
    t.equals(aliceSimoleanPurse.getBalance().extent, 7);
    t.equals(bobMoolaPurse.getBalance().extent, 3);
    t.equals(bobSimoleanPurse.getBalance().extent, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
