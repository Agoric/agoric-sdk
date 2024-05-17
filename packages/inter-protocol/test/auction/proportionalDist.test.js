import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';

import { withAmountUtils } from '../supports.js';
import { distributeProportionalSharesWithLimits } from '../../src/auction/auctioneer.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const trace = makeTracer('Test AuctContract', false);

const makeTestContext = async () => {
  const bid = withAmountUtils(makeIssuerKit('Bid'));
  const collateral = withAmountUtils(makeIssuerKit('Collateral'));

  trace('makeContext');
  return {
    bid,
    collateral,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 * @param {import('ava').ExecutionContext<
 *   Awaited<ReturnType<makeTestContext>>
 * >} t
 * @param {[collateralReturned: bigint, bidRaise: bigint]} amountsReturned
 * @param {{ deposit: number; goal?: number }[]} rawDeposits
 * @param {[transfers: [bigint, bigint][], leftovers: [bigint, bigint]]} rawExpected
 * @param {string} kwd
 * @see {distributeProportionalSharesWithLimits} for logical cases A-E
 */
const checkProportions = (
  t,
  amountsReturned,
  rawDeposits,
  rawExpected,
  kwd = 'ATOM',
) => {
  const { collateral, bid } = t.context;

  const rawExp = rawExpected[0];
  t.is(rawDeposits.length, rawExp.length);

  const [collateralReturned, bidRaise] = amountsReturned;
  const fakeCollateralSeat = harden({});
  const fakeBidSeat = harden({});
  const fakeReserveSeat = harden({});

  const deposits = [];
  const expectedXfer = [];
  for (let i = 0; i < rawDeposits.length; i += 1) {
    const seat = harden({});
    const { goal } = rawDeposits[i];
    deposits.push({
      seat,
      amount: collateral.make(BigInt(rawDeposits[i].deposit)),
      goal: goal ? bid.make(BigInt(goal)) : null,
    });
    const bidRecord = { Bid: bid.make(rawExp[i][1]) };
    expectedXfer.push([fakeBidSeat, seat, bidRecord]);
    const collateralRecord = { Collateral: collateral.make(rawExp[i][0]) };
    expectedXfer.push([fakeCollateralSeat, seat, collateralRecord]);
  }
  const expectedLeftovers = rawExpected[1];
  const leftoverBid = { Bid: bid.make(expectedLeftovers[1]) };
  expectedXfer.push([fakeBidSeat, fakeReserveSeat, leftoverBid]);
  if (expectedLeftovers[0] > 0n) {
    expectedXfer.push([
      fakeCollateralSeat,
      fakeReserveSeat,
      { Collateral: collateral.make(expectedLeftovers[0]) },
      { [kwd]: collateral.make(expectedLeftovers[0]) },
    ]);
  }

  const transfers = distributeProportionalSharesWithLimits(
    collateral.make(collateralReturned),
    bid.make(bidRaise),
    // @ts-expect-error mocks for test
    deposits,
    fakeCollateralSeat,
    fakeBidSeat,
    'ATOM',
    fakeReserveSeat,
    collateral.brand,
  );

  t.deepEqual(transfers, expectedXfer);
};

// Received 0 Collateral and 20 Bid from the auction to distribute to one
// vaultManager. Expect the one to get 0 and 20, and no leftovers
test(
  'A: distributeProportionalShares',
  checkProportions,
  [0n, 20n],
  [{ deposit: 100 }],
  [[[0n, 20n]], [0n, 0n]],
);

// received 100 Collateral and 2000 Bid from the auction to distribute to
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

// Received 100 Collateral and 2000 Bid from the auction to distribute to
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

// Received 0 Collateral and 2001 Bid from the auction to distribute to
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

// Received 0 Collateral and 2001 Bid from the auction to distribute to
// five depositors in a ratio of 20, 36, 17, 83, 42. expect leftovers
// sum = 198
test(
  'A: proportional, no bid',
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

const transferSharing20 = /** @type {[bigint, bigint][]} */ ([
  [20n, 4n],
  [60n, 12n],
  [20n, 4n],
]);

// bidRaise < proceedsGoal so everyone gets prorated amounts of both
test(
  'B: proportional of 20 limit',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 10_000, goal: 10 },
    { deposit: 30_000, goal: 30 },
    { deposit: 10_000, goal: 10 },
  ],
  [transferSharing20, [0n, 0n]],
);

// A. goal is not in proportion to deposit. Prevented by addAssets. Fallback
// to proportional to deposit.
test(
  'A; goal not proportional to deposits',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 10_000, goal: 9 },
    { deposit: 30_000, goal: 2 },
    { deposit: 10_000, goal: 9 },
  ],
  [transferSharing20, [0n, 0n]],
);

