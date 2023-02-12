import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {
 * }} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVC');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

// the common MakeVault invitation is provided by the VaultDirector and resolves the VaultManager
// based on the proposal. So the invitation maker can't know what VM it will be for.
test.failing('pause manager', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  await md.setGovernedFilters(['manager0:']);
  await eventLoopIteration();

  await t.throwsAsync(md.makeVaultDriver(aeth.make(100n), run.make(50n)), {
    message: '',
  });
});

test('AdjustBalances', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const vd = await md.makeVaultDriver(aeth.make(100n), run.make(50n));

  await md.setGovernedFilters(['manager0: AdjustBalances']);

  await t.throwsAsync(vd.giveCollateral(10n, aeth), {
    message: 'not accepting offer with description "manager0: AdjustBalances"',
  });
});

test('CloseVault', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const vd = await md.makeVaultDriver(aeth.make(100n), run.make(50n));

  await md.setGovernedFilters(['manager0: CloseVault']);

  await t.throwsAsync(vd.close(), {
    message: 'not accepting offer with description "manager0: CloseVault"',
  });
});

test('TransferVault', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const vd = await md.makeVaultDriver(aeth.make(100n), run.make(50n));

  await md.setGovernedFilters(['manager0: TransferVault']);

  await t.throwsAsync(vd.transfer(), {
    message: 'not accepting offer with description "manager0: TransferVault"',
  });
});
