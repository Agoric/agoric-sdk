import '@endo/init/debug.js';

import test from 'ava';
import { matches } from '@endo/patterns';
import {
  WithdrawParamsShape,
  HoldingKindShape,
  HoldingDetailShape,
  PlanObservationsShape,
} from '../src/type-guards.ts';

const address = `0x${'1'.repeat(40)}`;

test('withdraw parameters preserve omitted, false and zero values', t => {
  for (const params of [
    {},
    { max: false },
    { max: true },
    { amountOfShares: 0n },
    { amountOfShares: 123n },
  ])
    t.true(matches(harden(params), WithdrawParamsShape));
  for (const params of [
    { max: 'true' },
    { srcKind: 'shares' },
    { srcToken: address },
    { srcAmount: 0n },
    { amountOfShares: 1 },
    { amountOfShares: -1n },
    { max: false, amountOfShares: 0n },
    { max: true, amountOfShares: 0n },
    { srcKind: '$ETH' },
    { srcKind: 'share' },
    { srcAmount: 1 },
    { srcAmount: -1n },
    { srcToken: 1n },
    { amount: 1n },
    { kind: 'shares' },
    { force: true },
  ])
    t.false(matches(harden(params), WithdrawParamsShape));
});

test('holding kinds cover typed and native holdings', t => {
  for (const kind of [
    'shares',
    'principal',
    'claimable-reward',
    'claimed-reward',
    'token',
    '$ETH',
    '$AVAX',
    '$$',
    '$%',
  ]) {
    t.true(matches(kind, HoldingKindShape), `kind ${kind}`);
  }
  for (const kind of [
    'share',
    'reward',
    'native-token',
    'unknown',
    '$',
    '%',
    '%ETH',
    '#ETH',
    'ETH',
    1,
  ]) {
    t.false(matches(kind, HoldingKindShape), `kind ${kind}`);
  }
});

test('holding shapes distinguish unknown valuation, zero valuation and raw zero', t => {
  const holding = {
    place: 'Aave_Base',
    kind: 'principal',
    tokenAddress: address,
    amount: 0n,
  };
  for (const specimen of [
    holding,
    { ...holding, valueUsd: 0n },
    { ...holding, valueUsd: undefined },
    { ...holding, valueUsd: 2n ** 255n - 1n },
    { ...holding, balanceUsdc: 0n },
    { ...holding, balanceUsdc: 1n },
  ]) {
    t.true(matches(harden(specimen), HoldingDetailShape));
    t.true(
      matches(
        harden({ balances: {}, holdings: [specimen], instrumentTvls: {} }),
        PlanObservationsShape,
      ),
    );
  }
  for (const fields of [
    { amount: undefined },
    { amount: -1n },
    { amount: 123 },
    { valueUsd: -1n }, // the wire sentinel is not an application value
    { valueUsd: -2n },
    { valueUsd: -(2n ** 255n) },
    { valueUsd: 2n ** 255n },
    { valueUsd: 0 },
    { balanceUsdc: -2n },
    { balanceUsdc: '123' },
    { kind: 'unknown' },
    { extra: true },
  ])
    t.false(matches(harden({ ...holding, ...fields }), HoldingDetailShape));
  t.false(
    matches(
      harden({ holdings: [], instrumentTvls: { Aave_Base: { tvlUsd: -1n } } }),
      PlanObservationsShape,
    ),
  );
});

test('legacy holding Shape requires a place and a nonnegative balance', t => {
  t.true(
    matches(harden({ place: '@Base', balanceUsdc: 0n }), HoldingDetailShape),
  );
  for (const entry of [
    { balanceUsdc: 0n },
    { place: '@Base' },
    { place: '@Base', balanceUsdc: -1n },
    { place: '@Base', balanceUsdc: 0n, extra: true },
    { place: '@Base', balanceUsdc: 0n, valueUsd: 1n },
  ]) {
    t.false(matches(harden(entry), HoldingDetailShape));
  }
});
