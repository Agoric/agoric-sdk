import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { testProp, fc } from '@fast-check/ava';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { mustMatch } from '@endo/patterns';
import {
  deposit,
  makeParity,
  withdraw,
  withFees,
} from '../src/pool-share-math.js';
import { makeProposalShapes } from '../src/type-guards.js';

const { add, make, isEmpty, makeEmpty, subtract } = AmountMath;

const psKit = makeIssuerKit<'nat'>('PoolShare');
const usdcKit = makeIssuerKit<'nat'>('USDC');
const brands = harden({ PoolShares: psKit.brand, USDC: usdcKit.brand });
const shapes = makeProposalShapes(brands);

test('initial deposit to pool', t => {
  const { PoolShares, USDC } = brands;
  const parity = makeParity(make(USDC, 1n), PoolShares);

  const proposal = harden({
    give: { ToPool: make(USDC, 100n) },
    want: { Shares: make(PoolShares, 1n) },
  });
  mustMatch(proposal, shapes.deposit);
  const actual = deposit(parity, proposal.give.ToPool);
  t.deepEqual(actual, {
    Shares: make(PoolShares, 100n),
    shareWorth: makeParity(actual.shareWorth.numerator, PoolShares),
  });
});

test('initial withdrawal fails', t => {
  const { PoolShares, USDC } = brands;
  const parity = makeParity(make(USDC, 1n), PoolShares);
  t.throws(() => withdraw(parity, make(PoolShares, 100n), make(USDC, 100n)), {
    message: /cannot withdraw/,
  });
});

test('withdrawal after deposit OK', t => {
  const { brand: PoolShares } = psKit;
  const { brand: USDC } = usdcKit;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const { shareWorth: state1 } = deposit(state0, make(USDC, 100n));

  const proposal = harden({
    give: { Shares: make(PoolShares, 50n) },
    want: { FromPool: make(USDC, 50n) },
  });
  mustMatch(proposal, shapes.withdraw);

  const actual = withdraw(state1, proposal.give.Shares, proposal.want.FromPool);

  t.deepEqual(actual, {
    FromPool: make(USDC, 50n),
    shareWorth: {
      numerator: make(USDC, 51n),
      denominator: make(PoolShares, 51n),
    },
  });
});

test('deposit offer underestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const { shareWorth: state1 } = deposit(state0, make(USDC, 100n));
  const state2 = withFees(state1, make(USDC, 20n));

  const proposal = harden({
    give: { ToPool: make(USDC, 50n) },
    want: { Shares: make(PoolShares, 50n) },
  });
  mustMatch(proposal, shapes.deposit);

  const actual = deposit(state2, proposal.give.ToPool);

  t.deepEqual(actual, {
    Shares: make(PoolShares, 42n),
    shareWorth: {
      numerator: make(USDC, 171n),
      denominator: make(PoolShares, 143n),
    },
  });
});

test('deposit offer overestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const proposal = harden({
    give: { ToPool: make(USDC, 10n) },
    want: { Shares: make(PoolShares, 20n) },
  });
  mustMatch(proposal, shapes.deposit);

  t.throws(() => deposit(state0, proposal.give.ToPool, proposal.want.Shares), {
    message: /cannot pay out/,
  });
});

test('withdrawal offer underestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const { shareWorth: state1 } = deposit(state0, make(USDC, 100n));

  const proposal = harden({
    give: { Shares: make(PoolShares, 60n) },
    want: { FromPool: make(USDC, 50n) },
  });
  mustMatch(proposal, shapes.withdraw);

  const actual = withdraw(state1, proposal.give.Shares, proposal.want.FromPool);

  t.deepEqual(actual, {
    FromPool: make(USDC, 60n),
    shareWorth: {
      numerator: make(USDC, 41n),
      denominator: make(PoolShares, 41n),
    },
  });
});

test('withdrawal offer overestimates value of share', t => {
  const { PoolShares, USDC } = brands;
  const state0 = makeParity(make(USDC, 1n), PoolShares);

  const { shareWorth: state1 } = deposit(state0, make(USDC, 100n));

  const proposal = harden({
    give: { Shares: make(PoolShares, 50n) },
    want: { FromPool: make(USDC, 60n) },
  });
  mustMatch(proposal, shapes.withdraw);

  t.throws(
    () => withdraw(state1, proposal.give.Shares, proposal.want.FromPool),
    { message: /cannot withdraw/ },
  );
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
const arbUSDC = arbAmountOf(usdcKit.brand);
const arbShares = arbAmountOf(psKit.brand);

const arbShareWorth = fc
  .record({ numerator: arbUSDC, denominator: arbShares })
  .map(x => harden(x));

testProp(
  'deposit properties',
  [arbShareWorth, arbUSDC],
  (t, shareWorth, In) => {
    const actual = deposit(shareWorth, In);
    const { Shares, shareWorth: post } = actual;
    const { numerator: poolAmount, denominator: sharesOutstanding } = post;
    t.deepEqual(poolAmount, add(shareWorth.numerator, In));
    t.deepEqual(sharesOutstanding, add(shareWorth.denominator, Shares));
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
        const d = deposit(shareWorth, action.In);
        myShares[party] = add(myShares[party] || emptyShares, d.Shares);
        myDeposits[party] = add(myDeposits[party] || emptyUSDC, action.In);

        const { Shares, shareWorth: post } = d;
        const { numerator: poolAmount, denominator: sharesOutstanding } = post;

        t.deepEqual(poolAmount, add(shareWorth.numerator, action.In));
        t.deepEqual(sharesOutstanding, add(shareWorth.denominator, Shares));

        shareWorth = post;
      } else if ('Part' in action) {
        if (!myShares[party]) continue;
        const toGive = scaleAmount(action.Part, myShares[party]);
        if (isEmpty(toGive)) continue;
        const toGet = scaleAmount(action.Slip, multiplyBy(toGive, shareWorth));
        const s = withdraw(shareWorth, toGive, toGet);
        myShares[party] = subtract(myShares[party], toGive);
        myDeposits[party] = subtract(myDeposits[party], s.FromPool);
        const { numerator: poolAmount, denominator: sharesOutstanding } =
          s.shareWorth;
        t.deepEqual(poolAmount, subtract(shareWorth.numerator, s.FromPool));
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
