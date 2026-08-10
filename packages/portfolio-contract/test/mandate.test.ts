import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { assertMandateForAllocation } from '../src/mandate.ts';

const statuses = harden({
  Aave_Base: { tvlUsd: 20_000_000n, asOf: 1_754_521_200 },
  Compound_Base: { tvlUsd: 50_000_000n, asOf: 1_754_521_200 },
});
const getStatus = (instrument: string) =>
  statuses[instrument as keyof typeof statuses];

test('per-instrument mandate accepts distinct limits', t => {
  const permissions = harden({
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 6_000,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 1_000,
        },
        Compound_Base: {
          maxWeightBps: 5_000,
          minVaultTvlUsd: 40_000_000n,
          maxVaultShareBps: 500,
        },
      },
    },
  });
  t.notThrows(() =>
    assertMandateForAllocation(
      permissions,
      harden({ Aave_Base: 60n, Compound_Base: 40n }),
      getStatus,
      1_000_000n,
    ),
  );
});

for (const { title, permissions, allocation, statusReader, value, error } of [
  {
    title: 'maximum weight',
    permissions: {
      allocation: { instruments: { Aave_Base: { maxWeightBps: 5_999 } } },
    },
    allocation: { Aave_Base: 60n, Compound_Base: 40n },
    statusReader: getStatus,
    value: 1_000_000n,
    error: /mandate\.maxWeight.*Aave_Base/,
  },
  {
    title: 'minimum vault TVL',
    permissions: {
      allocation: {
        instruments: { Aave_Base: { minVaultTvlUsd: 20_000_001n } },
      },
    },
    allocation: { Aave_Base: 60n, Compound_Base: 40n },
    statusReader: getStatus,
    value: 1_000_000n,
    error: /mandate\.minVaultTvl.*Aave_Base/,
  },
  {
    title: 'missing instrument data',
    permissions: {
      allocation: { instruments: { Aave_Base: { minVaultTvlUsd: 1n } } },
    },
    allocation: { Aave_Base: 60n, Compound_Base: 40n },
    statusReader: () => undefined,
    value: 1_000_000n,
    error: /mandate\.instrumentData\.missing.*Aave_Base/,
  },
  {
    title: 'maximum vault share',
    permissions: {
      allocation: { instruments: { Aave_Base: { maxVaultShareBps: 100 } } },
    },
    allocation: { Aave_Base: 60n, Compound_Base: 40n },
    statusReader: getStatus,
    value: 1_000_000n,
    error: /mandate\.maxVaultShare.*Aave_Base/,
  },
  {
    title: 'missing portfolio valuation',
    permissions: {
      allocation: { instruments: { Aave_Base: { maxVaultShareBps: 1_000 } } },
    },
    allocation: { Aave_Base: 60n, Compound_Base: 40n },
    statusReader: getStatus,
    value: undefined,
    error: /mandate\.portfolioValue\.missing.*Aave_Base/,
  },
] as const) {
  test(`per-instrument mandate rejects ${title}`, t => {
    t.throws(
      () =>
        assertMandateForAllocation(
          harden(permissions),
          harden(allocation),
          statusReader,
          value,
        ),
      { message: error },
    );
  });
}

test('cash is exempt from maximum weight', t => {
  t.notThrows(() =>
    assertMandateForAllocation(
      harden({
        allocation: { instruments: { '@Base': { maxWeightBps: 0 } } },
      }),
      harden({ '@Base': 100n }),
      () => undefined,
    ),
  );
});
