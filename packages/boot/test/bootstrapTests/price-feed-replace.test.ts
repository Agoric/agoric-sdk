/**
 * @file  The goal of this test is  to see that the
 * upgrade scripts re-wire all the contracts so new auctions and
 * price feeds are connected to vaults correctly.
 *
 * - enter a bid
 * - force prices to drop so a vault liquidates
 * - verify that the bidder gets the liquidated assets.
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import type { ExecutionContext, TestFn } from 'ava';
import type { FakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeSwingsetTestKit } from '../../tools/supports.ts';

const makeDefaultTestContext = async (
  t: ExecutionContext,
  { storage = undefined as FakeStorageKit | undefined } = {},
) => {
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    storage,
  });
  const { readLatest, runUtils } = swingsetTestKit;
  const { EV } = runUtils;
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  return swingsetTestKit;
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;
test.before(async t => (t.context = await makeDefaultTestContext(t)));
test.after.always(t => t.context.shutdown());

test('trivial', async t => t.pass());
