import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from './supports.js';
import { checkDebtLimit } from '../src/contractSupport.js';

const debt = withAmountUtils(makeIssuerKit('rupies'));

const limit = debt.make(3n);
const prior = debt.make(1n);

test('checkDebtLimit allows below', t => {
  t.notThrows(() => checkDebtLimit(limit, prior, debt.make(1n)));
});

test('checkDebtLimit allows at limit', t => {
  t.notThrows(() => checkDebtLimit(limit, prior, debt.make(2n)));
});

test('checkDebtLimit throws above', t => {
  t.throws(() => checkDebtLimit(limit, prior, debt.make(3n)));
});

test('checkDebtLimit always succeeds if there is nothing to mint', t => {
  const bigPrior = debt.make(5n);
  t.notThrows(() => checkDebtLimit(limit, bigPrior, debt.make(0n)));
});
