import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/zoe/exported.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';

import { setUpZoeForTest, withAmountUtils } from '../supports.js';
import { distributeProportionalShares } from '../../src/auction/auctioneer.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const trace = makeTracer('Test AuctContract', false);

const makeTestContext = async () => {
  const { zoe } = await setUpZoeForTest();

  const currency = withAmountUtils(makeIssuerKit('Currency'));
  const collateral = withAmountUtils(makeIssuerKit('Collateral'));

  trace('makeContext');
  return {
    zoe: await zoe,
    currency,
    collateral,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

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

  const [collateralReturned, currencyReturned] = amountsReturned;
  const fakeCollateralSeat = harden({});
  const fakeCurrencySeat = harden({});
  const fakeReserveSeat = harden({});

  debugger;
  const deposits = [];
  const expectedXfer = [];
  for (let i = 0; i < rawDeposits.length; i += 1) {
    const seat = harden({});
    deposits.push({ seat, amount: collateral.make(rawDeposits[i]) });
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

  const transfers = distributeProportionalShares(
    collateral.make(collateralReturned),
    currency.make(currencyReturned),
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

test('distributeProportionalShares', t => {
  // received 0 Collateral and 20 Currency from the auction to distribute to one
  // vaultManager. Expect the one to get 0 and 20, and no leftovers
  checkProportions(t, [0n, 20n], [100n], [[[0n, 20n]], [0n, 0n]]);
});

test('proportional simple', t => {
  // received 100 Collateral and 2000 Currency from the auction to distribute to
  // two depositors in a ratio of 6:1. expect leftovers
  checkProportions(
    t,
    [100n, 2000n],
    [100n, 600n],
    [
      [
        [14n, 285n],
        [85n, 1714n],
      ],
      [1n, 1n],
    ],
  );
});

test('proportional three way', t => {
  // received 100 Collateral and 2000 Currency from the auction to distribute to
  // three depositors in a ratio of 1:3:1. expect no leftovers
  checkProportions(
    t,
    [100n, 2000n],
    [100n, 300n, 100n],
    [
      [
        [20n, 400n],
        [60n, 1200n],
        [20n, 400n],
      ],
      [0n, 0n],
    ],
  );
});

test('proportional odd ratios, no collateral', t => {
  // received 0 Collateral and 2001 Currency from the auction to distribute to
  // five depositors in a ratio of 20, 36, 17, 83, 42. expect leftovers
  // sum = 198
  checkProportions(
    t,
    [0n, 2001n],
    [20n, 36n, 17n, 83n, 42n],
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
});

test('proportional, no currency', t => {
  // received 0 Collateral and 2001 Currency from the auction to distribute to
  // five depositors in a ratio of 20, 36, 17, 83, 42. expect leftovers
  // sum = 198
  checkProportions(
    t,
    [20n, 0n],
    [20n, 36n, 17n, 83n, 42n],
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
});
