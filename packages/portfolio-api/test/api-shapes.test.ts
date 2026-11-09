import '@endo/init/debug.js';

import test from 'ava';
import { matches } from '@endo/patterns';
import {
  minSignedBigInt,
  maxSignedBigInt,
} from '@agoric/orchestration/src/utils/abitype.ts';
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
    { srcAmount: 0n },
    { srcKind: 'shares' },
    { srcKind: 'principal' },
    { srcToken: address },
    { srcToken: address, srcAmount: 123n },
    { max: true, srcToken: address, srcAmount: 0n },
  ])
    t.true(matches(harden(params), WithdrawParamsShape));
  for (const params of [
    { max: 'true' },
    { srcKind: 'reward' },
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
    'reward',
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
    valueUsd: minSignedBigInt(256n),
  };
  for (const specimen of [
    holding,
    { ...holding, valueUsd: 0n },
    { ...holding, valueUsd: undefined },
    { ...holding, valueUsd: maxSignedBigInt(256n) },
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
    { valueUsd: -2n },
    { valueUsd: -1n },
    { valueUsd: maxSignedBigInt(256n) + 1n },
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
  ]) {
    t.false(matches(harden(entry), HoldingDetailShape));
  }
});
