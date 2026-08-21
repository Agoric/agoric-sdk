import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  assertMandateForAllocation,
  assertMandateForPlanObservations,
} from '../src/mandate.ts';

const observations = harden({
  balances: {
    '@Base': 400_000_000_000n,
    Aave_Base: 600_000_000_000n,
  },
  balancesAsOf: 1_754_521_200,
  instrumentTvls: {
    Aave_Base: { tvlUsd: 20_000_000n, asOf: 1_754_521_190 },
    Compound_Base: { tvlUsd: 50_000_000n, asOf: 1_754_521_190 },
  },
});

const allocation = harden({ Aave_Base: 60n, Compound_Base: 40n });

test('allocation check is independent of off-chain observations', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: {
          instruments: {
            Aave_Base: {
              maxWeightBps: 6_000,
              minVaultTvlUsd: 30_000_000n,
              maxVaultShareBps: 100,
            },
          },
        },
      }),
      allocation,
    ),
  );
});

test('plan observations accept distinct instrument limits', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: {
          instruments: {
            Aave_Base: {
              maxWeightBps: 6_000,
              minVaultTvlUsd: 10_000_000n,
              maxVaultShareBps: 500,
            },
            Compound_Base: {
              maxWeightBps: 5_000,
              minVaultTvlUsd: 40_000_000n,
              maxVaultShareBps: 1_000,
            },
          },
        },
      }),
      allocation,
      observations,
    ),
  );
});

for (const { title, permissions, evidence, error } of [
  {
    title: 'minimum vault TVL',
    permissions: {
      allocation: {
        instruments: { Aave_Base: { minVaultTvlUsd: 20_000_001n } },
      },
    },
    evidence: observations,
    error: /mandate\.minVaultTvl.*Aave_Base/,
  },
  {
    title: 'missing instrument data',
    permissions: {
      allocation: { instruments: { Aave_Base: { minVaultTvlUsd: 1n } } },
    },
    evidence: { ...observations, instrumentTvls: {} },
    error: /mandate\.instrumentData\.missing.*Aave_Base/,
  },
  {
    title: 'maximum vault share',
    permissions: {
      allocation: { instruments: { Aave_Base: { maxVaultShareBps: 100 } } },
    },
    evidence: observations,
    error: /mandate\.maxVaultShare.*Aave_Base/,
  },
] as const) {
  test(`plan observations reject ${title}`, t => {
    t.throws(
      () =>
        assertMandateForPlanObservations(
          harden(permissions),
          allocation,
          harden(evidence),
        ),
      { message: error },
    );
  });
}

test('per-instrument mandate rejects maximum weight', t => {
  t.throws(
    () =>
      assertMandateForAllocation(
        harden({
          allocation: {
            instruments: { Aave_Base: { maxWeightBps: 5_999 } },
          },
        }),
        allocation,
      ),
    { message: /mandate\.maxWeight.*Aave_Base/ },
  );
});

test('cash is exempt from maximum weight', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: { instruments: { '@Base': { maxWeightBps: 0 } } },
      }),
      harden({ '@Base': 100n }),
    ),
  );
});
