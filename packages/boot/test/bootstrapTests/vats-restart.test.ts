/** @file Bootstrap test of restarting (almost) all vats */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import type { ScopedBridgeManager } from '@agoric/vats';
import { makeBootTestContext } from '../tools/boot-test-context.js';

const PLATFORM_CONFIG = '@agoric/vm-config/decentral-itest-vaults-config.json';

export const makeTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeBootTestContext(t, {
    configSpecifier: PLATFORM_CONFIG,
    snapshotName: 'itest-vaults-base',
  });
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  console.timeEnd('DefaultTestContext');

  const shared = { ibcCallbacks: undefined };

  return {
    ...swingsetTestKit,
    shared,
  };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;

test.before(async t => {
  t.context = await makeTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

test.serial('make IBC callbacks before upgrade', async t => {
  const { EV } = t.context.runUtils;
  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  t.log('E(ibc).makeCallbacks(m1)');
  const dummyBridgeManager = null as unknown as ScopedBridgeManager<any>;
  const callbacks = await EV(ibc as any).makeCallbacks(dummyBridgeManager);
  t.truthy(callbacks);
  t.context.shared.ibcCallbacks = callbacks;
});

test.serial('run restart-vats proposal', async t => {
  const { applyProposal } = t.context;

  t.log('building proposal');
  await applyProposal('@agoric/builders/scripts/vats/restart-vats.js');

  t.pass(); // reached here without throws
});

test.serial('use IBC callbacks after upgrade', async t => {
  const { EV } = t.context.runUtils;
  const { ibcCallbacks } = t.context.shared;

  const vatStore = await EV.vat('bootstrap').consumeItem('vatStore');
  const { root: ibc } = await EV(vatStore).get('ibc');
  t.log('E(ibc).createHandlers(...)');

  const h = await EV(ibc as any).createHandlers(ibcCallbacks);
  t.log(h);
  t.truthy(h.protocolHandler, 'protocolHandler');
  t.truthy(h.bridgeHandler, 'bridgeHandler');
});
