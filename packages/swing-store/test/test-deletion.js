// @ts-check
import test from 'ava';
import '@endo/init/debug.js';
import fs from 'fs';
import { initSwingStore } from '../src/swingStore.js';

async function dosnap(filePath) {
  fs.writeFileSync(filePath, 'abc');
}

test.failing('delete snapshots with export callback', async t => {
  const exportLog = [];
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
  };
  const store = initSwingStore(null, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { snapStore } = kernelStorage;
  const { commit } = hostStorage;

  await snapStore.saveSnapshot('v1', 10, dosnap);
  await snapStore.saveSnapshot('v1', 11, dosnap);
  await snapStore.saveSnapshot('v1', 12, dosnap);
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);

  commit();

  t.is(exportLog.length, 4);
  t.is(exportLog[0][0], 'snapshot.v1.10');
  t.is(exportLog[1][0], 'snapshot.v1.11');
  t.is(exportLog[2][0], 'snapshot.v1.12');
  t.is(exportLog[3][0], 'snapshot.v1.current');
  exportLog.length = 0;

  // in a previous version, deleteVatSnapshots caused overlapping SQL
  // queries, and failed
  snapStore.deleteVatSnapshots('v1');
  commit();

  t.deepEqual(exportLog, [
    ['snapshot.v1.10', null],
    ['snapshot.v1.11', null],
    ['snapshot.v1.12', null],
    ['snapshot.v1.current', null],
  ]);
  exportLog.length = 0;
});
