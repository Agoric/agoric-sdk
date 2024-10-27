/* eslint-env node */
import test from 'ava';
import { assert, q, Fail } from '@endo/errors';
import { E } from '@endo/far';
import { BridgeId, objectMap } from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  defaultBootstrapMessage,
  makeCosmicSwingsetTestKit,
} from '../tools/test-kit.js';
import { provideEnhancedKVStore } from '../src/helpers/bufferedStorage.js';
import {
  DEFAULT_SIM_SWINGSET_PARAMS,
  makeVatCleanupBudgetFromKeywords,
} from '../src/sim-params.js';

/** @import { KVStore } from '../src/helpers/bufferedStorage.js' */

/**
 * Converts a Record<name, specifierString> into Record<name, { sourceSpec }>
 * for defining e.g. a `bundles` group.
 *
 * @param {Record<string, string>} src
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
  const { pushCoreEval, runNextBlock, shutdown, swingStore } =
    await makeCosmicSwingsetTestKit(receiveBridgeSend, {
      bundles: makeSourceDescriptors({
        puppet: '@agoric/swingset-vat/tools/vat-puppet.js',
      }),
      fixupBootMsg: () => ({
        ...defaultBootstrapMessage,
        params: makeCleanupBudgetParams({ Default: 0 }),
      }),
    });
  const mapStore = provideEnhancedKVStore(
    /** @type {KVStore<string>} */ (swingStore.kernelStorage.kvStore),
  );
  /** @type {(key: string) => string} */
  const mustGet = key => {
    const value = mapStore.get(key);
    assert(value !== undefined, `kvStore entry for ${key} must exist`);
    return value;
  };

  // Launch the new vat and capture its ID.
  pushCoreEval(async powers => {
    const { bootstrap } = powers.vats;
    await E(bootstrap).createVat('doomed', 'puppet');
  });
  await runNextBlock();
  const vatIDs = JSON.parse(mustGet('vat.dynamicIDs'));
  const vatID = vatIDs.at(-1);
  t.is(
    vatID,
    'v8',
    `time to update expected vatID to ${JSON.stringify(vatIDs)}.at(-1)?`,
  );

  // Terminate the vat and assert lack of cleanup.
  pushCoreEval(async powers => {
    const { bootstrap } = powers.vats;
    const vat = await E(bootstrap).getVatRoot('doomed');
    // TODO: Give the vat a big footprint, similar to
    // packages/SwingSet/test/vat-admin/slow-termination/slow-termination.test.js
    await E(vat).dieHappy();
  });
  await runNextBlock();
  // TODO: Assert lack of cleanup.

  await runNextBlock({
    params: makeCleanupBudgetParams({ Default: 2, Kv: 3 }),
  });
  // TODO: Assert limited cleanup.
  // TODO: Further cleanup assertions.

  await shutdown();
});
