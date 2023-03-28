import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';

import { withAmountUtils } from '../supports.js';
import { distributeProportionalSharesWithLimits } from '../../src/auction/auctioneer.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const trace = makeTracer('Test AuctContract', false);

const makeTestContext = async () => {
  const currency = withAmountUtils(makeIssuerKit('Currency'));
  const collateral = withAmountUtils(makeIssuerKit('Collateral'));

  trace('makeContext');
  return {
    currency,
    collateral,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 * @see {distributeProportionalSharesWithLimits} for logical cases A-E
 *
 * @param {import('ava').ExecutionContext<Awaited<ReturnType<makeTestContext>>>} t
 * @param {[collateralReturned: bigint, currencyRaise: bigint]} amountsReturned
 * @param {Array<{deposit: number, collect?: number}>} rawDeposits
 * @param {[transfers: Array<[bigint, bigint]>, leftovers: [bigint, bigint]]} rawExpected
 * @param {string} kwd
 */
const checkProportions = (
  t,
  amountsReturned,
  rawDeposits,
  rawExpected,
  kwd = 'ATOM',
) => {
  const { collateral, currency } = t.context;

  const rawExp = rawExpected[0];
  t.is(rawDeposits.length, rawExp.length);

  const [collateralReturned, currencyRaise] = amountsReturned;
  const fakeCollateralSeat = harden({});
  const fakeCurrencySeat = harden({});
  const fakeReserveSeat = harden({});

  const deposits = [];
  const expectedXfer = [];
  for (let i = 0; i < rawDeposits.length; i += 1) {
    const seat = harden({});
    const { collect } = rawDeposits[i];
    deposits.push({
      seat,
      amount: collateral.make(BigInt(rawDeposits[i].deposit)),
      toRaise: collect ? currency.make(BigInt(collect)) : undefined,
    });
    const currencyRecord = { Currency: currency.make(rawExp[i][1]) };
    expectedXfer.push([fakeCurrencySeat, seat, currencyRecord]);
    const collateralRecord = { Collateral: collateral.make(rawExp[i][0]) };
    expectedXfer.push([fakeCollateralSeat, seat, collateralRecord]);
  }
  const expectedLeftovers = rawExpected[1];
  const leftoverCurrency = { Currency: currency.make(expectedLeftovers[1]) };
  expectedXfer.push([fakeCurrencySeat, fakeReserveSeat, leftoverCurrency]);
  expectedXfer.push([
    fakeCollateralSeat,
    fakeReserveSeat,
    { Collateral: collateral.make(expectedLeftovers[0]) },
    { [kwd]: collateral.make(expectedLeftovers[0]) },
  ]);

  const transfers = distributeProportionalSharesWithLimits(
    collateral.make(collateralReturned),
    currency.make(currencyRaise),
    // @ts-expect-error mocks for test
    deposits,
    fakeCollateralSeat,
    fakeCurrencySeat,
    'ATOM',
    fakeReserveSeat,
    collateral.brand,
  );

  t.deepEqual(transfers, expectedXfer);
};

// Received 0 Collateral and 20 Currency from the auction to distribute to one
// vaultManager. Expect the one to get 0 and 20, and no leftovers
test(
  'A: distributeProportionalShares',
  checkProportions,
  [0n, 20n],
  [{ deposit: 100 }],
  [[[0n, 20n]], [0n, 0n]],
);

// received 100 Collateral and 2000 Currency from the auction to distribute to
// two depositors in a ratio of 6:1. expect leftovers
test(
  'A: proportional simple',
  checkProportions,
  [100n, 2000n],
  [{ deposit: 100 }, { deposit: 600 }],
  [
    [
      [14n, 285n],
      [85n, 1714n],
    ],
    [1n, 1n],
  ],
);

// Received 100 Collateral and 2000 Currency from the auction to distribute to
// three depositors in a ratio of 1:3:1. expect no leftovers
test(
  'A: proportional three way',
  checkProportions,
  [100n, 2000n],
  [{ deposit: 100 }, { deposit: 300 }, { deposit: 100 }],
  [
    [
      [20n, 400n],
      [60n, 1200n],
      [20n, 400n],
    ],
    [0n, 0n],
  ],
);

// Received 0 Collateral and 2001 Currency from the auction to distribute to
// five depositors in a ratio of 20, 36, 17, 83, 42. expect leftovers
// sum = 198
test(
  'A: proportional odd ratios, no collateral',
  checkProportions,
  [0n, 2001n],
  [
    { deposit: 20 },
    { deposit: 36 },
    { deposit: 17 },
    { deposit: 83 },
    { deposit: 42 },
  ],
  [
    [
      [0n, 202n],
      [0n, 363n],
      [0n, 171n],
      [0n, 838n],
      [0n, 424n],
    ],
    [0n, 3n],
  ],
);

// Received 0 Collateral and 2001 Currency from the auction to distribute to
// five depositors in a ratio of 20, 36, 17, 83, 42. expect leftovers
// sum = 198
test(
  'A: proportional, no currency',
  checkProportions,
  [20n, 0n],
  [
    { deposit: 20 },
    { deposit: 36 },
    { deposit: 17 },
    { deposit: 83 },
    { deposit: 42 },
  ],
  [
    [
      [2n, 0n],
      [3n, 0n],
      [1n, 0n],
      [8n, 0n],
      [4n, 0n],
    ],
    [2n, 0n],
  ],
);

const transferSharing20 = /** @type {Array<[bigint, bigint]>} */ ([
  [20n, 4n],
  [60n, 12n],
  [20n, 4n],
]);
const transferSharing45 = /** @type {Array<[bigint, bigint]>} */ ([
  [0n, 9n],
  [0n, 27n],
  [0n, 9n],
]);
const transferSharing450 = /** @type {Array<[bigint, bigint]>} */ ([
  [19n, 90n],
  [59n, 270n],
  [19n, 90n],
]);

// currencyRaise < totalToRaise so everyone gets prorated amounts of both
test(
  'B: proportional of 20 limit',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 10_000, collect: 10 },
    { deposit: 30_000, collect: 30 },
    { deposit: 10_000, collect: 10 },
  ],
  [transferSharing20, [0n, 0n]],
);

