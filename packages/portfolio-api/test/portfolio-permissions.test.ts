import '@endo/init/debug.js';

import test from 'ava';
import { matches, mustMatch } from '@endo/patterns';

import {
  portfolioPermissionsFromEIP712,
  portfolioPermissionsToEIP712,
  PortfolioPermissionsEIP712Shape,
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
      maxWeightBps: 1_500n,
      minVaultTvlUsd: 10_000_000n,
      maxVaultShareBps: 1_000n,
    },
  },
  zero: {
    allocation: {
      maxWeightBps: 0n,
      minVaultTvlUsd: 0n,
      maxVaultShareBps: 0n,
    },
  },
  upperBound: {
    allocation: { maxWeightBps: 10_000n, maxVaultShareBps: 10_000n },
  },
} as const);

test('PortfolioPermissions accepts legacy and constrained records', t => {
  for (const [name, specimen] of Object.entries(validCases)) {
    t.notThrows(
      () => mustMatch(specimen, PortfolioPermissionsShape),
      `valid: ${name}`,
    );
    t.true(matches(specimen, PortfolioPermissionsShape), `valid: ${name}`);
  }
});

test('PortfolioPermissions rejects invalid constraint values and fields', t => {
  const invalidCases = harden({
    numberWeight: { allocation: { maxWeightBps: 1_500 } },
    negativeWeight: {
      allocation: { maxWeightBps: -1n },
    },
    excessiveWeight: {
      allocation: { maxWeightBps: 10_001n },
    },
    numberShare: {
      allocation: { maxVaultShareBps: 1_000 },
    },
    negativeShare: { allocation: { maxVaultShareBps: -1n } },
    excessiveShare: { allocation: { maxVaultShareBps: 10_001n } },
    negativeTvl: {
      allocation: { minVaultTvlUsd: -1n },
    },
    numberTvl: {
      allocation: { minVaultTvlUsd: 1 },
    },
    allocationExtra: { allocation: { maxWeightBps: 1_500n, extra: true } },
    topLevelExtra: { allocation: true, extra: true },
  } as const);
  for (const [name, specimen] of Object.entries(invalidCases)) {
    t.false(matches(specimen, PortfolioPermissionsShape), `invalid: ${name}`);
    t.throws(
      () => mustMatch(specimen, PortfolioPermissionsShape),
      undefined,
      `invalid: ${name}`,
    );
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

test('PortfolioPermissionsEIP712 requires allocation authority for constraints', t => {
  t.true(
    matches(
      harden({ allocation: true, maxWeightBps: 1_500n }),
      PortfolioPermissionsEIP712Shape,
    ),
  );
  t.true(
    matches(harden({ allocation: false }), PortfolioPermissionsEIP712Shape),
  );
  t.true(matches(harden({}), PortfolioPermissionsEIP712Shape));
  t.false(
    matches(
      harden({ allocation: false, maxWeightBps: 1_500n }),
      PortfolioPermissionsEIP712Shape,
    ),
  );
});

test('permission wire conversion preserves omission and present zero', t => {
  t.deepEqual(portfolioPermissionsFromEIP712(harden({})), {});
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
        maxWeightBps: 0n,
        minVaultTvlUsd: 0n,
        maxVaultShareBps: 0n,
      }),
    ),
    validCases.zero,
  );
  t.deepEqual(portfolioPermissionsToEIP712(harden({})), {});
  t.deepEqual(portfolioPermissionsToEIP712(harden({ allocation: {} })), {
    allocation: true,
  });
  t.deepEqual(portfolioPermissionsToEIP712(validCases.pilot), {
    allocation: true,
    maxWeightBps: 1_500n,
    minVaultTvlUsd: 10_000_000n,
    maxVaultShareBps: 1_000n,
  });
});

test('permission wire conversion rejects contradictory allocation constraints', t => {
  t.throws(() =>
    portfolioPermissionsFromEIP712(
      harden({
        allocation: false,
        maxWeightBps: 1_500n,
      }),
    ),
  );
});

test('permission wire conversion rejects non-user-facing authority', t => {
  for (const authority of ['rebalance', 'claimRewards'] as const) {
    t.throws(
      () =>
        portfolioPermissionsFromEIP712(
          harden({ allocation: true, [authority]: true }) as never,
        ),
      { message: new RegExp(authority) },
    );
    t.throws(
      () =>
        portfolioPermissionsToEIP712(
          harden({ allocation: true, [authority]: true }) as never,
        ),
      { message: new RegExp(authority) },
    );
  }
});
