import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { testProp, fc } from '@fast-check/ava';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { mustMatch } from '@endo/patterns';
import {
  depositCalc,
  makeParity,
  withdrawCalc,
  withFees,
} from '../src/pool-share-math.js';
import { makeProposalShapes } from '../src/type-guards.js';

const { add, make, isEmpty, makeEmpty, subtract } = AmountMath;

const issuerKits = {
  PoolShare: makeIssuerKit<'nat'>('PoolShare'),
  USDC: makeIssuerKit<'nat'>('USDC'),
};
const brands = harden({
  PoolShares: issuerKits.PoolShare.brand,
  USDC: issuerKits.USDC.brand,
});
const parity = makeParity(make(brands.USDC, 1n), brands.PoolShares);
const shapes = makeProposalShapes(brands);

test('initial deposit to pool', t => {
  const { PoolShares, USDC } = brands;

  const proposal = harden({
    give: { USDC: make(USDC, 100n) },
    want: { PoolShare: make(PoolShares, 1n) },
  });
  mustMatch(proposal, shapes.deposit);
  const actual = depositCalc(parity, proposal);
  t.deepEqual(actual, {
    payouts: { PoolShare: make(PoolShares, 100n) },
    shareWorth: makeParity(actual.shareWorth.numerator, PoolShares),
  });
});

test('initial withdrawal fails', t => {
  const { PoolShares, USDC } = brands;
  const proposal = harden({
    give: { PoolShare: make(PoolShares, 100n) },
    want: { USDC: make(USDC, 100n) },
  });
  t.throws(() => withdrawCalc(parity, proposal), {
    message: /cannot withdraw/,
  });
});

test('withdrawal after deposit OK', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const pDep = { give: { USDC: make(USDC, 100n) } };
  const { shareWorth: state1 } = depositCalc(state0, pDep);

  const proposal = harden({
    give: { PoolShare: make(PoolShares, 50n) },
    want: { USDC: make(USDC, 50n) },
  });
  mustMatch(proposal, shapes.withdraw);

  const actual = withdrawCalc(state1, proposal);

  t.deepEqual(actual, {
    payouts: { USDC: make(USDC, 50n) },
    shareWorth: {
      numerator: make(USDC, 51n),
      denominator: make(PoolShares, 51n),
    },
  });
});

test('deposit offer underestimates value of share', t => {
  const { PoolShares, USDC } = brands;

  const pDep = { give: { USDC: make(USDC, 100n) } };
  const { shareWorth: state1 } = depositCalc(parity, pDep);
  const state2 = withFees(state1, make(USDC, 20n));

  const proposal = harden({
    give: { USDC: make(USDC, 50n) },
    want: { PoolShare: make(PoolShares, 50n) },
  });
  mustMatch(proposal, shapes.deposit);

  t.throws(() => depositCalc(state2, proposal), {
    message: /cannot pay out/,
  });
});

test('deposit offer overestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const proposal = harden({
    give: { USDC: make(USDC, 10n) },
    want: { PoolShare: make(PoolShares, 8n) },
  });
  mustMatch(proposal, shapes.deposit);

  const actual = depositCalc(state0, proposal);
  t.deepEqual(actual, {
    payouts: { PoolShare: make(PoolShares, 10n) },
    shareWorth: {
      numerator: make(USDC, 11n),
      denominator: make(PoolShares, 11n),
    },
  });
});

test('withdrawal offer underestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const proposal1 = harden({ give: { USDC: make(USDC, 100n) } });
  const { shareWorth: state1 } = depositCalc(state0, proposal1);

  const proposal = harden({
    give: { PoolShare: make(PoolShares, 60n) },
    want: { USDC: make(USDC, 50n) },
  });
  mustMatch(proposal, shapes.withdraw);

  const actual = withdrawCalc(state1, proposal);

  t.deepEqual(actual, {
    payouts: { USDC: make(USDC, 60n) },
    shareWorth: {
      numerator: make(USDC, 41n),
      denominator: make(PoolShares, 41n),
    },
  });
});

test('withdrawal offer overestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const d100 = { give: { USDC: make(USDC, 100n) } };
  const { shareWorth: state1 } = depositCalc(state0, d100);

  const proposal = harden({
    give: { PoolShare: make(PoolShares, 50n) },
    want: { USDC: make(USDC, 60n) },
  });
  mustMatch(proposal, shapes.withdraw);

  t.throws(() => withdrawCalc(state1, proposal), {
    message: /cannot withdraw/,
  });
});

const scaleAmount = (frac: number, amount: Amount<'nat'>) => {
  const asRatio = parseRatio(frac, amount.brand);
  return multiplyBy(amount, asRatio);
};

