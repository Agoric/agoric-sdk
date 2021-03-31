/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { assert } from '@agoric/assert';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, amountMath } from '@agoric/ertp';
import { looksLikeSetValue } from '@agoric/ertp/src/typeGuards';
import { E } from '@agoric/eventual-send';
import fakeVatAdmin from '../../../src/contractFacet/fakeVatAdmin';

// noinspection ES6PreferShortImport
import { makeZoe } from '../../../src/zoeService/zoe';
import { defaultAcceptanceMsg } from '../../../src/contractSupport';

const mintAndSellNFTRoot = `${__dirname}/../../../src/contracts/mintAndSellNFT`;
const sellItemsRoot = `${__dirname}/../../../src/contracts/sellItems`;

test(`mint and sell tickets for multiple shows`, async t => {
  // Setup initial conditions
  const zoe = makeZoe(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  const mintAndSellNFTInstallation = await E(zoe).install(mintAndSellNFTBundle);

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  const sellItemsInstallation = await E(zoe).install(sellItemsBundle);

  const { issuer: moolaIssuer, brand: moolaBrand } = makeIssuerKit('moola');

  const { creatorFacet: ticketMaker } = await E(zoe).startInstance(
    mintAndSellNFTInstallation,
  );
  const { sellItemsCreatorSeat, sellItemsInstance } = await E(
    ticketMaker,
  ).sellTokens({
    customValueProperties: {
      show: 'Steven Universe, the Opera',
      start: 'Wed, March 25th 2020 at 8pm',
    },
    count: 3,
    moneyIssuer: moolaIssuer,
    sellItemsInstallation,
    pricePerItem: amountMath.make(20n, moolaBrand),
  });
  t.is(
    await sellItemsCreatorSeat.getOfferResult(),
    defaultAcceptanceMsg,
    `escrowTicketsOutcome is default acceptance message`,
  );

  const ticketIssuerP = E(ticketMaker).getIssuer();
  const ticketBrand = await E(ticketIssuerP).getBrand();
  const ticketSalesPublicFacet = await E(zoe).getPublicFacet(sellItemsInstance);
  const ticketsForSale = await E(ticketSalesPublicFacet).getAvailableItems();
  t.deepEqual(
    ticketsForSale,
    {
      brand: ticketBrand,
      value: [
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

  const { sellItemsInstance: sellItemsInstance2 } = await E(
    ticketMaker,
  ).sellTokens({
    customValueProperties: {
      show: 'Reserved for private party',
      start: 'Tues May 12, 2020 at 8pm',
    },
    count: 2,
    moneyIssuer: moolaIssuer,
    sellItemsInstallation,
    pricePerItem: amountMath.make(20n, moolaBrand),
  });
  const sellItemsPublicFacet2 = await E(zoe).getPublicFacet(sellItemsInstance2);
  const ticketsForSale2 = await E(sellItemsPublicFacet2).getAvailableItems();
  t.deepEqual(
    ticketsForSale2,
    {
      brand: ticketBrand,
      value: [
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
    brand: moolaBrand,
  } = makeIssuerKit('moola');

  const moola = value => amountMath.make(value, moolaBrand);

  const zoe = makeZoe(fakeVatAdmin);

  const mintAndSellNFTBundle = await bundleSource(mintAndSellNFTRoot);
  const mintAndSellNFTInstallation = await E(zoe).install(mintAndSellNFTBundle);

  const sellItemsBundle = await bundleSource(sellItemsRoot);
  const sellItemsInstallation = await E(zoe).install(sellItemsBundle);

  // === Initial Opera de Bordeaux part ===

  // create an instance of the venue contract
  const mintTickets = async () => {
    const { creatorFacet: ticketSeller } = await E(zoe).startInstance(
      mintAndSellNFTInstallation,
    );

    const {
      sellItemsCreatorSeat,
      sellItemsCreatorFacet,
      sellItemsPublicFacet,
    } = await E(ticketSeller).sellTokens({
      customValueProperties: {
        show: 'Steven Universe, the Opera',
        start: 'Wed, March 25th 2020 at 8pm',
      },
      count: 3,
      moneyIssuer: moolaIssuer,
      sellItemsInstallation,
      pricePerItem: moola(22),
    });

    const ticketsForSale = await E(sellItemsPublicFacet).getAvailableItems();

    t.is(ticketsForSale.value.length, 3, `3 tickets for sale`);

    return harden({
      sellItemsCreatorSeat,
      sellItemsCreatorFacet,
    });
  };

  // === Alice part ===
  // Alice is given an invitation for the ticket sales instance
  // and she has 100 moola
  const aliceBuysTicket1 = async (invitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const {
      value: [{ instance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(instance);
    const terms = await E(zoe).getTerms(instance);
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const alicePurse = await E(moolaIssuer).makeEmptyPurse();
    await E(alicePurse).deposit(moola100Payment);

    t.deepEqual(terms.pricePerItem, moola(22), `pricePerItem is 22 moola`);

    const availableTickets = await E(
      ticketSalesPublicFacet,
    ).getAvailableItems();

    t.is(
      availableTickets.value.length,
      3,
      'Alice should see 3 available tickets',
    );
    assert(looksLikeSetValue(availableTickets.value));
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 1),
      `availableTickets contains ticket number 1`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 2),
      `availableTickets contains ticket number 2`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 3),
      `availableTickets contains ticket number 3`,
    );

    // find the value corresponding to ticket #1
    const ticket1Value = availableTickets.value.find(
      ticket => ticket.number === 1,
    );
    // make the corresponding amount
    const ticket1Amount = amountMath.make([ticket1Value], ticketBrand);

    const aliceProposal = harden({
      give: { Money: terms.pricePerItem },
      want: { Items: ticket1Amount },
    });

    const alicePaymentForTicket = alicePurse.withdraw(terms.pricePerItem);

    const alicePaymentKeywordRecord = harden({ Money: alicePaymentForTicket });

    const seat = await E(zoe).offer(
      invitation,
      aliceProposal,
      alicePaymentKeywordRecord,
    );

    const offerResult = await E(seat).getOfferResult();
    t.is(
      offerResult,
      'The offer has been accepted. Once the contract has been completed, please check your payout',
    );

    const aliceTickets = seat.getPayout('Items');
    const aliceBoughtTicketAmount = await E(ticketIssuer).getAmountOf(
      aliceTickets,
    );

    t.is(
      aliceBoughtTicketAmount.value[0].show,
      'Steven Universe, the Opera',
      'Alice should have received the ticket for the correct show',
    );
    t.is(
      aliceBoughtTicketAmount.value[0].number,
      1,
      'Alice should have received the ticket for the correct number',
    );
  };

  // === Joker part ===
  // Joker starts with 100 moolas
  // Joker attempts to buy ticket 1 (and should fail)
  const jokerBuysTicket1 = async (untrustedInvitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const { pricePerItem } = await E(zoe).getTerms(ticketSalesInstance);

    // Joker does NOT check available tickets and tries to buy the ticket
    // number 1(already bought by Alice, but he doesn't know)
    const ticket1Amount = amountMath.make(
      [
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 1,
        },
      ],
      ticketBrand,
    );

    const jokerProposal = harden({
      give: { Money: pricePerItem },
      want: { Items: ticket1Amount },
    });

    const jokerPaymentForTicket = jokerPurse.withdraw(pricePerItem);

    const seat = await zoe.offer(
      invitation,
      jokerProposal,
      harden({
        Money: jokerPaymentForTicket,
      }),
    );

    await t.throwsAsync(
      seat.getOfferResult(),
      { message: /Some of the wanted items were not available for sale/ },
      'ticket 1 is no longer available',
    );

    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      seat.getPayout('Items'),
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(
      seat.getPayout('Money'),
    );

    t.truthy(
      amountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #1',
    );
    t.deepEqual(
      jokerMoneyPayoutAmount,
      moola(22),
      'Joker should get a refund after trying to get ticket #1',
    );
  };

  // Joker attempts to buy ticket 2 for 1 moola (and should fail)
  const jokerTriesToBuyTicket2 = async (
    untrustedInvitation,
    moola100Payment,
  ) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const jokerPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(jokerPurse).deposit(moola100Payment);

    const ticket2Amount = amountMath.make(
      [
        {
          show: 'Steven Universe, the Opera',
          start: 'Wed, March 25th 2020 at 8pm',
          number: 2,
        },
      ],
      ticketBrand,
    );

    const insufficientAmount = moola(1);
    const jokerProposal = harden({
      give: { Money: insufficientAmount },
      want: { Items: ticket2Amount },
    });

    const jokerInsufficientPaymentForTicket = jokerPurse.withdraw(
      insufficientAmount,
    );

    const seat = await zoe.offer(
      invitation,
      jokerProposal,
      harden({
        Money: jokerInsufficientPaymentForTicket,
      }),
    );

    await t.throwsAsync(
      seat.getOfferResult(),
      { message: /More money.*is required to buy these items/ },
      'outcome from Joker should throw when trying to buy a ticket for 1 moola',
    );

    const jokerTicketPayoutAmount = await ticketIssuer.getAmountOf(
      seat.getPayout('Items'),
    );
    const jokerMoneyPayoutAmount = await moolaIssuer.getAmountOf(
      seat.getPayout('Money'),
    );

    t.truthy(
      amountMath.isEmpty(jokerTicketPayoutAmount),
      'Joker should not receive ticket #2',
    );
    t.deepEqual(
      jokerMoneyPayoutAmount,
      insufficientAmount,
      'Joker should get a refund after trying to get ticket #2 for 1 moola',
    );
  };

  const bobBuysTicket2And3 = async (untrustedInvitation, moola100Payment) => {
    const invitationIssuer = E(zoe).getInvitationIssuer();
    const invitation = await E(invitationIssuer).claim(untrustedInvitation);
    const {
      value: [{ instance: ticketSalesInstance }],
    } = await E(invitationIssuer).getAmountOf(invitation);
    const ticketSalesPublicFacet = await E(zoe).getPublicFacet(
      ticketSalesInstance,
    );
    const terms = await E(zoe).getTerms(ticketSalesInstance);
    const ticketIssuer = await E(ticketSalesPublicFacet).getItemsIssuer();
    const ticketBrand = await E(ticketIssuer).getBrand();

    const bobPurse = await E(moolaIssuer).makeEmptyPurse();
    await E(bobPurse).deposit(moola100Payment);

    /** @type {Amount} */
    const availableTickets = await E(
      ticketSalesPublicFacet,
    ).getAvailableItems();

    assert(looksLikeSetValue(availableTickets.value));
    // Bob sees the currently available tickets
    t.is(
      availableTickets.value.length,
      2,
      'Bob should see 2 available tickets',
    );
    t.truthy(
      !availableTickets.value.find(ticket => ticket.number === 1),
      `availableTickets should NOT contain ticket number 1`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 2),
      `availableTickets should still contain ticket number 2`,
    );
    t.truthy(
      availableTickets.value.find(ticket => ticket.number === 3),
      `availableTickets should still contain ticket number 3`,
    );

    // Bob buys tickets 2 and 3
    const ticket2and3Amount = amountMath.make(
      [
        availableTickets.value.find(ticket => ticket.number === 2),
        availableTickets.value.find(ticket => ticket.number === 3),
      ],
      ticketBrand,
    );

    const totalCost = moola(2n * terms.pricePerItem.value);

    const bobProposal = harden({
      give: { Money: totalCost },
      want: { Items: ticket2and3Amount },
    });
    const bobPaymentForTicket = await E(bobPurse).withdraw(totalCost);
    const paymentKeywordRecord = harden({
      Money: bobPaymentForTicket,
    });

    const seat = await E(zoe).offer(
      invitation,
      bobProposal,
      paymentKeywordRecord,
    );

    const bobTicketAmount = await E(ticketIssuer).getAmountOf(
      seat.getPayout('Items'),
    );
    t.is(bobTicketAmount.value.length, 2, 'Bob should have received 2 tickets');
    t.truthy(
      bobTicketAmount.value.find(ticket => ticket.number === 2),
      'Bob should have received tickets #2',
    );
    t.truthy(
      bobTicketAmount.value.find(ticket => ticket.number === 3),
      'Bob should have received tickets #3',
    );
  };

  // === Final Opera part ===
  const ticketSellerClosesContract = async sellItemsCreatorSeat => {
    const operaPurse = moolaIssuer.makeEmptyPurse();

    const moneyPayment = await E(sellItemsCreatorSeat).getPayout('Money');
    await E(operaPurse).deposit(moneyPayment);
    const currentPurseBalance = await E(operaPurse).getCurrentAmount();

    t.is(
      currentPurseBalance.value,
      3n * 22n,
      `The Opera should get ${3 * 22} moolas from ticket sales`,
    );
  };

  const { sellItemsCreatorSeat, sellItemsCreatorFacet } = await mintTickets();
  const ticketSalesInvitation1 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await aliceBuysTicket1(
    ticketSalesInvitation1,
    moolaMint.mintPayment(moola(100)),
  );
  const ticketSalesInvitation2 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await jokerBuysTicket1(
    ticketSalesInvitation2,
    moolaMint.mintPayment(moola(100)),
  );
  const ticketSalesInvitation3 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await jokerTriesToBuyTicket2(
    ticketSalesInvitation3,
    moolaMint.mintPayment(moola(100)),
  );
  const ticketSalesInvitation4 = E(sellItemsCreatorFacet).makeBuyerInvitation();
  await bobBuysTicket2And3(
    ticketSalesInvitation4,
    moolaMint.mintPayment(moola(100)),
  );
  await ticketSellerClosesContract(sellItemsCreatorSeat);
});
