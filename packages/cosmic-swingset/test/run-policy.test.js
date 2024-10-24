/* eslint-env node */
import test from 'ava';
import { Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import { BridgeId, objectMap } from '@agoric/internal';
import { CORE_EVAL } from '@agoric/internal/src/action-types.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';
import {
  DEFAULT_SIM_SWINGSET_PARAMS,
  makeVatCleanupBudgetFromKeywords,
} from '../src/sim-params.js';

/**
 * @param {Record<string, string: specifier>} src
 * @returns {import('@agoric/swingset-vat').SwingSetConfigDescriptor}
 */
const makeSourceDescriptors = src => {
  const hardened = objectMap(src, sourceSpec => ({ sourceSpec }));
  return JSON.parse(JSON.stringify(hardened));
};

/**
 * @param {import('../src/sim-params.js').VatCleanupKeywordsRecord} budget
 * @returns {import('@agoric/cosmic-proto/swingset/swingset.js').ParamsSDKType}
 */
const makeCleanupBudgetParams = budget => {
  return {
    ...DEFAULT_SIM_SWINGSET_PARAMS,
    vat_cleanup_budget: makeVatCleanupBudgetFromKeywords(budget),
  };
};

test('cleanup work must be limited by vat_cleanup_budget', async t => {
  const { toStorage: handleVstorage } = makeFakeStorageKit('');
  const receiveBridgeSend = (destPort, msg) => {
    switch (destPort) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      default:
        Fail`port ${q(destPort)} not implemented for message ${msg}`;
    }
  };
  const {
    actionQueue,
    getLastBlockInfo,
    makeQueueRecord,
    runNextBlock,
    shutdown,
    swingStore,
  } = await makeCosmicSwingsetTestKit(receiveBridgeSend, {
    bundles: makeSourceDescriptors({
      exporter: '@agoric/swingset-vat/test/vat-exporter.js',
    }),
  });
  await runNextBlock({
    params: makeCleanupBudgetParams({ Default: 0 }),
  });

  // We'll be interacting through core evals.
  // TODO: But will probably also need controller access for deep inspection.
  const pushCoreEval = fn =>
    actionQueue.push(
      makeQueueRecord({
        type: CORE_EVAL,
        evals: [
          {
            json_permits: 'true',
            js_code: String(fn),
          },
        ],
      }),
    );

  pushCoreEval(async powers => {
    const bootstrap = powers.vats.bootstrap;
    const vat = await E(bootstrap).createVat({
      name: 'doomed',
      bundleCapName: 'exporter',
    });
    // TODO: Give the vat a big footprint, then terminate it.
  });
  await runNextBlock();
  // TODO: Assert lack of cleanup.

  await runNextBlock({
    params: makeCleanupBudgetParams({ Default: 2, Kv: 3 }),
  });
  // TODO: Assert limited cleanup.
  // TODO: Further cleanup assertions.
});
