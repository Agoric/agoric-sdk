import '@endo/init/debug.js';

import test from 'ava';
import { matches } from '@endo/patterns';
import {
  OPT_UINT_UNDEFINED,
  optUint255Shape,
  maxOptUint255,
  assertOptUint255,
} from '@agoric/portfolio-api';
import {
  WithdrawParamsShape,
  HoldingKindShape,
  HoldingDetailShape,
  PlanObservationsV2Shape,
} from '../src/type-guards.ts';

const address = `0x${'1'.repeat(40)}`;

test('optUint255 accepts the unused marker and bounds wire values by field name', t => {
  for (const value of [OPT_UINT_UNDEFINED, 0n, maxOptUint255 - 1n]) {
    t.true(matches(value, optUint255Shape));
    t.notThrows(() => assertOptUint255(value, 'quantity'));
  }
  for (const value of [
    OPT_UINT_UNDEFINED - 1n,
    maxOptUint255,
    1 as unknown as bigint,
  ]) {
    t.throws(() => assertOptUint255(value, 'quantity'), {
      message: `invalid optUint255 quantity: ${String(value)}`,
    });
  }
});

test('withdraw parameters preserve omitted, false and zero values', t => {
  for (const params of [
    {},
    { max: false },
    { max: true },
    { srcAmount: 0n },
    { srcToken: address },
    { srcToken: address, srcAmount: 123n },
    { max: true, srcToken: address, srcAmount: 0n },
  ])
    t.true(matches(harden(params), WithdrawParamsShape));
  for (const params of [
    { max: 'true' },
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
  ]) {
    t.true(matches(kind, HoldingKindShape), `kind ${kind}`);
  }
  for (const kind of ['share', 'native-token', 'unknown', '$', 'ETH', 1]) {
    t.false(matches(kind, HoldingKindShape), `kind ${kind}`);
  }
});

test('holding shapes distinguish unknown valuation, zero valuation and raw zero', t => {
  const holding = {
    place: 'Aave_Base',
    kind: 'principal',
    tokenAddress: address,
    amount: 0n,
    valueUsd: OPT_UINT_UNDEFINED,
  };
  for (const specimen of [
    holding,
    { ...holding, valueUsd: 0n },
    { ...holding, balanceUsdc: OPT_UINT_UNDEFINED },
    { ...holding, balanceUsdc: 0n },
    { ...holding, balanceUsdc: 1n },
  ]) {
    t.true(matches(harden(specimen), HoldingDetailShape));
    t.true(
      matches(
        harden({ holdings: [specimen], instrumentTvls: {} }),
        PlanObservationsV2Shape,
      ),
    );
  }
  for (const fields of [
    { amount: undefined },
    { amount: -1n },
    { amount: 123 },
    { valueUsd: undefined },
    { valueUsd: -2n },
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
      PlanObservationsV2Shape,
    ),
  );
});
