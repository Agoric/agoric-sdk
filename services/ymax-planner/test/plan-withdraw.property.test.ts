import { testProp, fc } from '@fast-check/ava';
import test from 'ava';

import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/pass-style';
import {
  computeWeightedTargets,
  planWithdrawFromAllocations,
} from '../src/plan-deposit.ts';
import { mockGasEstimator } from './mocks.ts';

const depositBrand = Far('mock brand') as Brand<'nat'>;
const feeBrand = Far('fee brand (BLD)') as Brand<'nat'>;
const makeDeposit = (value: bigint) => AmountMath.make(depositBrand, value);

const withdrawCase = fc
  .record({
    USDN: fc.nat({ max: 5_000 }),
    Aave_Arbitrum: fc.nat({ max: 5_000 }),
    Compound_Base: fc.nat({ max: 5_000 }),
  })
  .filter(record => Object.values(record).some(v => v > 0))
  .chain(record => {
    const total = Object.values(record).reduce((sum, n) => sum + n, 0);
    return fc.record({
      balances: fc.constant(record),
      withdrawal: fc.integer({ min: 0, max: total }),
    });
  });

testProp(
  'computeWeightedTargets distributes withdraw proportionally and keeps the remainder on the heaviest weight',
  [withdrawCase],
  (t, { balances, withdrawal }) => {
    const currentBalances = Object.fromEntries(
      Object.entries(balances).map(([key, value]) => [
        key,
        makeDeposit(BigInt(value)),
      ]),
    );

    const delta = -BigInt(withdrawal);
    const draftTarget = computeWeightedTargets(
      depositBrand,
      currentBalances,
      delta,
    );
    const mergedTarget = { ...currentBalances, ...draftTarget };

    const weights = Object.entries(currentBalances).map(
      ([key, amount]) => [key, amount.value] as const,
    );
    const currentTotal = weights.reduce((acc, [, v]) => acc + v, 0n);
    const expectedTotal = currentTotal + delta;
    t.true(expectedTotal >= 0n);

    const sumW = weights.reduce((acc, [, w]) => acc + w, 0n);
    const shares = new Map(
      weights.map(([key, weight]) => [key, (expectedTotal * weight) / sumW]),
    );
    const remainder =
      expectedTotal -
      [...shares.values()].reduce((acc, value) => acc + value, 0n);
    const [maxKey] = weights.reduce<readonly [string, bigint]>(
      (best, entry) => (entry[1] > best[1] ? entry : best),
      ['<none>', -1n],
    );

    const totalAfter = Object.values(mergedTarget).reduce(
      (acc, { value }) => acc + value,
      0n,
    );
    t.is(totalAfter, expectedTotal);

    for (const [key, share] of shares.entries()) {
      const targetValue = mergedTarget[key]!.value;
      const expectedValue = key === maxKey ? share + remainder : share;
      t.is(targetValue, expectedValue);
    }
  },
);

const allKeys = ['Aave_Avalanche', 'Compound_Arbitrum', 'USDN'] as string[];

testProp(
  'computeWeightedTargets zeros current balances that lost their target allocation',
  [
    fc.record({
      balances: fc.record({
        Aave_Avalanche: fc.nat({ max: 5_000 }),
        Compound_Arbitrum: fc.nat({ max: 5_000 }),
        USDN: fc.nat({ max: 5_000 }),
      }),
      targetKeys: fc.subarray(allKeys, {
        minLength: 1,
        maxLength: allKeys.length - 1,
      }),
      withdrawal: fc.nat({ max: 15_000 }),
    }),
  ],
  (t, { balances, targetKeys, withdrawal }) => {
    const positiveBalances = Object.entries(balances).filter(([, v]) => v > 0);
    const currentTotal = positiveBalances.reduce(
      (sum, [, v]) => sum + BigInt(v),
      0n,
    );
    fc.pre(currentTotal > 0n);
    fc.pre(BigInt(withdrawal) <= currentTotal);

    const missingKeys = allKeys.filter(key => !targetKeys.includes(key));
    const missingWithValue = missingKeys.filter(key => balances[key] > 0);
    fc.pre(missingWithValue.length > 0);

    const targetAllocation = Object.fromEntries(
      targetKeys.map((key, idx) => [key, BigInt(idx + 1)]),
    );
    const currentBalances = Object.fromEntries(
      Object.entries(balances).map(([key, value]) => [
        key,
        makeDeposit(BigInt(value)),
      ]),
    );
    const draft = computeWeightedTargets(
      depositBrand,
      currentBalances,
      -BigInt(withdrawal),
      targetAllocation,
    );

    for (const key of missingWithValue) {
      t.true(key in draft);
      t.is(draft[key]!.value, 0n);
    }
  },
);

test('planWithdrawFromAllocations zeros hubs and tops up cash before planning', async t => {
  const planned: any[] = [];
  const stubRebalance = async (plan: any) => {
    planned.push(plan);
    return { steps: ['stub-step'] };
  };

  const currentBalances = {
    '@Arbitrum': makeDeposit(80n),
    '<Cash>': makeDeposit(10n),
    USDN: makeDeposit(120n),
  };

  const steps = await planWithdrawFromAllocations(
    {
      amount: makeDeposit(50n),
      brand: depositBrand,
      currentBalances,
      targetAllocation: { USDN: 1n },
      network: {} as any,
      feeBrand,
      gasEstimator: mockGasEstimator,
    },
    stubRebalance as any,
  );

  t.deepEqual(steps, ['stub-step']);
  const [{ target, current }] = planned;
  t.is(target['@Arbitrum']?.value, 0n);
  t.is(target['<Cash>']?.value, 60n);
  t.is(current['<Cash>']?.value, 10n);
});

test('planWithdrawFromAllocations rejects negative allocation weights', async t => {
  const promise = planWithdrawFromAllocations(
    {
      amount: makeDeposit(10n),
      brand: depositBrand,
      currentBalances: { USDN: makeDeposit(10n) },
      targetAllocation: { USDN: -1n } as any,
      network: {} as any,
      feeBrand,
      gasEstimator: mockGasEstimator,
    },
    async () => {
      t.fail('rebalance should not be called');
      return { steps: [] } as any;
    },
  );

  await t.throwsAsync(promise, { message: /allocation weight.*must be a Nat/ });
});

test('planWithdrawFromAllocations requires allocation weights to sum above zero', async t => {
  await t.throwsAsync(
    () =>
      planWithdrawFromAllocations(
        {
          amount: makeDeposit(1n),
          brand: depositBrand,
          currentBalances: { USDN: makeDeposit(100n) },
          targetAllocation: {
            USDN: 0n,
            Aave_Arbitrum: 0n,
          },
          network: {} as any,
          feeBrand,
          gasEstimator: mockGasEstimator,
        },
        async () => {
          t.fail('rebalance should not be called');
          return { steps: [] } as any;
        },
      ),
    { message: /allocation weights must sum > 0/ },
  );
});
