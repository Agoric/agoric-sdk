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
    tokenId: address,
    amount: 0n,
  };
  for (const specimen of [
    holding,
    { ...holding, valueUusd: 0n },
    { ...holding, valueUusd: undefined },
    { ...holding, valueUusd: 2n ** 255n - 1n },
    { ...holding, balanceUsdc: 0n },
    { ...holding, balanceUsdc: 1n },
    { ...holding, place: '@noble', kind: 'token', tokenId: 'uusdc' },
    { ...holding, place: '@Base', kind: '$ETH', tokenId: '' },
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
    { valueUusd: -1n }, // the wire sentinel is not an application value
    { valueUusd: -2n },
    { valueUusd: -(2n ** 255n) },
    { valueUusd: 2n ** 255n },
    { valueUusd: 0 },
    { valueUsd: 0n }, // obsolete field name, even though the units match
    { tokenAddress: address }, // obsolete asset identifier field
    { tokenId: 123 },
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
    { place: '@Base', balanceUsdc: 0n, valueUusd: 1n },
  ]) {
    t.false(matches(harden(entry), HoldingDetailShape));
  }
});

test('PlanObservationsShape accepts optional reward evidence', t => {
  const token = `0x${'b'.repeat(40)}`;
  const base = { balances: {}, instrumentTvls: {} };
  const evidence = {
    aaveClaims: [
      { instrumentId: 'Aave_Base', tokenId: token, expectedAmount: 1n },
    ],
    compoundClaims: [
      { instrumentId: 'Compound_Base', tokenId: token, expectedAmount: 1n },
    ],
    merklClaims: [
      {
        accountPlace: '@Base',
        distributor: token,
        tokenId: token,
        cumulativeAmount: 2n,
        claimedAmount: 1n,
        proof: [`0x${'12'.repeat(32)}`],
      },
    ],
    oneInchSwaps: [
      {
        accountPlace: '@Base',
        tokenIn: token,
        tokenOut: `0x${'a'.repeat(40)}`,
        amountIn: 1n,
        quotedAmountOut: 1n,
        minAmountOut: 1n,
        slippageBps: 200,
        expiresAt: 1n,
        flags: 0n,
        executor: token,
        srcReceiver: token,
        data: '0x',
      },
    ],
  };
  t.true(matches(harden(base), PlanObservationsShape));
  t.true(matches(harden({ ...base, ...evidence }), PlanObservationsShape));
  for (const [key, [entry]] of Object.entries(evidence)) {
    t.true(matches(harden({ ...base, [key]: [] }), PlanObservationsShape));
    t.false(
      matches(
        harden({ ...base, [key]: [{ ...entry, extra: 1n }] }),
        PlanObservationsShape,
      ),
      `${key} with an extra field`,
    );
    t.false(
      matches(harden({ ...base, [key]: entry }), PlanObservationsShape),
      `${key} not in an array`,
    );
  }
  t.false(
    matches(
      harden({
        ...base,
        oneInchSwaps: [{ ...evidence.oneInchSwaps[0], slippageBps: 200n }],
      }),
      PlanObservationsShape,
    ),
  );
});
