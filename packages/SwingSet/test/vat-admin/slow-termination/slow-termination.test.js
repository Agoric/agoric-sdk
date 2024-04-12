// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';

import tmp from 'tmp';
import sqlite3 from 'better-sqlite3';
import path from 'path';

import { kser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';

import { buildVatController, buildKernelBundles } from '../../../src/index.js';
import { enumeratePrefixedKeys } from '../../../src/kernel/state/storageHelper.js';

/**
 * @param {string} [prefix]
 * @returns {Promise<[string, () => void]>}
 */
export const tmpDir = prefix =>
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true, prefix }, (err, name, removeCallback) => {
      if (err) {
        reject(err);
      } else {
        resolve([name, removeCallback]);
      }
    });
  });

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

const makeCleanupPolicy = () => {
  let budget = 5;
  let cleanups = 0;
  const stop = () => false;
  const policy = harden({
    vatCreated: stop,
    crankComplete: stop,
    crankFailed: stop,
    emptyCrank: stop,
    allowCleanup() {
      if (budget > 0) {
        return { budget };
      } else {
        return false;
      }
    },
    didCleanup(spent) {
      budget -= spent.cleanups;
      cleanups += spent.cleanups;
    },
  });
  const getCleanups = () => cleanups;
  return [policy, getCleanups];
};

const bfile = relpath => new URL(relpath, import.meta.url).pathname;

