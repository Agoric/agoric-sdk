/**
 * @file In this file we aim to test auctioneer in an isolated manner. Here's the scenario to test;
 * - Send 100 ATOMs to gov1 from validator
 * - Make sure auctioneer params like ClockStep, StartFrequency are reduced
 * - For book0, ATOM is collateral, set two types of bids; by price and by percentage, user1 is the bidder
 * - Deposit some collateral into book0, gov1 is the depositor
 * - Wait until placed bids get their payouts
 * - Make sure the depositer gets correct amounts
 */

import {
  addPreexistingOracles,
  agd,
  agopsInter,
  agoric,
  ATOM_DENOM,
  bankSend,
  createBid,
  executeOffer,
  getLiveOffers,
  getPriceQuote,
  GOV1ADDR,
  pushPrices,
  USER1ADDR,
  waitForBlock,
} from '@agoric/synthetic-chain';
import '@endo/init';
import test from 'ava';
import { boardSlottingMarshaller, makeFromBoard } from './test-lib/rpc.js';
import {
  retryUntilCondition,
  waitUntilAccountFunded,
  waitUntilOfferResult,
} from './test-lib/sync-tools.js';

const ambientAuthroity = {
  query: agd.query,
  follow: agoric.follow,
  setTimeout: globalThis.setTimeout,
};

const config = {
  price: 9.99,
  bidsSetup: [
    {
      give: '80IST',
      discount: 0.1,
    },
    {
      give: '90IST',
      price: 9.0,
    },
    {
      give: '150IST',
      discount: 0.15,
    },
  ],
  bidsOutcome: [
    {
      payouts: {
        Bid: 0,
        Collateral: 8.897786,
      },
    },
    {
      payouts: {
        Bid: 0,
        Collateral: 10.01001,
      },
    },
    {
      payouts: {
        Bid: 10.46,
        Collateral: 16.432903,
      },
    },
  ],
};

const oraclesByBrand = new Map();

let roundId = 2;

const setupOracles = async t => {
  await addPreexistingOracles('ATOM', oraclesByBrand);

  await pushPrices(9.99, 'ATOM', oraclesByBrand, roundId);
  roundId += 1;
  await retryUntilCondition(
    () => getPriceQuote('ATOM'),
    res => res === '+9990000',
    'error',
    { log: t.log, setTimeout: globalThis.setTimeout },
  );
};

const BID_OFFER_ID = `bid-acceptance-${Date.now()}`;
const DEPOSIT_OFFER_ID = `gov1-deposit-${Date.now()}`;

const createNewBid = async t => {
  await createBid('20', USER1ADDR, BID_OFFER_ID);
  const liveOffers = await getLiveOffers(USER1ADDR);
  t.true(liveOffers[0].includes(BID_OFFER_ID));
};

const getBalance = async (target, addr) => {
  const { balances } = await agd.query('bank', 'balances', addr);
  const { amount } = balances.find(({ denom }) => denom === target);
  return Number(amount);
};

const fundAccts = async (
  depositorAmt = '100000000',
  bidderAmt = '100000000',
) => {
  await Promise.all([
    bankSend(GOV1ADDR, `${depositorAmt}${ATOM_DENOM}`),
    bankSend(USER1ADDR, `${bidderAmt}${ATOM_DENOM}`),
  ]);

  await Promise.all([
    waitUntilAccountFunded(
      GOV1ADDR,
      ambientAuthroity,
      { denom: 'uist', value: Number(depositorAmt) },
      { errorMessage: 'gov1 not funded yet' },
    ),
    waitUntilAccountFunded(
      USER1ADDR,
      ambientAuthroity,
      { denom: ATOM_DENOM, value: Number(bidderAmt) },
      { errorMessage: 'user1 not funded yet' },
    ),
  ]);
};

const bidByPrice = (price, give, offerId) => {
  agopsInter(
    'bid',
    'by-price',
    `--price ${price}`,
    `--give ${give}`,
    '--from',
    USER1ADDR,
    '--keyring-backend test',
    `--offer-id ${offerId}`,
  );

  return waitUntilOfferResult(USER1ADDR, offerId, true, ambientAuthroity, {
    errorMessage: 'bid not settled yet',
    maxRetries: 10,
    retryIntervalMs: 10000,
  });
};

const depositCollateral = async t => {
  const fromBoard = makeFromBoard();
  const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

  const brandsRaw = await agoric.follow(
    '-lF',
    ':published.agoricNames.brand',
    '-o',
    'text',
  );
  const brands = Object.fromEntries(
    marshaller.fromCapData(JSON.parse(brandsRaw)),
  );
  t.log(brands);

  const offerSpec = {
    id: DEPOSIT_OFFER_ID,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['auctioneer'],
      callPipe: [['makeDepositInvitation']],
    },
    proposal: {
      give: {
        Collateral: { brand: brands.ATOM, value: 100_000_000n },
      },
    },
  };

  const spendAction = {
    method: 'executeOffer',
    offer: offerSpec,
  };

  const offer = JSON.stringify(marshaller.toCapData(harden(spendAction)));
  t.log('OFFER', offer);

  executeOffer(GOV1ADDR, offer);
  return waitUntilOfferResult(GOV1ADDR, DEPOSIT_OFFER_ID, true, ambientAuthroity, {
    errorMessage: 'proceeds not distributed yet',
    maxRetries: 10,
    retryIntervalMs: 10000,
  });
};

test.only('run auction', async t => {
  await setupOracles(t);
  await fundAccts();
  const settleBidP = bidByPrice(
    config.bidsSetup[1].price,
    config.bidsSetup[1].give,
    BID_OFFER_ID,
  );
  const proceedsP = depositCollateral(t);

  await Promise.all([settleBidP, proceedsP]);

  const [gov1Results, user1Results] = await Promise.all([
    agoric.follow('-lF', `:published.wallet.${GOV1ADDR}`),
    agoric.follow('-lF', `:published.wallet.${USER1ADDR}`),
  ]);
  t.log('GOV1', gov1Results.status.payouts);
  t.log('USER1', user1Results.status.payouts);
  t.log('DONE!');
  t.pass();
});