// C if bidRaise matches proceedsGoal, everyone gets the bid they
//   asked for, plus enough collateral to reach the same proportional payout.
test(
  'C: bidRaise matches proceedsGoal, negligible collateral',
  checkProportions,
  [100n, 45n],
  [
    { deposit: 10_000, goal: 9 },
    { deposit: 30_000, goal: 27 },
    { deposit: 10_000, goal: 9 },
  ],
  [
    [
      [0n, 9n],
      [0n, 27n],
      [0n, 9n],
    ],
    [100n, 0n],
  ],
);

// C if bidRaise matches proceedsGoal, everyone gets the bid they
//   asked for, plus enough collateral to reach the same proportional payout.
test(
  'C: bidRaise matches proceedsGoal more collateral',
  checkProportions,
  [100n, 450n],
  [
    { deposit: 100, goal: 90 },
    { deposit: 300, goal: 270 },
    { deposit: 100, goal: 90 },
  ],
  [
    [
      [19n, 90n],
      [59n, 270n],
      [19n, 90n],
    ],
    [3n, 0n],
  ],
);

//   If any depositor's goal limit exceeded their share of the total,
//   we'll fall back to the first approach.
test(
  'C: greedy goal',
  checkProportions,
  [100n, 20n],
  [
    { deposit: 100_000, goal: 9 },
    { deposit: 300_000, goal: 2000 },
    { deposit: 100_000, goal: 9 },
  ],
  [transferSharing20, [0n, 0n]],
);

// D if bidRaise > proceedsGoal && all depositors specified a limit,
//   all depositors get their goal first, then we distribute the
//   remainder (collateral and bid) to get the same proportional payout.
test(
  'D: bidRaise > proceedsGoal && all depositors specified a limit a',
  checkProportions,
  [100n, 200n],
  [
    { deposit: 10_000, goal: 9 },
    { deposit: 30_000, goal: 27 },
    { deposit: 10_000, goal: 9 },
  ],
  // rounding happens because the value of collateral is negligible.
  [
    [
      [20n, 39n],
      [60n, 119n],
      [20n, 39n],
    ],
    [0n, 3n],
  ],
);

// D if bidRaise > proceedsGoal && all depositors specified a limit,
//   all depositors get their goal first, then we distribute the
//   remainder (collateral and bid) to get the same proportional payout.
test(
  'D: bidRaise > proceedsGoal && all depositors specified a limit b',
  checkProportions,
  [100n, 200n],
  [
    { deposit: 10_000, goal: 900 },
    { deposit: 30_000, goal: 2700 },
    { deposit: 10_000, goal: 900 },
  ],
  [
    [
      [20n, 40n],
      [60n, 120n],
      [20n, 40n],
    ],
    [0n, 0n],
  ],
);

// E bidRaise > proceedsGoal && some depositors didn't specify a limit
// if proceedsGoal + value of collateralReturn >= limitedShare then those
// who specified a limit can get all the excess over their limit in
// collateral. Others share whatever is left.
test(
  'E: bidRaise > proceedsGoal && some depositors didn`t specify a limit',
  checkProportions,
  [100n, 2000n],
  [
    { deposit: 10_000, goal: 9 },
    { deposit: 30_000, goal: 27 },
    { deposit: 10_000 },
  ],
  // rounding happens because the value of collateral is negligible.
  [
    [
      [20n, 399n],
      [60n, 1199n],
      [0n, 400n],
    ],
    [20n, 2n],
  ],
);

// E bidRaise > proceedsGoal && some depositors didn't specify a limit
// if proceedsGoal + value of collateralReturn >= limitedShare then those
// who specified a limit can get all the excess over their limit in
// collateral. Others share whatever is left.
test(
  'E: bidRaise > proceedsGoal && some depositors had no limit, enuf collateral returned for those who had',
  checkProportions,
  [1000n, 4000n],
  [
    { deposit: 1000, goal: 900 },
    { deposit: 3000, goal: 2700 },
    { deposit: 1000 },
  ],
  [
    [
      [100n, 900n],
      [300n, 2700n],
      [600n, 400n],
    ],
    [0n, 0n],
  ],
);
