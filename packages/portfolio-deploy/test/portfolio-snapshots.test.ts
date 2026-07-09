import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  availablePortfolioSnapshotNames,
  isPortfolioSnapshotName,
} from './portfolio-snapshots.ts';

test('portfolio snapshot names are exposed and validated', t => {
  const names = availablePortfolioSnapshotNames();
  t.true(names.includes('portfolio-ready'));
  t.true(names.includes('portfolio-new-contract-ready'));
  t.true(isPortfolioSnapshotName('portfolio-ready'));
  t.true(isPortfolioSnapshotName('portfolio-new-contract-ready'));
  t.false(isPortfolioSnapshotName('not-a-snapshot'));
});
