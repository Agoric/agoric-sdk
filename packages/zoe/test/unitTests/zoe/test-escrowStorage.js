// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';

import { E } from '@agoric/eventual-send';
import { makeEscrowStorage } from '../../../src/zoeService/escrowStorage.js';
import {
  assertAmountsEqual,
  assertPayoutAmount,
} from '../../zoeTestHelpers.js';

test('makeEscrowStorage', async t => {
  const { createPurse, makeLocalPurse, withdrawPayments, depositPayments } =
    makeEscrowStorage();

  const currencyKit = makeIssuerKit(
    'currency',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  await createPurse(currencyKit.issuer, currencyKit.brand);

  // Normally only used for ZCFMint issuers
  makeLocalPurse(ticketKit.issuer, ticketKit.brand);

  const gameTicketAmount = AmountMath.make(
    ticketKit.brand,
    harden([{ show: 'superbowl' }]),
  );

  const currencyAmount = AmountMath.make(currencyKit.brand, 5n * 10n ** 18n);

  const wantedConcertTicketAmount = AmountMath.make(
    ticketKit.brand,
    harden([{ show: 'my show' }]),
  );

  const paymentPKeywordRecord = harden({
    GameTicket: E(ticketKit.mint).mintPayment(gameTicketAmount),
    Money: E(currencyKit.mint).mintPayment(currencyAmount),
  });

  const proposal = harden({
    want: {
      ConcertTicket: wantedConcertTicketAmount,
    },
    give: {
      GameTicket: gameTicketAmount,
      Money: currencyAmount,
    },
    exit: {
      onDemand: null,
    },
  });

  const initialAllocation = await depositPayments(
    proposal,
    paymentPKeywordRecord,
  );

  const emptyConcertTicket = AmountMath.makeEmptyFromAmount(
    wantedConcertTicketAmount,
  );

  t.deepEqual(initialAllocation, {
    ConcertTicket: emptyConcertTicket,
    GameTicket: gameTicketAmount,
    Money: currencyAmount,
  });

  const payout = withdrawPayments(initialAllocation);

  await assertPayoutAmount(
    t,
    ticketKit.issuer,
    payout.ConcertTicket,
    emptyConcertTicket,
  );

  await assertPayoutAmount(
    t,
    ticketKit.issuer,
    payout.GameTicket,
    gameTicketAmount,
  );

  await assertPayoutAmount(t, currencyKit.issuer, payout.Money, currencyAmount);

  const initialAllocation2 = await depositPayments(proposal, {
    GameTicket: payout.GameTicket,
    Money: payout.Money,
  });

  Object.entries(initialAllocation).forEach(([keyword, amount]) => {
    assertAmountsEqual(t, amount, initialAllocation2[keyword]);
  });

  Object.entries(initialAllocation2).forEach(([keyword, amount]) => {
    assertAmountsEqual(t, amount, initialAllocation[keyword]);
  });
});

const setupPurses = async createPurse => {
  const currencyKit = makeIssuerKit(
    'currency',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  /** @type {IssuerRecord} */
  const currencyIssuerRecord = {
    issuer: currencyKit.issuer,
    assetKind: AssetKind.NAT,
    brand: currencyKit.brand,
  };

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  const ticketIssuerRecord = {
    issuer: ticketKit.issuer,
    assetKind: AssetKind.SET,
    brand: ticketKit.brand,
  };
  await createPurse(currencyIssuerRecord.issuer, currencyIssuerRecord.brand);
  await createPurse(ticketIssuerRecord.issuer, ticketIssuerRecord.brand);
  return harden({ ticketKit, currencyKit });
};

test('payments without matching give keywords', async t => {
  const { createPurse, depositPayments } = makeEscrowStorage();

  const { ticketKit, currencyKit } = await setupPurses(createPurse);

  const gameTicketAmount = AmountMath.make(
    ticketKit.brand,
    harden([{ show: 'superbowl' }]),
  );

  const currencyAmount = AmountMath.make(currencyKit.brand, 5n * 10n ** 18n);

  const paymentPKeywordRecord = harden({
    GameTicket: E(ticketKit.mint).mintPayment(gameTicketAmount),
    Money: E(currencyKit.mint).mintPayment(currencyAmount),
    Moola: E(currencyKit.mint).mintPayment(currencyAmount),
  });

  const proposal = harden({
    want: {},
    give: {
      GameTicket: gameTicketAmount,
      Money: currencyAmount,
    },
    exit: {
      onDemand: null,
    },
  });

  await t.throwsAsync(() => depositPayments(proposal, paymentPKeywordRecord), {
    message:
      'The "Moola" keyword in the paymentKeywordRecord was not a keyword in proposal.give, which had keywords: ["GameTicket","Money"]',
  });
});

test(`give keywords without matching payments`, async t => {
  const { createPurse, depositPayments } = makeEscrowStorage();

  const { ticketKit, currencyKit } = await setupPurses(createPurse);

  const gameTicketAmount = AmountMath.make(
    ticketKit.brand,
    harden([{ show: 'superbowl' }]),
  );

  const currencyAmount = AmountMath.make(currencyKit.brand, 5n * 10n ** 18n);

  const paymentPKeywordRecord = harden({
    GameTicket: E(ticketKit.mint).mintPayment(gameTicketAmount),
  });

  const proposal = harden({
    want: {},
    give: {
      GameTicket: gameTicketAmount,
      Money: currencyAmount,
    },
    exit: {
      onDemand: null,
    },
  });

  await t.throwsAsync(() => depositPayments(proposal, paymentPKeywordRecord), {
    message:
      'The "Money" keyword in proposal.give did not have an associated payment in the paymentKeywordRecord, which had keywords: ["GameTicket"]',
  });
});