// ack: https://stackoverflow.com/a/2901298/7963
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

const logAmt = amt => [
  Number(amt.value),
  //   numberWithCommas(Number(amt.value)),
  amt.brand
    .toString()
    .replace(/^\[object Alleged:/, '')
    .replace(/ brand]$/, ''),
];

const arbAmountOf = brand =>
  fc
    .record({
      brand: fc.constant(brand),
      value: fc.bigInt({ min: 1n, max: 1_000n * 1_000_000n }),
    })
    .map(x => harden(x));
const arbUSDC = arbAmountOf(brands.USDC);
const arbShares = arbAmountOf(brands.PoolShares);

const arbShareWorth = fc
  .record({ numerator: arbUSDC, denominator: arbShares })
  .map(x => harden(x));

testProp(
  'deposit properties',
  [arbShareWorth, arbUSDC],
  (t, shareWorth, In) => {
    const actual = depositCalc(shareWorth, { give: { USDC: In } });
    const {
      payouts: { PoolShare },
      shareWorth: post,
    } = actual;
    const { numerator: poolAmount, denominator: sharesOutstanding } = post;
    t.deepEqual(poolAmount, add(shareWorth.numerator, In));
    t.deepEqual(sharesOutstanding, add(shareWorth.denominator, PoolShare));
  },
);

const arbPortion = fc.double({ min: 0.0001, max: 1.0, noNaN: true });
const arbDelta = fc.double({ min: 0.75, max: 1.0, noNaN: true });

testProp(
  'sequence of deposits and withdrawals',
  [
    fc.array(
      fc.record({
        party: fc.nat(7),
        action: fc.oneof(
          fc.record({ In: arbUSDC }),
          fc.record({ Part: arbPortion, Slip: arbDelta }),
        ),
      }),
      { minLength: 3 },
    ),
  ],
  (t, actions) => {
    const { PoolShares, USDC } = brands;
    const emptyShares = makeEmpty(PoolShares);
    const emptyUSDC = makeEmpty(USDC);
    let shareWorth = makeParity(make(USDC, 1n), PoolShares);
    const myDeposits: Record<number, Amount<'nat'>> = {};
    const myShares: Record<number, Amount<'nat'>> = {};

    for (const { party, action } of actions) {
      if ('In' in action) {
        const d = depositCalc(shareWorth, { give: { USDC: action.In } });
        myShares[party] = add(
          myShares[party] || emptyShares,
          d.payouts.PoolShare,
        );
        myDeposits[party] = add(myDeposits[party] || emptyUSDC, action.In);

        const {
          payouts: { PoolShare },
          shareWorth: post,
        } = d;
        const { numerator: poolAmount, denominator: sharesOutstanding } = post;

        t.deepEqual(poolAmount, add(shareWorth.numerator, action.In));
        t.deepEqual(sharesOutstanding, add(shareWorth.denominator, PoolShare));

        shareWorth = post;
      } else if ('Part' in action) {
        if (!myShares[party]) continue;
        const toGive = scaleAmount(action.Part, myShares[party]);
        if (isEmpty(toGive)) continue;
        const toGet = scaleAmount(action.Slip, multiplyBy(toGive, shareWorth));
        const s = withdrawCalc(shareWorth, {
          give: { PoolShare: toGive },
          want: { USDC: toGet },
        });
        myShares[party] = subtract(myShares[party], toGive);
        myDeposits[party] = subtract(myDeposits[party], s.payouts.USDC);
        const { numerator: poolAmount, denominator: sharesOutstanding } =
          s.shareWorth;
        t.deepEqual(poolAmount, subtract(shareWorth.numerator, s.payouts.USDC));
        t.deepEqual(
          sharesOutstanding,
          subtract(shareWorth.denominator, toGive),
        );
        shareWorth = s.shareWorth;
      }
    }

    if (Object.keys(myShares).length === 0) t.pass();

    for (const p of Object.keys(myShares)) {
      const myValue = multiplyBy(myShares[p], shareWorth);
      // t.log(p, ...[myShares[p], myDeposits[p], myValue].map(logAmt).flat());
      t.deepEqual(myValue, myDeposits[p]);
    }

    const allShares = Object.values(myShares).reduce(
      (acc, v) => add(acc, v),
      make(PoolShares, 1n),
    );
    t.deepEqual(allShares, shareWorth.denominator);

    if (actions.length < 14) return;
    t.log(
      actions.length,
      'actions',
      Object.keys(myShares).length,
      'parties:',
      ...logAmt(allShares),
    );
  },
);
