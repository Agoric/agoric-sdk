/**
 * @file In this file we aim to test auctioneer in an isolated manner. Here's the scenario to test;
 *
 * - Prerequisites: In one of the earlier proposal(n:upgrade-next), a user called "long-living-bidder"
 *   has placed a bid where { give: 80IST, price: 49.0 }
 * - Push price so that 1 ATOM is 50 ISTs
 * - Wait until the auctioneer captures the price we just pushed
 * - Fund actors
 *  - gov1 gets 100 ATOMs
 *  - user1 gets 90 ISTs
 *  - gov3 gets 150 ISTs
 * - Place bids for user1 and gov3 following the values in "config"
 * - Deposit 100 ATOMs into book0, gov1 is the depositor
 * - Wait until placed bids get their payouts
 * - Wait until proceeds are distributed to the depositor
 * - Make sure all actors receive the correct payouts
 */

// Typo will be fixed with https://github.com/Agoric/agoric-sdk/pull/10171
/** @typedef {import('./test-lib/sync-tools.js').RetyrOptions} RetryOptions */

import {
  agd,
  agoric,
  getUser,
  GOV1ADDR,
  GOV3ADDR,
  USER1ADDR,
} from '@agoric/synthetic-chain';
import '@endo/init';
import test from 'ava';
import { boardSlottingMarshaller, makeFromBoard } from './test-lib/rpc.js';
import { retryUntilCondition } from './test-lib/sync-tools.js';
import {
  calculateRetryUntilNextStartTime,
  checkBidsOutcome,
  checkDepositOutcome,
  checkPrice,
  depositCollateral,
  fundAccts,
  getCapturedPrice,
  placeBids,
  pushPricesForAuction,
  scale6,
} from './test-lib/auction-lib.js';

const ambientAuthority = {
  query: agd.query,
  follow: agoric.follow,
  setTimeout: globalThis.setTimeout,
};

const fromBoard = makeFromBoard();
const marshaller = boardSlottingMarshaller(fromBoard.convertSlotToVal);

const config = {
  depositor: {
    name: 'gov1',
    addr: GOV1ADDR,
    depositValue: '100000000',
    offerId: `gov1-deposit-${Date.now()}`,
  },
  price: 50.0,
  longLivingBidSetup: {
    name: 'long-living-bidder',
    // This bid is placed in an earlier proposal
    give: '80IST',
  },
  currentBidsSetup: {
    user1: {
      bidder: USER1ADDR,
      bidderFund: {
        value: 90000000,
        denom: 'uist',
      },
      offerId: `user1-bid-${Date.now()}`,
      give: '90IST',
      price: 46,
    },
    gov3: {
      bidder: GOV3ADDR,
      bidderFund: {
        value: 150000000,
        denom: 'uist',
      },
      offerId: `gov3-bid-${Date.now()}`,
      give: '150IST',
      discount: '13',
    },
  },
  bidsOutcome: {
    longLivingBidder: {
      payouts: {
        Bid: 0,
        Collateral: 1.68421,
      },
    },
    user1: {
      payouts: {
        Bid: 0,
        Collateral: 2.0,
      },
    },
    gov3: {
      payouts: {
        Bid: 0,
        Collateral: 3.448275,
      },
    },
  },
};

test.before(async t => {
  /** @type {RetryOptions} */
  const pushPriceRetryOpts = {
    maxRetries: 5, // arbitrary
    retryIntervalMs: 5000, // in ms
  };

  /** @type {RetryOptions} */
  const bankSendRetryOpts = {
    maxRetries: 3, // arbitrary
    retryIntervalMs: 3000, // in ms
  };

  // Get current round id
  const round = await agoric.follow(
    '-lF',
    ':published.priceFeed.ATOM-USD_price_feed.latestRound',
  );
  t.context = {
    roundId: parseInt(round.roundId),
    retryOpts: {
      bankSendRetryOpts,
      pushPriceRetryOpts,
    },
  };
});

test('run auction', async t => {
  // Push the price to a point where only our bids can settle
  await pushPricesForAuction(t, config.price);

  // Wait until next round starts. Retry error message is useful for debugging
  const retryOptions = await calculateRetryUntilNextStartTime();
  await retryUntilCondition(
    () => getCapturedPrice('book0'),
    res => checkPrice(res, scale6(config.price).toString()), // scale price to uist
    'price not captured yet [AUCTION TEST]',
    {
      log: t.log,
      ...ambientAuthority,
      ...retryOptions,
    },
  );

  // Make sure depositor and bidders have enough balance
  await fundAccts(t, config.depositor, config.currentBidsSetup);
  const bidsP = placeBids(t, config.currentBidsSetup);
  const proceedsP = depositCollateral(t, config.depositor);

  // Resolves when auction finalizes and depositor gets payouts
  const [longLivingBidderAddr] = await Promise.all([
    getUser(config.longLivingBidSetup.name),
    ...bidsP,
    proceedsP,
  ]);

  // Query wallets of the actors involved for assertions
  const [gov1Results, longLivingBidResults, user1Results, gov3Results, brands] =
    await Promise.all([
      agoric
        .follow(
          '-lF',
          `:published.wallet.${config.depositor.addr}`,
          '-o',
          'text',
        )
        .then(res => marshaller.fromCapData(JSON.parse(res))),
      agoric
        .follow(
          '-lF',
          `:published.wallet.${longLivingBidderAddr}`,
          '-o',
          'text',
        )
        .then(res => marshaller.fromCapData(JSON.parse(res))),
      agoric
        .follow('-lF', `:published.wallet.${USER1ADDR}`, '-o', 'text')
        .then(res => marshaller.fromCapData(JSON.parse(res))),
      agoric
        .follow('-lF', `:published.wallet.${GOV3ADDR}`, '-o', 'text')
        .then(res => marshaller.fromCapData(JSON.parse(res))),
      agoric
        .follow('-lF', ':published.agoricNames.brand', '-o', 'text')
        .then(res =>
          Object.fromEntries(marshaller.fromCapData(JSON.parse(res))),
        ),
    ]);

  // Assert depositor paid correctly
  checkDepositOutcome(t, gov1Results.status.payouts, config, brands);

  // Assert bidders paid correctly
  checkBidsOutcome(
    t,
    {
      'longLivingBidder.results': longLivingBidResults,
      'user1.results': user1Results,
      'gov3.results': gov3Results,
    },
    config.bidsOutcome,
    brands,
  );
});
