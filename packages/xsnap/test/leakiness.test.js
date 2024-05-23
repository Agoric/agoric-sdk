/** global FinalizationRegistry */

import test from 'ava';

import process from 'node:process';
import v8 from 'node:v8';

import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';

import { spawnRetentiveVatSequence } from './leakiness.mjs';

/** @import {XSnapOptions} from '@agoric/xsnap/src/xsnap.js' */

/**
 * @param {import('ava').ExecutionContext} t
 * @param {Partial<XSnapOptions>} xsnapOptions
 */
const testRetention = async (t, xsnapOptions) => {
  let snapshotsCreated = 0;
  let snapshotsFreed = 0;
  let lastVat = null;
  /** @type {FinalizationRegistry<void>} */
  const fr = new FinalizationRegistry(() => {
    snapshotsFreed += 1;
  });

  t.plan(4);

  await waitUntilQuiescent();
  engineGC();
  if (process.env.TAKE_HEAP_SNAPSHOT) {
    v8.writeHeapSnapshot(
      `Heap-${process.pid}-${t.title}-${Date.now()}-before.heapsnapshot`,
    );
  }

  await spawnRetentiveVatSequence({
    afterCommand: async (vat, snapshotStream) => {
      lastVat = vat;
      if (snapshotStream) {
        snapshotsCreated += 1;
        fr.register(snapshotStream);
      }
    },
    chunkCount: 10,
    chunkSize: 1000,
    xsnapOptions,
  });

  t.truthy(lastVat);
  t.true(snapshotsCreated >= 1);

  await waitUntilQuiescent();
  engineGC();
  await waitUntilQuiescent();
  if (process.env.TAKE_HEAP_SNAPSHOT) {
    v8.writeHeapSnapshot(
      `Heap-${process.pid}-${t.title}-${Date.now()}-after-tail.heapsnapshot`,
    );
  }

  const snapshotsFreedWithLastVatAlive = snapshotsFreed;

  lastVat = null;

  await waitUntilQuiescent();
  engineGC();
  await waitUntilQuiescent();
  if (process.env.TAKE_HEAP_SNAPSHOT) {
    v8.writeHeapSnapshot(
      `Heap-${process.pid}-${t.title}-${Date.now()}-after-all.heapsnapshot`,
    );
  }

  t.is(snapshotsFreed, snapshotsCreated, 'all snapshots freed');
  t.is(
    snapshotsFreedWithLastVatAlive,
    snapshotsFreed,
    'snapshots not tail retained',
  );
};

test.serial('snapshot GC with pipes', testRetention, {
  snapshotUseFs: false,
});

test.serial('snapshot GC with temp files', testRetention, {
  snapshotUseFs: true,
});
