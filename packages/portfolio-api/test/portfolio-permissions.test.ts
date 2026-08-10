import '@endo/init/debug.js';

import test from 'ava';
import { matches } from '@endo/patterns';

import {
  assertPortfolioPermissions,
  portfolioPermissionsFromEIP712,
  portfolioPermissionsToEIP712,
  PortfolioPermissionsExtShape,
  PortfolioPermissionsShape,
} from '../src/portfolio-permissions.ts';

const validCases = harden({
  empty: {},
  allocationFalse: { allocation: false },
  allocationTrue: { allocation: true },
  allocationObject: { allocation: {} },
  rebalance: { rebalance: true },
  pilot: {
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 1_500,
          minVaultTvlUsd: 10_000_000n,
          maxVaultShareBps: 1_000,
        },
        Compound_Base: {
          maxWeightBps: 1_000,
          minVaultTvlUsd: 20_000_000n,
          maxVaultShareBps: 500,
        },
      },
    },
  },
  zero: {
    allocation: {
      instruments: {
        Aave_Base: {
          maxWeightBps: 0,
          minVaultTvlUsd: 0n,
          maxVaultShareBps: 0,
        },
      },
    },
  },
  upperBound: {
    allocation: {
      instruments: {
        Aave_Base: { maxWeightBps: 10_000, maxVaultShareBps: 10_000 },
      },
    },
  },
} as const);

test('PortfolioPermissions accepts legacy and constrained records', t => {
  for (const [name, specimen] of Object.entries(validCases)) {
    t.notThrows(() => assertPortfolioPermissions(specimen), name);
    t.true(matches(specimen, PortfolioPermissionsShape), name);
  }
});

test('PortfolioPermissions rejects invalid constraint values and fields', t => {
  const invalidCases = harden({
    fractionalWeight: {
      allocation: { instruments: { Aave_Base: { maxWeightBps: 1.5 } } },
    },
    unsafeWeight: {
      allocation: {
        instruments: {
          Aave_Base: { maxWeightBps: Number.MAX_SAFE_INTEGER + 1 },
        },
      },
    },
    nanWeight: {
      allocation: { instruments: { Aave_Base: { maxWeightBps: Number.NaN } } },
    },
    infiniteWeight: {
      allocation: {
        instruments: { Aave_Base: { maxWeightBps: Number.POSITIVE_INFINITY } },
      },
    },
    negativeWeight: {
      allocation: { instruments: { Aave_Base: { maxWeightBps: -1 } } },
    },
    excessiveWeight: {
      allocation: { instruments: { Aave_Base: { maxWeightBps: 10_001 } } },
    },
    fractionalShare: {
      allocation: { instruments: { Aave_Base: { maxVaultShareBps: 1.5 } } },
    },
    unsafeShare: {
      allocation: {
        instruments: {
          Aave_Base: { maxVaultShareBps: Number.MAX_SAFE_INTEGER + 1 },
        },
      },
    },
    negativeTvl: {
      allocation: { instruments: { Aave_Base: { minVaultTvlUsd: -1n } } },
    },
    numberTvl: {
      allocation: { instruments: { Aave_Base: { minVaultTvlUsd: 1 } } },
    },
    constraintExtra: {
      allocation: {
        instruments: { Aave_Base: { maxWeightBps: 1_500, extra: true } },
      },
    },
    allocationExtra: { allocation: { instruments: {}, extra: true } },
    topLevelExtra: { allocation: true, extra: true },
  } as const);
  for (const [name, specimen] of Object.entries(invalidCases)) {
    t.throws(() => assertPortfolioPermissions(specimen), undefined, name);
  }
});

test('PortfolioPermissionsExt remains forward compatible', t => {
  t.true(
    matches(
      harden({ allocation: true, futurePermission: { version: 2 } }),
      PortfolioPermissionsExtShape,
    ),
  );
});

test('permission wire conversion preserves omission and present zero', t => {
  t.deepEqual(portfolioPermissionsFromEIP712(harden({ allocation: false })), {
    allocation: false,
  });
  t.deepEqual(portfolioPermissionsFromEIP712(harden({ allocation: true })), {
    allocation: true,
  });
  t.deepEqual(
    portfolioPermissionsFromEIP712(
      harden({
        allocation: true,
        allocationMaxWeights: [{ instrument: 'Aave_Base', maxWeightBps: 0 }],
        allocationMinVaultTvls: [
          { instrument: 'Aave_Base', minVaultTvlUsd: 0n },
        ],
        allocationMaxVaultShares: [
          { instrument: 'Aave_Base', maxVaultShareBps: 0 },
        ],
      }),
    ),
    validCases.zero,
  );
  t.deepEqual(portfolioPermissionsToEIP712(harden({ allocation: {} })), {
    allocation: true,
  });
  t.deepEqual(portfolioPermissionsToEIP712(validCases.pilot), {
    allocation: true,
    allocationMaxWeights: [
      {
        instrument: 'Aave_Base',
        maxWeightBps: 1_500,
      },
      {
        instrument: 'Compound_Base',
        maxWeightBps: 1_000,
      },
    ],
    allocationMinVaultTvls: [
      {
        instrument: 'Aave_Base',
        minVaultTvlUsd: 10_000_000n,
      },
      {
        instrument: 'Compound_Base',
        minVaultTvlUsd: 20_000_000n,
      },
    ],
    allocationMaxVaultShares: [
      {
        instrument: 'Aave_Base',
        maxVaultShareBps: 1_000,
      },
      {
        instrument: 'Compound_Base',
        maxVaultShareBps: 500,
      },
    ],
  });
});

test('permission wire conversion rejects contradictory or internal authority', t => {
  t.throws(
    () =>
      portfolioPermissionsFromEIP712(
        harden({
          allocation: false,
          allocationMaxWeights: [
            { instrument: 'Aave_Base', maxWeightBps: 1_500 },
          ],
        }),
      ),
    { message: /require allocation authority/ },
  );
  t.throws(
    () =>
      portfolioPermissionsToEIP712(
        harden({
          allocation: true,
          rebalance: true,
        }) as never,
      ),
    { message: /rebalance is not supported/ },
  );
});
