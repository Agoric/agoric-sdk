/* eslint-env node */
import type { ParamsSDKType } from '@agoric/cosmic-proto/swingset/swingset.js';
import { BridgeId, deepCopyJsonable, objectMap } from '@agoric/internal';
import type { BlockInfo } from '@agoric/internal/src/chain-utils.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import type { SwingSetConfigDescriptor } from '@agoric/swingset-vat';
import { assert, Fail, q } from '@endo/errors';
import { E } from '@endo/far';
import type { TestFn } from 'ava';
import anyTest from 'ava';
import type { KVStore } from '../src/helpers/bufferedStorage.js';
import { provideEnhancedKVStore } from '../src/helpers/bufferedStorage.js';
import {
  DEFAULT_SIM_SWINGSET_PARAMS,
  makeVatCleanupBudgetFromKeywords,
  type VatCleanupKeywordsRecord,
} from '../src/sim-params.js';
import {
  defaultBootstrapMessage,
  defaultInitMessage,
  makeCosmicSwingsetTestKit,
} from '../tools/test-kit.js';

const test = anyTest as TestFn;

/**
 * Converts a Record<name, specifierString> into Record<name, { sourceSpec }>
 * for defining e.g. a `bundles` group.
 */
const makeSourceDescriptors = (
  src: Record<string, string>,
): SwingSetConfigDescriptor => {
  const hardened = objectMap(src, sourceSpec => ({ sourceSpec }));
  return deepCopyJsonable(hardened);
};

const makeCleanupBudgetParams = (
  budget: VatCleanupKeywordsRecord,
): ParamsSDKType => {
  return {
    ...DEFAULT_SIM_SWINGSET_PARAMS,
    vat_cleanup_budget: makeVatCleanupBudgetFromKeywords(budget),
  };
};