async function doSlowTerminate(t, mode) {
  const config = {
    defaultManagerType: 'xsnap',
    defaultReapInterval: 'never',
    snapshotInitial: 2, // same as the default
    snapshotInterval: 10, // ensure multiple spans+snapshots
    bootstrap: 'bootstrap',
    bundles: {
      dude: {
        sourceSpec: bfile('vat-slow-terminate.js'),
      },
    },
    vats: {
      bootstrap: {
        sourceSpec: bfile('bootstrap-slow-terminate.js'),
      },
    },
  };
  const noCleanupPolicy = {
    allowCleanup: () => false,
    vatCreated: () => true,
    crankComplete: () => true,
    crankFailed: () => true,
    emptyCrank: () => true,
    didCleanup: () => true,
  };

  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);

  const ss = initSwingStore(dbDir);
  const { kernelStorage } = ss;
  const { commit } = ss.hostStorage;
  const { kvStore } = kernelStorage;
  // look directly at DB to confirm changes
  const db = sqlite3(path.join(dbDir, 'swingstore.sqlite'));

  const controller = await buildVatController(config, [], {
    ...t.context.data,
    kernelStorage,
  });
  t.teardown(controller.shutdown);
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  controller.pinVatRoot('bootstrap');
  await controller.run(noCleanupPolicy);
  await commit();
  t.is(controller.kpStatus(controller.bootstrapResult), 'fulfilled');
  t.deepEqual(
    controller.kpResolution(controller.bootstrapResult),
    kser('bootstrap done'),
  );

  // bootstrap adds a fair amount of vat-dude state:
  // * we have c-list entries for 20 imports and 20 exports, each of
  //   which need two kvStore entries, so 80 kvStore total
  // * the vat has created 20 baggage entries, all of which go into
  //   the vatstore, adding 20 kvStore
  // * an empty vat has about 29 kvStore entries just to track
  //   counters, the built-in collection types, baggage itself, etc
  // * by sending 40-plus deliveries into an xsnap vat with
  //   snapInterval=5, we get 8-ish transcript spans (7 old, 1
  //   current), and each old span generates a heap snapshot record
  // Slow vat termination means deleting these entries slowly.

  const vatID = JSON.parse(kvStore.get('vat.dynamicIDs'))[0];
  t.is(vatID, 'v6'); // change if necessary
  const remainingKV = () =>
    Array.from(enumeratePrefixedKeys(kvStore, `${vatID}.`));
  const remainingSnapshots = () =>
    db
      .prepare('SELECT COUNT(*) FROM snapshots WHERE vatID=?')
      .pluck()
      .get(vatID);
  const remainingTranscriptItems = () =>
    db
      .prepare('SELECT COUNT(*) FROM transcriptItems WHERE vatID=?')
      .pluck()
      .get(vatID);
  const remainingTranscriptSpans = () =>
    db
      .prepare('SELECT COUNT(*) FROM transcriptSpans WHERE vatID=?')
      .pluck()
      .get(vatID);

  // 20*2 for imports, 21*2 for exports, 20*1 for vatstore = 102
  // plus 27 for usual liveslots stuff
  t.is(remainingKV().length, 129);
  t.false(JSON.parse(kvStore.get('vats.terminated')).includes(vatID));
  // we get one span for snapshotInitial (=2), then a span every
  // snapshotInterval (=10). Each non-current span creates a
  // snapshot.
  t.is(remainingTranscriptSpans(), 6);
  t.is(remainingTranscriptItems(), 59);
  t.is(remainingSnapshots(), 5);
  const remaining = () =>
    remainingKV().length +
    remainingSnapshots() +
    remainingTranscriptItems() +
    remainingTranscriptSpans();

  // note: mode=dieHappy means we send one extra message to the vat,
  // which adds a single transcript item (but this doesn't happen to trigger an extra span)

  const kpid = controller.queueToVatRoot('bootstrap', 'kill', [mode]);
  await controller.run(noCleanupPolicy);
  await commit();
  t.is(controller.kpStatus(kpid), 'fulfilled');
  t.deepEqual(
    controller.kpResolution(kpid),
    kser('kill done, Error: vat terminated'),
  );

  t.true(JSON.parse(kvStore.get('vats.terminated')).includes(vatID));
  // no cleanups were allowed, so nothing should be removed yet
  t.truthy(kernelStorage.kvStore.get(`${vatID}.options`, undefined));
  t.is(remainingKV().length, 129);

  // now do a series of cleanup runs, each with budget=5
  const clean = async () => {
    const [policy, _getCleanups] = makeCleanupPolicy();
    await controller.run(policy);
    await commit();
  };

  // cleanup currently deletes c-list exports, then c-list imports,
  // then all other kvStore entries, then snapshots, then transcripts

  let leftKV = remainingKV().length;
  const cleanKV = async expected => {
    await clean();
    const newLeftKV = remainingKV().length;
    t.is(leftKV - newLeftKV, expected);
    leftKV = newLeftKV;
  };

  // we have 21 c-list exports (1 vat root, plus 20 we added), we
  // delete them 5 at a time (2 kv each, so 10kv per clean)
  await cleanKV(10); // 5 c-list exports
  await cleanKV(10); // 5 c-list exports
  await cleanKV(10); // 5 c-list exports
  await cleanKV(10); // 5 c-list exports

  // we have one export left, so this clean(budget=5) will delete the
  // two kv for the export, then the first four of our 20 c-list
  // imports, each of which also has 2 kv)

  await cleanKV(10); // 1 c-list exports, 4 c-list imports
  await cleanKV(10); // 5 c-list imports
  await cleanKV(10); // 5 c-list imports
  await cleanKV(10); // 5 c-list imports

  // we have one import left, so this clean(budget=5) will delete its
  // two kv, then the first four of our 47 other kv entries (20
  // vatstore plus 27 liveslots overhead
  await cleanKV(6); // 1 c-list import, 4 other kv
  // now there are 45 other kv entries left
  t.is(remainingKV().length, 43);

  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv
  t.is(remainingSnapshots(), 5);
  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv
  await cleanKV(5); // 5 other kv

  // we have 3 kv entries left, so budget=5 will delete those three,
  // then two snapshots
  t.is(remainingSnapshots(), 5);
  await clean();
  t.deepEqual(remainingKV(), []);
  t.is(kernelStorage.kvStore.get(`${vatID}.options`, undefined));
  t.is(remainingSnapshots(), 3);
  t.is(remainingTranscriptSpans(), 6);
  if (mode === 'dieHappy') {
    t.is(remainingTranscriptItems(), 60);
  } else {
    t.is(remainingTranscriptItems(), 59);
  }

  // the next clean will delete the remaining three snapshots, plus
  // two transcript spans, starting with the isCurrent=1 one (which
  // had 9 or 10 items), finishing with the last old span (which had
  // 10)

  await clean();
  t.is(remainingSnapshots(), 0);
  t.is(remainingTranscriptSpans(), 4);
  t.is(remainingTranscriptItems(), 40);
  t.true(JSON.parse(kvStore.get('vats.terminated')).includes(vatID));

  // the final clean deletes the remaining spans, and finishes by
  // removing the "still being deleted" bookkeeping, and the .options

  await clean();
  t.is(remainingTranscriptSpans(), 0);
  t.is(remainingTranscriptItems(), 0);
  t.is(remaining(), 0);

  t.false(JSON.parse(kvStore.get('vats.terminated')).includes(vatID));
}

test.serial('slow terminate (kill)', async t => {
  await doSlowTerminate(t, 'kill');
});

test.serial('slow terminate (die happy)', async t => {
  await doSlowTerminate(t, 'dieHappy');
});
