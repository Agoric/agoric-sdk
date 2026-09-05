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
  instrumentTvls: {
    Aave_Base: { tvlUsd: 20_000_000n },
    Compound_Base: { tvlUsd: 50_000_000n },
  },
});

const allocation = harden({ Aave_Base: 60n, Compound_Base: 40n });

test('allocation check is independent of off-chain observations', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: {
          maxWeightBps: 6_000n,
          minVaultTvlUsd: 30_000_000n,
          maxVaultShareBps: 100n,
        },
      }),
      allocation,
    ),
  );
});

test('plan observations apply global limits to every instrument', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: {
          maxWeightBps: 6_000n,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 500n,
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
      allocation: { minVaultTvlUsd: 20_000_001n },
    },
    evidence: observations,
    error: /mandate\.minVaultTvl.*Aave_Base/,
  },
  {
    title: 'missing instrument data',
    permissions: {
      allocation: { minVaultTvlUsd: 1n },
    },
    evidence: { ...observations, instrumentTvls: {} },
    error: /mandate\.instrumentData\.missing.*Aave_Base/,
  },
  {
    title: 'maximum vault share',
    permissions: {
      allocation: { maxVaultShareBps: 100n },
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

test('global mandate rejects maximum weight for each non-cash position', t => {
  t.throws(
    () =>
      assertMandateForAllocation(
        harden({
          allocation: { maxWeightBps: 5_999n },
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
        allocation: { maxWeightBps: 0n },
      }),
      harden({ '@Base': 100n }),
    ),
  );
});

test('cash is exempt from observation-dependent limits', t => {
  t.notThrows(() =>
    assertMandateForPlanObservations(
      harden({
        allocation: { minVaultTvlUsd: 1n, maxVaultShareBps: 0n },
      }),
      harden({ '@Base': 100n }),
      harden({
        balances: { '@Base': 1_000_000n },
        instrumentTvls: {},
      }),
    ),
  );
});

test('global minimum TVL rejects a later applicable instrument', t => {
  t.throws(
    () =>
      assertMandateForPlanObservations(
        harden({ allocation: { minVaultTvlUsd: 30_000_000n } }),
        harden({ Aave_Base: 50n, Compound_Base: 50n }),
        harden({
          ...observations,
          instrumentTvls: {
            Aave_Base: { tvlUsd: 50_000_000n },
            Compound_Base: { tvlUsd: 20_000_000n },
          },
        }),
      ),
    { message: /mandate\.minVaultTvl.*Compound_Base/ },
  );
});
