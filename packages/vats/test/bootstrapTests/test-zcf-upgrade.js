// @ts-check

import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import bundleSource from '@endo/bundle-source';

import fs from 'fs/promises';
import path from 'path';

import { makeZoeTestContext } from './supports.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const ZCF_PROBE_SRC = './zcfProbe.js';

/**
 * @file Bootstrap test of upgrading ZCF to support atomicRearrange internally.
 *
 * The basic goal is to tell Zoe about a new version of ZCF that it should use
 * when starting new contracts. Zoe wasn't previously configurable for that, so
 * a prerequisite was to upgrade Zoe to a version that could have its ZCF
 * updated. To test that we install a contract that can detect the variation
 * among zcf versions, and run it before, in the middle and after the upgrades.
 *
 *  0. add a contract that can report on the state of ZCF's support for
 *     different versions of reallocation: staging, helper, and internal.
 *  1. put new Zoe & ZCF bundles on chain
 *  2. upgrade Zoe; return a new facet that supports ZCF update
 *  3. tell Zoe to use new ZCF
 *  4. restart the new contract; verify that the behavior is unchanged.
 *  5. null upgrade the contract; verify that zcf supports internal rearrange.
 *  6. [optional] fully upgrade the contract; verify that it works
 */

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>} */
const test = anyTest;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});
test.after.always(t => t.context.shutdown?.());

test.serial('run restart-vats proposal', async t => {
  const { controller, buildProposal, zoeDriver } = t.context;
  const { EV } = t.context.runUtils;

  const zcfProbeBundle = await bundleSource(`${dirname}/${ZCF_PROBE_SRC}`);
  const { brand, issuer } = await zoeDriver.instantiateProbeContract(
    zcfProbeBundle,
  );
  await controller.validateAndInstallBundle(zcfProbeBundle);

  const ducatRecord = v => ({ Ducats: { brand, value: v } });

  t.deepEqual(await zoeDriver.verifyRealloc(), {});

  const ducats = await zoeDriver.faucet();
  const initialAmount = await EV(issuer).getAmountOf(ducats);

  const beforeResult = await zoeDriver.probeReallocation(initialAmount, ducats);
  t.true(beforeResult.stagingResult);
  t.true(beforeResult.helperResult);
  t.false(beforeResult.internalResult);
  t.deepEqual(await zoeDriver.verifyRealloc(), ducatRecord(2n));

  t.log('building proposal');

  // /////// Upgrading ////////////////////////////////
  const proposal = await buildProposal({
    package: 'vats',
    packageScriptName: 'build:zcf-proposal',
  });

  for await (const bundle of proposal.bundles) {
    await controller.validateAndInstallBundle(bundle);
  }

  const bundles = {
    zcfRef: 'upgrade-test-scripts/agoric-upgrade-11/Zcf-upgrade-bundle.json',
    zoeRef: 'upgrade-test-scripts/agoric-upgrade-11/Zoe-upgrade-bundle.json',
  };
  for await (const filePath of Object.values(bundles)) {
    const source = `${dirname}/../../../deployment/upgrade-test/${filePath}`;
    const bundle = await fs.readFile(source, 'utf8').then(s => JSON.parse(s));
    await controller.validateAndInstallBundle(harden(bundle));
  }

  t.log('installed', proposal.bundles.length, 'bundles');

  t.log('launching proposal');
  const bridgeMessage = {
    type: 'CORE_EVAL',
    evals: proposal.evals,
  };

  t.log({ bridgeMessage });
  /** @type {ERef<import('../../src/types.js').BridgeHandler>} */
  const coreEvalBridgeHandler = await EV.vat('bootstrap').consumeItem(
    'coreEvalBridgeHandler',
  );
  await EV(coreEvalBridgeHandler).fromBridge(bridgeMessage);

  t.log('restart-vats proposal executed');
  zoeDriver.upgradeProbe(zcfProbeBundle);
  const nextDucats = beforeResult.leftoverPayments.Ducats;
  const nextAmount = await EV(issuer).getAmountOf(nextDucats);

  const afterResult = await zoeDriver.probeReallocation(nextAmount, nextDucats);
  t.true(afterResult.stagingResult);
  t.true(afterResult.helperResult);
  t.true(afterResult.internalResult);
  t.deepEqual(await zoeDriver.verifyRealloc(), ducatRecord(5n));
});