// A. toRaise is not in proportion to deposit. Prevented by addAssets. Fallback
// to proportional to deposit.
test(
  'A; toRaise not proportional to deposits',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 10_000, collect: 9 },
    { deposit: 30_000, collect: 2 },
    { deposit: 10_000, collect: 9 },
  ],
  [transferSharing20, [0n, 0n]],
);

// C if currencyRaise matches totalToRaise, everyone gets the currency they
//   asked for, plus enough collateral to reach the same proportional payout.
test(
  'C: currencyRaise matches totalToRaise, negligible collateral',
  checkProportions,
  [100n, 45n],
  [
    { deposit: 10_000, collect: 9 },
    { deposit: 30_000, collect: 27 },
    { deposit: 10_000, collect: 9 },
  ],
  [transferSharing45, [100n, 0n]],
);

// C if currencyRaise matches totalToRaise, everyone gets the currency they
//   asked for, plus enough collateral to reach the same proportional payout.
test(
  'C: currencyRaise matches totalToRaise more collateral',
  checkProportions,
  [100n, 450n],
  [
    { deposit: 100, collect: 90 },
    { deposit: 300, collect: 270 },
    { deposit: 100, collect: 90 },
  ],
  [transferSharing450, [3n, 0n]],
);

//   If any depositor's toRaise limit exceeded their share of the total,
//   we'll fall back to the first approach.
test(
  'C: greedy toRaise',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 100_000, collect: 9 },
    { deposit: 300_000, collect: 2000 },
    { deposit: 100_000, collect: 9 },
  ],
  [transferSharing20, [0n, 0n]],
);

// rounding happens because the value of collateral is negligible.
const transferSharing200 = /** @type {Array<[bigint, bigint]>} */ ([
  [20n, 39n],
  [60n, 119n],
  [20n, 39n],
]);
// D if currencyRaise > totalToRaise && all depositors specified a limit,
//   all depositors get their toRaise first, then we distribute the
//   remainder (collateral and currency) to get the same proportional payout.
test(
  'D: currencyRaise > totalToRaise && all depositors specified a limit a',
  checkProportions,
  [100n, 200n],
  [
    { deposit: 10_000, collect: 9 },
    { deposit: 30_000, collect: 27 },
    { deposit: 10_000, collect: 9 },
  ],
  [transferSharing200, [0n, 3n]],
);

const transferSharing200a = /** @type {Array<[bigint, bigint]>} */ ([
  [20n, 40n],
  [60n, 120n],
  [20n, 40n],
]);
// D if currencyRaise > totalToRaise && all depositors specified a limit,
//   all depositors get their toRaise first, then we distribute the
//   remainder (collateral and currency) to get the same proportional payout.
test(
  'D: currencyRaise > totalToRaise && all depositors specified a limit b',
  checkProportions,
  [100n, 200n],
  [
    { deposit: 10_000, collect: 900 },
    { deposit: 30_000, collect: 2700 },
    { deposit: 10_000, collect: 900 },
  ],
  [transferSharing200a, [0n, 0n]],
);

// rounding happens because the value of collateral is negligible.
const transferSharing2000 = /** @type {Array<[bigint, bigint]>} */ ([
  [20n, 399n],
  [60n, 1199n],
  [0n, 400n],
]);
// E currencyRaise > totalToRaise && some depositors didn't specify a limit
// if totalToRaise + value of collateralReturn >= limitedShare then those
// who specified a limit can get all the excess over their limit in
// collateral. Others share whatever is left.
test(
  'E: currencyRaise > totalToRaise && some depositors didn`t specify a limit',
  checkProportions,
  [100n, 2000n],
  [
    { deposit: 10_000, collect: 9 },
    { deposit: 30_000, collect: 27 },
    { deposit: 10_000 },
  ],
  [transferSharing2000, [20n, 2n]],
);

const transferSharing2000b = /** @type {Array<[bigint, bigint]>} */ ([
  [100n, 900n],
  [300n, 2700n],
  [600n, 400n],
]);
// E currencyRaise > totalToRaise && some depositors didn't specify a limit
// if totalToRaise + value of collateralReturn >= limitedShare then those
// who specified a limit can get all the excess over their limit in
// collateral. Others share whatever is left.
test(
  'E: currencyRaise > totalToRaise && some depositors had no limit, enuf collateral returned for those who had',
  checkProportions,
  [1000n, 4000n],
  [
    { deposit: 1000, collect: 900 },
    { deposit: 3000, collect: 2700 },
    { deposit: 1000 },
  ],
  [transferSharing2000b, [0n, 0n]],
);
