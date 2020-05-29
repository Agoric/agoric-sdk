// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import harden from '@agoric/harden';
import produceIssuer from '@agoric/ertp';
import { E } from '@agoric/eventual-send';

import { makeZoe } from '../../../src/zoe';
import { makeGetInstanceHandle } from '../../../src/clientSupport';
import { defaultAcceptanceMsg } from '../../../src/contractSupport';

const mintAndSellNFTRoot = `${__dirname}/../../../src/contracts/mintAndSellNFT`;
const sellItemsRoot = `${__dirname}/../../../src/contracts/sellItems`;

test(`mint and sell tickets for multiple shows`, async t => {
  // Setup initial conditions
  const zoe = makeZoe();
  const inviteIssuer = E(zoe).getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  const mintAndSellNFTInstallationHandle = await E(zoe).install(
    mintAndSellNFTBundle,
  );

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  const sellItemsInstallationHandle = await E(zoe).install(sellItemsBundle);

  const { issuer: moolaIssuer, amountMath: moolaAmountMath } = produceIssuer(
    'moola',
  );

  const invite = await E(zoe).makeInstance(mintAndSellNFTInstallationHandle);
  const instanceHandle = await getInstanceHandle(invite);
  const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);

  const { outcome } = await E(zoe).offer(invite);
  const ticketMaker = await outcome;
  const { outcome: escrowTicketsOutcome, sellItemsInstanceHandle } = await E(
    ticketMaker,
  ).sellTokens({
    customExtentProperties: {
      show: 'Steven Universe, the Opera',
      start: 'Wed, March 25th 2020 at 8pm',
    },
    count: 3,
    moneyIssuer: moolaIssuer,
    sellItemsInstallationHandle,
    pricePerItem: moolaAmountMath.make(20),
  });
  t.equals(
    await escrowTicketsOutcome,
    defaultAcceptanceMsg,
    `escrowTicketsOutcome is default acceptance message`,
  );

  const ticketIssuerP = E(publicAPI).getTokenIssuer();
  const ticketBrand = await E(ticketIssuerP).getBrand();
  const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
    sellItemsInstanceHandle,
  );
  const ticketsForSale = await E(ticketSalesPublicAPI).getAvailableItems();
  t.deepEquals(
    ticketsForSale,
    {
      brand: ticketBrand,
      extent: [
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 1,
        },
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 2,
        },
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 3,
        },
      ],
    },
    `the tickets are up for sale`,
  );

  const { sellItemsInstanceHandle: sellItemsInstanceHandle2 } = await E(
    ticketMaker,
  ).sellTokens({
    customExtentProperties: {
      show: 'Reserved for private party',
      start: 'Tues May 12, 2020 at 8pm',
    },
    count: 2,
    moneyIssuer: moolaIssuer,
    sellItemsInstallationHandle,
  });
  const { publicAPI: salesPublicAPI2 } = await E(zoe).getInstanceRecord(
    sellItemsInstanceHandle2,
  );
  const ticketsForSale2 = await E(salesPublicAPI2).getAvailableItems();
  t.deepEquals(
    ticketsForSale2,
    {
      brand: ticketBrand,
      extent: [
        {
          show: 'Reserved for private party',
          start: 'Tues May 12, 2020 at 8pm',
          number: 1,
        },
        {
          show: 'Reserved for private party',
          start: 'Tues May 12, 2020 at 8pm',
          number: 2,
        },
      ],
    },
    `we can reuse the mint to make more tickets and sell them in a different instance`,
  );
  t.end();
});

// __Test Scenario__

// The Opera de Bordeaux plays the contract creator and the auditorium
// It creates the contract for a show ("Steven Universe, the Opera", Wed, March
// 25th 2020 at 8pm, 3 tickets)
// The Opera wants 22 moolas per ticket

// Alice buys ticket #1

// Then, the Joker tries malicious things:
// - they try to buy ticket #1 (and will fail because Alice already
//   bought it)
// - they try to buy to buy ticket #2 for 1 moola (and will fail)

// Then, Bob buys ticket #2 and #3

// The Opera is told about the show being sold out. It gets all the moolas from
// the sale

