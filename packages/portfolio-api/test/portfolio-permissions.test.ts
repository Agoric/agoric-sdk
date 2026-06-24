import test from 'ava';

import { matches, mustMatch } from '@endo/patterns';
import type { PortfolioPermissions } from '../src/main.js';
import {
  PortfolioPermissionsExtShape,
  PortfolioPermissionsShape,
} from '../src/portfolio-permissions.ts';

test('PortfolioPermissionsShape', t => {
  const passCases = harden({
    empty: {},
    allocateOnly: { allocation: true },
    allocateObjectOnly: { allocation: {} },
    allocateFalse: { allocation: false },
    allocateZeroCap: { allocation: { capBps: 0 } },
    allocateCap: { allocation: { capBps: 3000 } },
    allocateFullCap: { allocation: { capBps: 10_000 } },
    rebalanceOnly: { rebalance: true },
    rebalanceFalse: { rebalance: false },
    both: { allocation: true, rebalance: true },
  } satisfies Record<string, PortfolioPermissions>);
  const failCases = harden({
    allocationCapTooLow: { allocation: { capBps: -1 } },
    allocationCapTooHigh: { allocation: { capBps: 10_001 } },
    allocationCapExtraField: { allocation: { capBps: 3000, future: true } },
    futurePermission: { futurePermission: true },
  }) satisfies Record<string, unknown>;

  for (const [name, specimen] of Object.entries(passCases)) {
    t.notThrows(
      () => mustMatch(specimen, PortfolioPermissionsShape),
      `${name}`,
    );
  }
  for (const [name, specimen] of Object.entries(failCases)) {
    t.false(matches(specimen, PortfolioPermissionsShape), `${name}`);
  }
});

test('PortfolioPermissionsExtShape remains forward compatible', t => {
  t.notThrows(() =>
    mustMatch(
      harden({
        allocation: { capBps: 3000, futureFlag: false },
        futurePermission: false,
      }),
      PortfolioPermissionsExtShape,
    ),
  );
  t.notThrows(() =>
    mustMatch(
      harden({ allocation: { future: { size: 1 } } }),
      PortfolioPermissionsExtShape,
    ),
  );
});
