import '@endo/init/debug.js';

import test from 'ava';
import { matches } from '@endo/patterns';
import { Far } from '@endo/far';
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

const selector = { kind: 'shares', token: address, amount: 123n };

for (const [name, params] of Object.entries({
  omittedSelect: {},
  falseMax: { max: false },
  trueMax: { max: true },
  single: { select: [selector] },
  zero: { select: [{ ...selector, amount: 0n }] },
  large: { select: [{ ...selector, amount: 10n ** 30n }] },
  denom: { select: [{ ...selector, token: 'uusdc' }] },
  ibcDenom: { select: [{ ...selector, token: 'ibc/ABC123' }] },
  multiple: {
    select: [selector, { kind: 'principal', token: 'uusdc', amount: 0n }],
  },
  inheritedMax: { max: true, select: [selector] },
  overrideFalse: { max: true, select: [{ ...selector, max: false }] },
  overrideTrue: { max: false, select: [{ ...selector, max: true }] },
  mixedFlags: {
    select: [
      { ...selector, max: false },
      { ...selector, max: true },
    ],
  },
  overlap: { select: [selector, selector] },
})) {
  test(`withdraw Shape accepts ${name}`, t => {
    t.true(matches(harden(params), WithdrawParamsShape));
  });
}

for (const kind of ['shares', 'principal', 'reward', 'token', '$ETH']) {
  test(`withdraw Shape accepts selector kind ${kind}`, t => {
    t.true(
      matches(harden({ select: [{ ...selector, kind }] }), WithdrawParamsShape),
    );
  });
}

for (const [name, params] of Object.entries({
  emptySelect: { select: [] },
  nonArray: { select: selector },
  nullSelect: { select: null },
  emptySelector: { select: [{}] },
  missingKind: { select: [{ token: address, amount: 0n }] },
  missingToken: { select: [{ kind: 'shares', amount: 0n }] },
  missingAmount: { select: [{ kind: 'shares', token: address }] },
  invalidLaterSelector: { select: [selector, {}] },
  negativeAmount: { select: [{ ...selector, amount: -1n }] },
  numericAmount: { select: [{ ...selector, amount: 123 }] },
  stringAmount: { select: [{ ...selector, amount: '123' }] },
  invalidToken: { select: [{ ...selector, token: 1n }] },
  recordToken: { select: [{ ...selector, token: { allegedName: 'USDC' } }] },
  nullToken: { select: [{ ...selector, token: null }] },
  invalidKind: { select: [{ ...selector, kind: 'share' }] },
  unknownKind: { select: [{ ...selector, kind: 'unknown' }] },
  bareNativeKind: { select: [{ ...selector, kind: '$' }] },
  invalidMax: { max: 'true' },
  invalidSelectorMax: { select: [{ ...selector, max: 'true' }] },
  unknownSelectorField: { select: [{ ...selector, force: true }] },
  unknownField: { force: true },
  obsoleteKind: { srcKind: 'shares' },
  obsoleteToken: { srcToken: address },
  obsoleteAmount: { srcAmount: 123n },
  obsoleteFieldsWithSelect: { select: [selector], srcAmount: 123n },
  wrongSelectName: { selection: [selector] },
})) {
  test(`withdraw Shape rejects ${name}`, t => {
    t.false(matches(harden(params), WithdrawParamsShape));
  });
}

test('withdraw Shape accepts fake nat brands in multiple selectors', t => {
  const tokens = [Far('fake USDC brand'), Far('fake shares brand')];
  const select = tokens.map(token => ({ ...selector, token }));
  for (const max of [false, true]) {
    t.true(matches(harden({ max, select }), WithdrawParamsShape));
  }
  t.false(
    matches(
      harden({ select: [{ ...select[0], amount: -1n }] }),
      WithdrawParamsShape,
    ),
  );
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
