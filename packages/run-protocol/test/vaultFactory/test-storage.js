// @ts-check

import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@endo/eventual-send';
import { makeTracer } from '../../src/makeTracer.js';
import '../../src/vaultFactory/types.js';
import { subscriptionKey } from '../supports.js';
import { makeDriverContext, makeManagerDriver } from './driver.js';

/** @typedef {import('./driver.js').DriverContext & {
 * }} Context */
/** @type {import('ava').TestInterface<Context>} */
// @ts-expect-error cast
const test = unknownTest;

const trace = makeTracer('TestLiq');

test.before(async t => {
  t.context = await makeDriverContext();
  trace(t, 'CONTEXT');
});

test('storage keys', async t => {
  const { aeth, run } = t.context;
  const d = await makeManagerDriver(t);

  // Root vault factory
  const vdp = d.getVaultDirectorPublic();
  t.is(
    await subscriptionKey(E(vdp).getMetrics()),
    'mockChainStorageRoot.vaultFactory.metrics',
  );
  t.is(
    await subscriptionKey(E(vdp).getElectorateSubscription()),
    'mockChainStorageRoot.vaultFactory.governance',
  );

  // First manager
  const managerA = await E(vdp).getCollateralManager(aeth.brand);
  t.is(
    await subscriptionKey(E(managerA).getMetrics()),
    'mockChainStorageRoot.vaultFactory.manager0.metrics',
  );
  t.is(
    await subscriptionKey(
      E(vdp).getSubscription({
        collateralBrand: aeth.brand,
      }),
    ),
    'mockChainStorageRoot.vaultFactory.manager0.governance',
  );

  // Second manager
  const [managerC, chit] = await d.addVaultType('Chit');
  t.is(
    await subscriptionKey(E(E(managerC).getPublicFacet()).getMetrics()),
    'mockChainStorageRoot.vaultFactory.manager1.metrics',
  );
  t.is(
    await subscriptionKey(
      E(vdp).getSubscription({
        collateralBrand: chit.brand,
      }),
    ),
    'mockChainStorageRoot.vaultFactory.manager1.governance',
  );

});
