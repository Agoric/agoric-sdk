import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';
import { subscribeEach } from '@agoric/notifier';

import { assertTopicPathData } from '../supports.js';
import { makeDriverContext, makeManagerDriver } from './driver.js';
import '../../src/vaultFactory/types.js';
import { subscriptionTracker } from '../metrics.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestLiq', false);

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('storage keys', async t => {
  const { aeth, run } = t.context;
  const d = await makeManagerDriver(t);

  // Root vault factory
  const vdp = d.getVaultDirectorPublic();
  await assertTopicPathData(
    t,
    // @ts-expect-error VaultDirector has a compatible getPublicTopics().
    vdp,
    'metrics',
    'mockChainStorageRoot.vaultFactory.metrics',
    ['collaterals', 'rewardPoolAllocation'],
  );

  // First manager
  const managerA = await E(vdp).getCollateralManager(aeth.brand);
  await assertTopicPathData(
    t,
    managerA,
    'asset',
    'mockChainStorageRoot.vaultFactory.managers.manager0',
    ['compoundedInterest', 'interestRate', 'latestInterestUpdate'],
  );
  await assertTopicPathData(
    t,
    managerA,
    'metrics',
    'mockChainStorageRoot.vaultFactory.managers.manager0.metrics',
    [
      'liquidatingCollateral',
      'liquidatingDebt',
      'lockedQuote',
      'numActiveVaults',
      'numLiquidatingVaults',
      'numLiquidationsAborted',
      'numLiquidationsCompleted',
      'retainedCollateral',
      'totalCollateral',
      'totalCollateralSold',
      'totalDebt',
      'totalOverageReceived',
      'totalProceedsReceived',
      'totalShortfallReceived',
    ],
  );

  // Second manager
  const [managerC] = await d.addVaultType('Chit');
  await assertTopicPathData(
    t,
    E(managerC).getPublicFacet(),
    'asset',
    'mockChainStorageRoot.vaultFactory.managers.manager1',
  );
  await assertTopicPathData(
    t,
    E(managerC).getPublicFacet(),
    'metrics',
    'mockChainStorageRoot.vaultFactory.managers.manager1.metrics',
  );

  // First aeth vault
  const vda1 = await d.makeVaultDriver(aeth.make(1000n), run.make(50n));
  t.is(
    await E.get(vda1.getVaultSubscriber()).storagePath,
    'mockChainStorageRoot.vaultFactory.managers.manager0.vaults.vault0',
  );

  // Second aeth vault
  const vda2 = await d.makeVaultDriver(aeth.make(1000n), run.make(50n));
  t.is(
    await E.get(vda2.getVaultSubscriber()).storagePath,
    'mockChainStorageRoot.vaultFactory.managers.manager0.vaults.vault1',
  );
});

test('quotes storage', async t => {
  const { aeth, run } = t.context;
  const d = await makeManagerDriver(t);

  const aethManager = await E(d.getVaultDirectorPublic()).getCollateralManager(
    aeth.brand,
  );

  const storedNotifier = await E(aethManager).getQuotes();
  t.is(
    await E(storedNotifier).getPath(),
    'mockChainStorageRoot.vaultFactory.managers.manager0.quotes',
  );

  let latest = await E(storedNotifier).getUpdateSince();
  t.deepEqual(Object.keys(latest), ['updateCount', 'value']);
  let quoteValue = latest.value.quoteAmount.value[0];
  t.deepEqual(quoteValue.amountIn, aeth.make(1n));
  t.deepEqual(quoteValue.amountOut, run.make(5n));

  const base = 100n; // driver's Aeth base price is 100
  const highPrice = 1234n;
  d.setPrice(run.make(highPrice * base));
  latest = await E(storedNotifier).getUpdateSince();
  quoteValue = latest.value.quoteAmount.value[0];
  t.log(
    quoteValue,
    quoteValue.amountOut.value,
    quoteValue.amountIn.value,
    quoteValue.amountOut.value / quoteValue.amountIn.value,
  );
  // @ts-expect-error thinks the left argument is Number
  t.is(quoteValue.amountOut.value / quoteValue.amountIn.value, highPrice);
});

test('governance params', async t => {
  const md = await makeManagerDriver(t);
  const vdp = md.getVaultDirectorPublic();
  // @ts-expect-error VDP's getPublicTopics() has governance.
  const g = await E.get(E(vdp).getPublicTopics()).governance;
  t.is(await g.storagePath, 'mockChainStorageRoot.vaultFactory.governance');

  const gSubscriber = g.subscriber;

  const gTrack = await subscriptionTracker(t, subscribeEach(gSubscriber));
  await gTrack.assertLike({
    current: {
      ChargingPeriod: { type: 'nat', value: 2n },
      Electorate: { type: 'invitation' },
      ReferencedUI: { type: 'string', value: 'NO REFERENCE' },
      MinInitialDebt: { type: 'amount' },
      RecordingPeriod: { type: 'nat', value: 6n },
      ShortfallInvitation: { type: 'invitation' },
    },
  });

  await md.setGovernedParam('ChargingPeriod', 99n);

  await gTrack.assertChange({
    current: { ChargingPeriod: { value: 99n } },
  });
});
