// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import sqlite3 from 'better-sqlite3';
import {
  initSwingStore,
  makeSnapStore,
  makeSnapStoreIO,
} from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

/** @import {SwingSetConfigProperties, VatConfigOptions} from '../../src/types-external.js' */

/** @typedef {[snapPos: number, spanStart: number, spanEnd: number]} ExpectedPosition */

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {boolean} restartWorkerOnSnapshot
 * @param {SwingSetConfigProperties<VatConfigOptions>} vatConfig
 */
const vatReload = async (t, restartWorkerOnSnapshot, vatConfig) => {
  /** @type {import('../../src/types-external.js').SwingSetConfig} */
  const config = {
    defaultReapInterval: 'never',
    snapshotInitial: 3,
    snapshotInterval: 5,
    defaultManagerType: 'local',
    vats: {
      target: vatConfig,
    },
  };

  const db = sqlite3(':memory:');
  const snapStore = makeSnapStore(db, () => {}, makeSnapStoreIO());
  const kernelStorage = { ...initSwingStore().kernelStorage, snapStore };

  const argv = [];
  await initializeSwingset(config, argv, kernelStorage);

  const warehousePolicy = { restartWorkerOnSnapshot };
  const runtimeOptions = { warehousePolicy };

  const c1 = await makeSwingsetController(kernelStorage, null, runtimeOptions);
  c1.pinVatRoot('target');
  const vatID = c1.vatNameToID('target');

  const { creationOptions } = vatConfig;

  // Only xs-worker support snapshots
  const isSnapshotting =
    creationOptions.managerType === 'xs-worker' ||
    creationOptions.managerType === 'xsnap';

  const { useTranscript = true } = creationOptions;

  let sturdyCounter = 0;
  let ephemeralCounter = 0;
  const getNextCountLog = () => {
    ephemeralCounter += 1;
    sturdyCounter += 1;
    return `ephemeralCounter=${ephemeralCounter} sturdyCounter=${sturdyCounter}`;
  };

  // initialize-worker, startVat
  let expectedSystemDeliveries = 2;
  const assumeSnapshot = () => {
    if (isSnapshotting) {
      // BYOD, save-snapshot, load-snapshot
      expectedSystemDeliveries += 3;
      // Minus load-snapshot, minus 1 since position is 0 based
      lastSnapshotPos = expectedSystemDeliveries + ephemeralCounter - 1 - 1;
    }
  };

  let lastSnapshotPos = 0;
  function checkPositions() {
    const snapshotInfo = snapStore.getSnapshotInfo(vatID);

    const snap = snapshotInfo ? snapshotInfo.snapPos : 0;
    const bounds = kernelStorage.transcriptStore.getCurrentSpanBounds(vatID);
    const start = bounds.startPos;
    const end = bounds.endPos;

    t.is(snap, lastSnapshotPos, 'snapshot position');
    if (useTranscript) {
      t.is(start, lastSnapshotPos && lastSnapshotPos + 1, 'span start');
      t.is(end, expectedSystemDeliveries + ephemeralCounter, 'span end');
    } else {
      t.is(start, 0, 'span start');
      t.is(end, 0, 'span end');
    }
  }

  const expected1 = [];
  c1.queueToVatRoot('target', 'count', []);
  expected1.push(getNextCountLog());
  assumeSnapshot(); // snapshotInitial
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  checkPositions();
  let i;
  for (i = 1; i < 11; i += 1) {
    c1.queueToVatRoot('target', 'count', []);
    expected1.push(getNextCountLog());
    // 4 = snapshotInterval - 1 (from load-snapshot)
    if (i % 4 === 0) {
      assumeSnapshot();
    }
  }
  await c1.run();
  t.deepEqual(c1.dump().log, expected1);
  checkPositions();
  await c1.shutdown();

  const c2 = await makeSwingsetController(kernelStorage, null, runtimeOptions);
  const expected2 = [];
  if (useTranscript) {
    if (isSnapshotting) {
      const replayedCounts = (i - 1) % 4;
      t.true(replayedCounts > 0, 'test should have count deliveries to replay');
      expected2.push(...expected1.slice(-replayedCounts));
    } else {
      expected2.push(...expected1);
    }
  } else {
    ephemeralCounter = 0;
    expectedSystemDeliveries = 0;
  }
  t.deepEqual(c2.dump().log, expected2); // replayed deliveries
  // No longer snapshot automatically
  c2.changeKernelOptions({ snapshotInterval: Number.MAX_SAFE_INTEGER });
  for (i = 0; i < 4; i += 1) {
    c2.queueToVatRoot('target', 'count', []);
    expected2.push(getNextCountLog());
  }
  await c2.run();
  t.deepEqual(c2.dump().log, expected2);
  checkPositions();
  // Manually snapshot should create a snapshot
  const expectedSnapshotResult = isSnapshotting ? [vatID] : [];
  t.deepEqual(await c2.snapshotAllVats(), expectedSnapshotResult);
  assumeSnapshot();
  await c2.run();
  checkPositions();
  // Snapshotting again should not create a snapshot
  t.deepEqual(await c2.snapshotAllVats(), []);
  await c2.run();
  checkPositions();
  // A single delivery should enable a snapshot again
  c2.queueToVatRoot('target', 'count', []);
  expected2.push(getNextCountLog());
  await c2.run();
  t.deepEqual(await c2.snapshotAllVats(), expectedSnapshotResult);
  assumeSnapshot();
  await c2.run();
  checkPositions();

  await c2.shutdown();
};

const liveslotsSourceSpec = new URL('vat-warehouse-reload.js', import.meta.url)
  .pathname;
const setupSourceSpec = new URL('../vat-transcript-maybe.js', import.meta.url)
  .pathname;

test('vat reload from snapshot (restart xs-worker)', vatReload, true, {
  sourceSpec: liveslotsSourceSpec,
  creationOptions: {
    managerType: 'xs-worker',
  },
});
test('vat reload from snapshot (reuse xs-worker)', vatReload, false, {
  sourceSpec: liveslotsSourceSpec,
  creationOptions: {
    managerType: 'xs-worker',
  },
});
test('vat reload (local)', vatReload, undefined, {
  sourceSpec: liveslotsSourceSpec,
  creationOptions: {
    managerType: 'local',
  },
});
test('vat reload (local-setup)', vatReload, undefined, {
  sourceSpec: setupSourceSpec,
  creationOptions: {
    managerType: 'local',
    useTranscript: true,
    enableSetup: true,
  },
});

test('vat reload (local-setup, no-transcript)', vatReload, undefined, {
  sourceSpec: setupSourceSpec,
  creationOptions: {
    managerType: 'local',
    useTranscript: false,
    enableSetup: true,
  },
});
