// @ts-check
import test from 'ava';
import { Buffer } from 'node:buffer';
import { initSwingStore } from '../src/swingStore.js';

async function* getSnapshotStream() {
  yield Buffer.from('abc');
}
harden(getSnapshotStream);

test('delete snapshots with export callback', async t => {
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

  await snapStore.saveSnapshot('v1', 10, getSnapshotStream());
  await snapStore.saveSnapshot('v1', 11, getSnapshotStream());
  await snapStore.saveSnapshot('v1', 12, getSnapshotStream());
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);

  await commit();

  t.is(exportLog.length, 4);
  t.is(exportLog[0][0], 'snapshot.v1.10');
  t.is(exportLog[1][0], 'snapshot.v1.11');
  t.is(exportLog[2][0], 'snapshot.v1.12');
  t.is(exportLog[3][0], 'snapshot.v1.current');
  exportLog.length = 0;

  // in a previous version, deleteVatSnapshots caused overlapping SQL
  // queries, and failed
  snapStore.deleteVatSnapshots('v1');
  await commit();

  t.deepEqual(exportLog, [
    ['snapshot.v1.10', null],
    ['snapshot.v1.11', null],
    ['snapshot.v1.12', null],
    ['snapshot.v1.current', null],
  ]);
  exportLog.length = 0;
});

test('delete transcripts with export callback', async t => {
  const exportLog = [];
  const exportCallback = exports => {
    for (const [key, value] of exports) {
      exportLog.push([key, value]);
    }
  };
  const store = initSwingStore(null, { exportCallback });
  const { kernelStorage, hostStorage } = store;
  const { transcriptStore } = kernelStorage;
  const { commit } = hostStorage;

  transcriptStore.initTranscript('v1');
  transcriptStore.addItem('v1', 'aaa');
  transcriptStore.addItem('v1', 'bbb');
  transcriptStore.addItem('v1', 'ccc');
  transcriptStore.rolloverSpan('v1');
  transcriptStore.addItem('v1', 'ddd');
  transcriptStore.addItem('v1', 'eee');
  transcriptStore.addItem('v1', 'fff');
  // nothing is written to exportCallback until endCrank() or commit()
  t.deepEqual(exportLog, []);

  await commit();

  t.is(exportLog.length, 2);
  t.is(exportLog[0][0], 'transcript.v1.0');
  t.is(exportLog[1][0], 'transcript.v1.current');
  exportLog.length = 0;

  // in a previous version, deleteVatTranscripts caused overlapping SQL
  // queries, and failed
  transcriptStore.deleteVatTranscripts('v1');
  await commit();

  t.deepEqual(exportLog, [
    ['transcript.v1.0', null],
    ['transcript.v1.current', null],
  ]);

  exportLog.length = 0;
});
