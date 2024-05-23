import test from 'ava';
import { spawnRetentiveVatSequence } from './leakiness.mjs';

test('use pipes', async t => {
  await spawnRetentiveVatSequence({
    chunkCount: 10,
    chunkSize: 1000,
    xsnapOptions: { snapshotUseFs: false },
  });
  t.pass();
});

test('use temp files', async t => {
  await spawnRetentiveVatSequence({
    chunkCount: 10,
    chunkSize: 1000,
    xsnapOptions: { snapshotUseFs: true },
  });
  t.pass();
});
