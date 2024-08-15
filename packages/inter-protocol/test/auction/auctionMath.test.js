import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { Far } from '@endo/far';
import { amountsToSettle } from '../../src/auction/auctionMath.js';

/**
 * @import {Amount, Brand} from '@agoric/ertp/src/types.js';
 */

const brand = /** @type {any} */ (Far('fungible brand', {}));

const testAmounts = test.macro(
  /**
   * @type {(
   *   t: import('ava').ExecutionContext<unknown>,
   *   input: any,
   *   output: any,
   * ) => Promise<void>}
   */
  async (
    t,
    { bid, want, avail, price, goal },
    { expected, procTarget, collTarget },
  ) => {
    /** @type {(n: number) => Amount<'nat'>} */
    const amt = n => AmountMath.make(brand, BigInt(n));

    const result = amountsToSettle({
      bidAlloc: amt(bid),
      collateralWanted: amt(want),
      collateralAvailable: amt(avail),
      curAuctionPrice: makeRatioFromAmounts(amt(price[0]), amt(price[1])),
      remainingProceedsGoal: goal ? amt(goal) : null,
    });

    t.deepEqual(result, {
      proceedsExpected: amt(expected),
      proceedsTarget: amt(procTarget),
      collateralTarget: amt(collTarget),
    });
  },
);

// These were observed in other tests
test(
  'observed 1',
  testAmounts,
  { bid: 578, want: 500, avail: 1000, price: [1155, 1000] },
  {
    expected: 578,
    procTarget: 578,
    collTarget: 500,
  },
);

test(
  'observed 2 - with remaining proceeds goal',
  testAmounts,
  { bid: 125, want: 100, avail: 400, price: [525, 1000], goal: 200 },
  {
    expected: 53,
    procTarget: 53,
    collTarget: 100,
  },
);

test(
  'observed 3',
  testAmounts,
  { bid: 231, want: 200, avail: 1000, price: [1155, 1000] },
  {
    expected: 231,
    procTarget: 231,
    collTarget: 200,
  },
);

test(
  'observed 4',
  testAmounts,
  { bid: 232, want: 200, avail: 100, price: [1155, 1000] },
  {
    expected: 116,
    procTarget: 116,
    collTarget: 100,
  },
);

test(
  'observed 5',
  testAmounts,
  { bid: 19, want: 300, avail: 300, price: [625, 10000] },
  {
    expected: 19,
    procTarget: 19,
    collTarget: 300,
  },
);

test(
  'observed 6',
  testAmounts,
  { bid: 23, want: 200, avail: 500, price: [1125, 10000] },
  {
    expected: 23,
    procTarget: 23,
    collTarget: 200,
  },
);

test(
  'observed 7',
  testAmounts,
  { bid: 500, want: 2000, avail: 717, price: [715, 1000] },
  {
    expected: 513,
    procTarget: 500,
    collTarget: 699,
  },
);

test(
  'observed 8',
  testAmounts,
  { bid: 240, want: 200, avail: 20, price: [1155, 1000] },
  {
    expected: 24,
    procTarget: 24,
    collTarget: 20,
  },
);

test(
  'observed 9',
  testAmounts,
  { bid: 2000, want: 200, avail: 1000, price: [1155, 1000] },
  {
    expected: 231,
    procTarget: 231,
    collTarget: 200,
  },
);

test(
  'observed 10',
  testAmounts,
  { bid: 2240, want: 200, avail: 1000, price: [1155, 1000] },
  {
    expected: 231,
    procTarget: 231,
    collTarget: 200,
  },
);

test(
  'want exceeeds avail',
  testAmounts,
  { bid: 2000, want: 2000, avail: 1000, price: [1, 1] },
  {
    expected: 1000,
    procTarget: 1000,
    collTarget: 1000,
  },
);

test(
  'want exceeeds avail at half price',
  testAmounts,
  { bid: 1999, want: 2000, avail: 1000, price: [201, 1] },
  {
    expected: 201000,
    procTarget: 1999,
    collTarget: 9,
  },
);
test(
  'want exceeeds avail at half price with goal',
  testAmounts,
  { bid: 1999, want: 2000, avail: 1000, price: [201, 1], goal: 301 },
  {
    expected: 201000,
    procTarget: 301,
    collTarget: 1,
  },
);

test(
  'observed in production',
  testAmounts,
  {
    bid: 3000,
    want: 2000,
    avail: 1000,
    price: [4914, 10000], // "currentPriceLevel": "0.4914 IST/stOSMO",
    goal: 1254_886835, // "remainingProceedsGoal": "1254.886835 IST",
  },
  {
    expected: 492,
    procTarget: 492,
    collTarget: 1000,
  },
);