test('cleanup work must be limited by vat_cleanup_budget', async t => {
  let finish: (() => Promise<void>) | undefined;
  t.teardown(() => finish?.());
  // Make a test kit.
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPortName: string, msg: any) => {
    switch (destPortName) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      default:
        Fail`port ${q(destPortName)} not implemented for message ${msg}`;
    }
  };
  const options = {
    bundles: makeSourceDescriptors({
      puppet: '@agoric/swingset-vat/tools/vat-puppet.js',
    }),
    configOverrides: {
      // Aggressive GC.
      defaultReapInterval: 1,
      // Ensure multiple spans and snapshots.
      defaultManagerType: 'xsnap' as const,
      snapshotInitial: 2,
      snapshotInterval: 4,
    },
    fixupInitMessage: () => ({
      ...defaultBootstrapMessage,
      params: makeCleanupBudgetParams({ Default: 0 }),
    }),
  };
  const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, options);
  const { pushCoreEval, runNextBlock, shutdown, swingStore } = testKit;
  finish = shutdown;
  await runNextBlock();

  // Define helper functions for interacting with its swing store.
  const mapStore = provideEnhancedKVStore(
    swingStore.kernelStorage.kvStore as KVStore<string>,
  );
  const mustGet = (key: string): string => {
    const value = mapStore.get(key);
    assert(value !== undefined, `kvStore entry for ${key} must exist`);
    return value;
  };

  // Launch the new vat and capture its ID.
  pushCoreEval(
    `${async powers => {
      const { bootstrap } = powers.vats;
      await E(bootstrap).createVat('doomed', 'puppet');
    }}`,
  );
  await runNextBlock();
  const vatIDs: string[] = JSON.parse(mustGet('vat.dynamicIDs'));
  const vatID = vatIDs.at(-1);
  t.is(
    vatID,
    'v8',
    `time to update expected vatID to ${JSON.stringify(vatIDs)}.at(-1)?`,
  );
  t.false(
    JSON.parse(mustGet('vats.terminated')).includes(vatID),
    'must not be terminated',
  );
  // This key is/was used as a predicate for vat liveness.
  // https://github.com/Agoric/agoric-sdk/blob/7ae1f278fa8cbeb0cfc777b7cebf507b1f07c958/packages/SwingSet/src/kernel/state/kernelKeeper.js#L1706
  const sentinelKey = `${vatID}.o.nextID`;
  t.true(mapStore.has(sentinelKey));

  // Define helper functions for interacting the vat's kvStore.
  const getKV = (): [string, string][] =>
    [...mapStore.entries()].filter(([key]) => key.startsWith(`${vatID}.`));
  const initialEntries = new Map(getKV());
  t.not(initialEntries.size, 0, 'initial kvStore entries must exist');

  // Give the vat a big footprint.
  pushCoreEval(
    `${async powers => {
      const { bootstrap } = powers.vats;
      const doomed = await E(bootstrap).getVatRoot('doomed');

      const makeArray = <T>(
        length: number,
        makeElem: (v: unknown, i: number) => T,
      ) => Array.from({ length }, makeElem);

      // import 20 remotables and 10 promises
      const doomedRemotableImports = await Promise.all(
        makeArray(20, (_, i) =>
          E(bootstrap).makeRemotable(`doomed import ${i}`),
        ),
      );
      const doomedPromiseImports = (
        await Promise.all(makeArray(10, () => E(bootstrap).makePromiseKit()))
      ).map(kit => kit.promise);
      const doomedImports = [
        ...doomedRemotableImports,
        ...doomedPromiseImports,
      ];
      await E(doomed).holdInHeap(doomedImports);

      // export 20 remotables and 10 promises to bootstrap
      const doomedRemotableExports = await Promise.all(
        makeArray(20, (_, i) => E(doomed).makeRemotable(`doomed export ${i}`)),
      );
      const doomedPromiseExports = (
        await Promise.all(makeArray(10, () => E(doomed).makePromiseKit()))
      ).map(kit => {
        const { promise } = kit;
        void promise.catch(() => {});
        return promise;
      });
      const doomedExports = [
        ...doomedRemotableExports,
        ...doomedPromiseExports,
      ];
      await E(bootstrap).holdInHeap(doomedExports);

      // make 20 extra vatstore entries
      await E(doomed).holdInBaggage(...makeArray(20, (_, i) => i));
    }}`,
  );
  await runNextBlock();
  t.false(
    JSON.parse(mustGet('vats.terminated')).includes(vatID),
    'must not be terminated',
  );
  const peakEntries = new Map(getKV());
  t.deepEqual(
    [...peakEntries.keys()].filter(key => initialEntries.has(key)),
    [...initialEntries.keys()],
    'initial kvStore keys must still exist',
  );
  t.true(
    peakEntries.size > initialEntries.size + 20,
    `kvStore entry count must grow by more than 20: ${initialEntries.size} -> ${peakEntries.size}`,
  );

  // Terminate the vat and verify lack of cleanup.
  pushCoreEval(
    `${async powers => {
      const { bootstrap } = powers.vats;
      const adminNode = await E(bootstrap).getVatAdminNode('doomed');
      await E(adminNode).terminateWithFailure();
    }}`,
  );
  await runNextBlock();
  t.true(
    JSON.parse(mustGet('vats.terminated')).includes(vatID),
    'must be terminated',
  );
  t.deepEqual(
    [...getKV().map(([key]) => key)],
    [...peakEntries.keys()],
    'kvStore keys must remain',
  );

  // Allow some cleanup.
  // TODO: Verify snapshots and transcripts with `Default: 2`
  // cf. packages/SwingSet/test/vat-admin/slow-termination/bootstrap-slow-terminate.js
  await runNextBlock({
    params: makeCleanupBudgetParams({ Default: 2 ** 32, Kv: 0 }),
  });
  const onlyKV = getKV();
  t.true(
    onlyKV.length < peakEntries.size,
    `kvStore entry count should have dropped from export/import cleanup: ${peakEntries.size} -> ${onlyKV.length}`,
  );
  await runNextBlock({
    params: makeCleanupBudgetParams({ Default: 2 ** 32, Kv: 3 }),
  });
  t.is(getKV().length, onlyKV.length - 3, 'initial kvStore deletion');
  let lastBlockInfo: BlockInfo | undefined = await runNextBlock();
  t.is(getKV().length, onlyKV.length - 6, 'further kvStore deletion');

  // Wait for the sentinel key to be removed, then re-instantiate the swingset
  // and allow remaining cleanup.
  while (mapStore.has(sentinelKey)) {
    lastBlockInfo = await runNextBlock();
  }
  await shutdown({ kernelOnly: true });
  finish = undefined;
  {
    // Pick up where we left off with the same data and block,
    // but with a new budget.
    const newOptions = {
      ...options,
      swingStore,
      fixupInitMessage: () => ({
        ...defaultInitMessage,
        ...lastBlockInfo,
        params: makeCleanupBudgetParams({ Default: 2 ** 32 }),
      }),
    };

    const { runNextBlock: runNextBlock2, shutdown: shutdown2 } =
      await makeCosmicSwingsetTestKit(receiveBridgeSend, newOptions);
    finish = shutdown2;

    await runNextBlock2();
    t.is(getKV().length, 0, 'cleanup complete');
  }
});
