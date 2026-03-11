import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  availablePortfolioFixtureNames,
  isPortfolioFixtureName,
} from './portfolio-fixtures.ts';

test('portfolio fixture names are exposed and validated', t => {
  const names = availablePortfolioFixtureNames();
  t.true(names.includes('portfolio-ready'));
  t.true(names.includes('portfolio-new-contract-ready'));
  t.true(isPortfolioFixtureName('portfolio-ready'));
  t.true(isPortfolioFixtureName('portfolio-new-contract-ready'));
  t.false(isPortfolioFixtureName('not-a-fixture'));
});