test(`mint and sell opera tickets`, async t => {
  // Setup initial conditions
  const {
    mint: moolaMint,
    issuer: moolaIssuer,
    amountMath: { make: moola },
  } = produceIssuer('moola');

  const zoe = makeZoe({ require });
  const inviteIssuer = await E(zoe).getInviteIssuer();

  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  const mintAndSellNFTInstallationHandle = await E(zoe).install(
    mintAndSellNFTBundle.source,
    mintAndSellNFTBundle.moduleFormat,
  );

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  const sellItemsInstallationHandle = await E(zoe).install(
    sellItemsBundle.source,
    sellItemsBundle.moduleFormat,
  );

  // === Initial Opera de Bordeaux part ===

  // create an instance of the venue contract
  const mintTickets = async () => {
    const invite = await E(zoe).makeInstance(mintAndSellNFTInstallationHandle);
    const instanceHandle = await getInstanceHandle(invite);
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);

    const ticketIssuer = await E(publicAPI).getTokenIssuer();
    const { outcome } = await E(zoe).offer(invite);
    const ticketSeller = await outcome;

    // completeObj exists because of a current limitation in @agoric/marshal : https://github.com/Agoric/agoric-sdk/issues/818
    const {
      sellItemsInstanceHandle: ticketSalesInstanceHandle,
      payout,
      completeObj,
    } = await E(ticketSeller).sellTokens({
      customExtentProperties: {
        show: 'Steven Universe, the Opera',
        start: 'Wed, March 25th 2020 at 8pm',
      },
      count: 3,
      moneyIssuer: moolaIssuer,
      sellItemsInstallationHandle,
      pricePerItem: moola(22),
    });

    const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
      ticketSalesInstanceHandle,
    );

    const ticketsForSale = await E(ticketSalesPublicAPI).getAvailableItems();

    t.equal(ticketsForSale.extent.length, 3, `3 tickets for sale`);

    return harden({
      ticketIssuer,
      ticketSalesInstanceHandle,
      ticketSalesPublicAPI,
      payoutP: payout,
      completeObj,
    });
  };

  // === Alice part ===
  // Alice is given the instanceHandle of the ticket sales instance
  // and she has 100 moola
  const aliceBuysTicket1 = async (
    ticketSalesInstanceHandle,
    moola100Payment,
  ) => {
    const { publicAPI: ticketSalesPublicAPI, terms } = await E(
      zoe,
    ).getInstanceRecord(ticketSalesInstanceHandle);
    const ticketIssuer = await E(ticketSalesPublicAPI).getItemsIssuer();
    const ticketAmountMath = await E(ticketIssuer).getAmountMath();

    const alicePurse = await E(moolaIssuer).makeEmptyPurse();
    await E(alicePurse).deposit(moola100Payment);

    // Alice makes an invite for herself
    const aliceInvite = await E(ticketSalesPublicAPI).makeBuyerInvite();

    t.deepEquals(terms.pricePerItem, moola(22), `pricePerItem is 22 moola`);

    const availableTickets = await E(ticketSalesPublicAPI).getAvailableItems();

    t.equal(
      availableTickets.extent.length,
      3,
      'Alice should see 3 available tickets',
    );
    t.ok(
      availableTickets.extent.find(ticket => ticket.number === 1),
      `availableTickets contains ticket number 1`,
    );
    t.ok(
      availableTickets.extent.find(ticket => ticket.number === 2),
      `availableTickets contains ticket number 2`,
    );
    t.ok(
      availableTickets.extent.find(ticket => ticket.number === 3),
      `availableTickets contains ticket number 3`,
    );

    // find the extent corresponding to ticket #1
    const ticket1Extent = availableTickets.extent.find(
      ticket => ticket.number === 1,
    );
    // make the corresponding amount
    const ticket1Amount = ticketAmountMath.make(harden([ticket1Extent]));

    const aliceProposal = harden({
      give: { Money: terms.pricePerItem },
      want: { Items: ticket1Amount },
    });

    const alicePaymentForTicket = alicePurse.withdraw(terms.pricePerItem);

    const alicePaymentKeywordRecord = harden({ Money: alicePaymentForTicket });

    const { payout: payoutP } = await E(zoe).offer(
      aliceInvite,
      aliceProposal,
      alicePaymentKeywordRecord,
    );
    const alicePayout = await payoutP;
    const aliceBoughtTicketAmount = await E(ticketIssuer).getAmountOf(
      alicePayout.Items,
    );

    t.equal(
      aliceBoughtTicketAmount.extent[0].show,
      'Steven Universe, the Opera',
      'Alice should have receieved the ticket for the correct show',
    );
    t.equal(
      aliceBoughtTicketAmount.extent[0].number,
      1,
      'Alice should have received the ticket for the correct number',
    );
  };

  // === Joker part ===
  // Joker starts with 100 moolas
  // Joker attempts to buy ticket 1 (and should fail)
  const jokerBuysTicket1 = async (
    ticketSalesInstanceHandle,
    moola100Payment,
  ) => {
    const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
      ticketSalesInstanceHandle,
    );
    const ticketIssuer = await E(ticketSalesPublicAPI).getItemsIssuer();
    const ticketAmountMath = await E(ticketIssuer).getAmountMath();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const jokerInvite = await E(ticketSalesPublicAPI).makeBuyerInvite();

    const {
      terms: { pricePerItem },
    } = await E(zoe).getInstanceRecord(ticketSalesInstanceHandle);

    // Joker does NOT check available tickets and tries to buy the ticket
    // number 1(already bought by Alice, but he doesn't know)
    const ticket1Amount = ticketAmountMath.make(
      harden([
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 1,
        },
      ]),
    );

    const jokerProposal = harden({
      give: { Money: pricePerItem },
      want: { Items: ticket1Amount },
    });

    const jokerPaymentForTicket = jokerPurse.withdraw(pricePerItem);

    const { outcome, payout: payoutP } = await zoe.offer(
      jokerInvite,
      jokerProposal,
      harden({
        Money: jokerPaymentForTicket,
      }),
    );

    t.rejects(
      outcome,
      /Some of the wanted items were not available for sale/,
      'ticket 1 is no longer available',
    );

    const payout = await payoutP;
    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      payout.Items,
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(payout.Money);

    t.ok(
      ticketAmountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #1',
    );
    t.deepEquals(
      jokerMoneyPayoutAmount,
      moola(22),
      'Joker should get a refund after trying to get ticket #1',
    );
  };

  // Joker attempts to buy ticket 2 for 1 moola (and should fail)
  const jokerTriesToBuyTicket2 = async (
    ticketSalesInstanceHandle,
    moola100Payment,
  ) => {
    const { publicAPI: ticketSalesPublicAPI } = await E(zoe).getInstanceRecord(
      ticketSalesInstanceHandle,
    );
    const ticketIssuer = await E(ticketSalesPublicAPI).getItemsIssuer();
    const ticketAmountMath = await E(ticketIssuer).getAmountMath();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const jokerInvite = await E(ticketSalesPublicAPI).makeBuyerInvite();

    const ticket2Amount = ticketAmountMath.make(
      harden([
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 2,
        },
      ]),
    );

    const insufficientAmount = moola(1);
    const jokerProposal = harden({
      give: { Money: insufficientAmount },
      want: { Items: ticket2Amount },
    });

    const jokerInsufficientPaymentForTicket = jokerPurse.withdraw(
      insufficientAmount,
    );

    const { outcome, payout: payoutP } = await zoe.offer(
      jokerInvite,
      jokerProposal,
      harden({
        Money: jokerInsufficientPaymentForTicket,
      }),
    );

    t.rejects(
      outcome,
      /More money.*is required to buy these items/,
      'outcome from Joker should throw when trying to buy a ticket for 1 moola',
    );
    const payout = await payoutP;
    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      payout.Items,
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(payout.Money);

    t.ok(
      ticketAmountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #2',
    );
    t.deepEquals(
      jokerMoneyPayoutAmount,
      insufficientAmount,
      'Joker should get a refund after trying to get ticket #2 for 1 moola',
    );
  };

  const bobBuysTicket2And3 = async (
    ticketSalesInstanceHandle,
    moola100Payment,
  ) => {
    const { publicAPI: ticketSalesPublicAPI, terms } = await E(
      zoe,
    ).getInstanceRecord(ticketSalesInstanceHandle);
    const ticketIssuer = await E(ticketSalesPublicAPI).getItemsIssuer();
    const ticketAmountMath = await E(ticketIssuer).getAmountMath();

    const bobPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(bobPurse).deposit(moola100Payment);

    const bobInvite = await E(ticketSalesPublicAPI).makeBuyerInvite();

    const availableTickets = await E(ticketSalesPublicAPI).getAvailableItems();

    // Bob sees the currently available tickets
    t.equal(
      availableTickets.extent.length,
      2,
      'Bob should see 2 available tickets',
    );
    t.ok(
      !availableTickets.extent.find(ticket => ticket.number === 1),
      `availableTickets should NOT contain ticket number 1`,
    );
    t.ok(
      availableTickets.extent.find(ticket => ticket.number === 2),
      `availableTickets should still contain ticket number 2`,
    );
    t.ok(
      availableTickets.extent.find(ticket => ticket.number === 3),
      `availableTickets should still contain ticket number 3`,
    );

    // Bob buys tickets 2 and 3
    const ticket2and3Amount = ticketAmountMath.make(
      harden([
        availableTickets.extent.find(ticket => ticket.number === 2),
        availableTickets.extent.find(ticket => ticket.number === 3),
      ]),
    );

    const totalCost = moola(2 * terms.pricePerItem.extent);

    const bobProposal = harden({
      give: { Money: totalCost },
      want: { Items: ticket2and3Amount },
    });
    const bobPaymentForTicket = await E(bobPurse).withdraw(totalCost);
    const paymentKeywordRecord = harden({
      Money: bobPaymentForTicket,
    });

    const { payout: payoutP } = await E(zoe).offer(
      bobInvite,
      bobProposal,
      paymentKeywordRecord,
    );
    const payout = await payoutP;
    const bobTicketAmount = await E(ticketIssuer).getAmountOf(payout.Items);
    t.equal(
      bobTicketAmount.extent.length,
      2,
      'Bob should have received 2 tickets',
    );
    t.ok(
      bobTicketAmount.extent.find(ticket => ticket.number === 2),
      'Bob should have received tickets #2',
    );
    t.ok(
      bobTicketAmount.extent.find(ticket => ticket.number === 3),
      'Bob should have received tickets #3',
    );
  };

  // === Final Opera part ===
  const ticketSellerClosesContract = async ({
    ticketIssuer,
    ticketSalesPublicAPI,
    payoutP,
    completeObj,
  }) => {
    const availableTickets = await E(ticketSalesPublicAPI).getAvailableItems();
    const ticketAmountMath = await E(ticketIssuer).getAmountMath();
    t.ok(
      ticketAmountMath.isEmpty(availableTickets),
      'All the tickets have been sold',
    );

    const operaPurse = moolaIssuer.makeEmptyPurse();

    await E(completeObj).complete();

    const payout = await payoutP;
    const moneyPayment = await payout.Money;
    await E(operaPurse).deposit(moneyPayment);
    const currentPurseBalance = await E(operaPurse).getCurrentAmount();

    t.equal(
      currentPurseBalance.extent,
      3 * 22,
      `The Opera should get ${3 * 22} moolas from ticket sales`,
    );
  };

  const {
    ticketIssuer,
    ticketSalesInstanceHandle,
    ticketSalesPublicAPI,
    payoutP,
    completeObj,
  } = await mintTickets();
  await aliceBuysTicket1(
    ticketSalesInstanceHandle,
    moolaMint.mintPayment(moola(100)),
  );
  await jokerBuysTicket1(
    ticketSalesInstanceHandle,
    moolaMint.mintPayment(moola(100)),
  );
  await jokerTriesToBuyTicket2(
    ticketSalesInstanceHandle,
    moolaMint.mintPayment(moola(100)),
  );
  await bobBuysTicket2And3(
    ticketSalesInstanceHandle,
    moolaMint.mintPayment(moola(100)),
  );
  await ticketSellerClosesContract({
    ticketIssuer,
    ticketSalesPublicAPI,
    payoutP,
    completeObj,
  });
  t.end();
});
