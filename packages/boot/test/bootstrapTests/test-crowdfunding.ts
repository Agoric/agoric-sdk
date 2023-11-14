/** @file Bootstrap test integration crowdfunding with smart-wallet */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import type { TestFn } from 'ava';
import { makeSwingsetTestKit } from './supports.ts';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(
    t.log,
    'bundles/crowdfunding',
    {
      configSpecifier: '@agoric/vm-config/demo-crowdfunding-config.json',
    },
  );

  const { runUtils } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');
  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  console.timeEnd('DefaultTestContext');

  return { ...swingsetTestKit, agoricNamesRemotes };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test('instantiated', async t => {
  const { agoricNamesRemotes } = t.context;
  t.truthy(agoricNamesRemotes.instance.crowdfunding);
});

test('register a fund', async t => {
  const { EV } = t.context.runUtils;
  const crowdfundingKit: StartedInstanceKit<
    (typeof import('@agoric/crowdfunding/src/crowdfunding.contract.js'))['start']
  > = await EV.vat('bootstrap').consumeItem('crowdfundingKit');
  const inv = await EV(crowdfundingKit.publicFacet).makeProvisionInvitation();
  console.log('inv', inv);
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const seat = await EV(zoe).offer(inv, { give: {}, want: {} }, {});
  const result = await EV(seat).getOfferResult();
  t.deepEqual(result, {
    key: '1',
  });
});
