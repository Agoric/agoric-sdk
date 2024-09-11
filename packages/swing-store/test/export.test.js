import test from 'ava';

import { buffer } from '../src/util.js';
import { initSwingStore, makeSwingStoreExporter } from '../src/index.js';

import { tmpDir, getSnapshotStream, makeB0ID } from './util.js';

const rank = {
  operational: 1,
  replay: 2,
  archival: 3,
  debug: 4,
  'debug-on-pruned': 4,
};

const snapshotData = 'snapshot data';
// this snapHash was computed manually
const snapHash =
  'e7dee7266896538616b630a5da40a90e007726a383e005a9c9c5dd0c2daf9329';

/** @type {import('../src/bundleStore.js').Bundle} */
const bundle0 = { moduleFormat: 'nestedEvaluate', source: '1+1' };
const bundle0ID = makeB0ID(bundle0);

const exportTest = test.macro(async (t, mode) => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  // const dbDir = 't-db';

  const options = {};
  if (mode === 'debug') {
    options.keepSnapshots = true; // else old snapshots are deleted
  }
  const ss1 = initSwingStore(dbDir, options);
  const ks = ss1.kernelStorage;

  ss1.hostStorage.kvStore.set('host.h1', 'hostvalue1');

  // build a DB with four spans (one in an old incarnation, two
  // historical but current incarnation, only one inUse) and two
  // snapshots (only one inUSe)

  ks.kvStore.set('key1', 'value1');
  ks.bundleStore.addBundle(bundle0ID, bundle0);
  ks.transcriptStore.initTranscript('v1');

  // incarnation 0
  ks.transcriptStore.addItem('v1', 'start-worker'); // 0
  ks.transcriptStore.addItem('v1', 'shutdown-worker'); // 1
  await ks.transcriptStore.rolloverIncarnation('v1');
  const spanHash0 =
    '5bee0f44eca02f23eab03703e84ed2647d5d117fed99e1c30a3b424b7f082ab9';

  // incarnation 1
  ks.transcriptStore.addItem('v1', 'start-worker'); // 2
  ks.transcriptStore.addItem('v1', 'delivery1'); // 3
  await ks.snapStore.saveSnapshot('v1', 4, getSnapshotStream(snapshotData));
  ks.transcriptStore.addItem('v1', 'save-snapshot'); // 4
  await ks.transcriptStore.rolloverSpan('v1'); // range= 2..5
  const spanHash1 =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';

  ks.transcriptStore.addItem('v1', 'load-snapshot'); // 5
  ks.transcriptStore.addItem('v1', 'delivery2'); // 6
  await ks.snapStore.saveSnapshot('v1', 7, getSnapshotStream(snapshotData));
  ks.transcriptStore.addItem('v1', 'save-snapshot'); // 7
  await ks.transcriptStore.rolloverSpan('v1'); // range= 5..8
  const spanHash2 =
    '1947001e78e01bd1e773feb22b4ffc530447373b9de9274d5d5fbda3f23dbf2b';

  ks.transcriptStore.addItem('v1', 'load-snapshot'); // 8
  ks.transcriptStore.addItem('v1', 'delivery3'); // 9
  const spanHash3 =
    'e6b42c6a3fb94285a93162f25a9fc0145fd4c5bb144917dc572c50ae2d02ee69';
  // current range= 8..10

  await ss1.hostStorage.commit();

  // create an export, and assert that the pieces match what we
  // expect. artifactMode='operational' means we get all metadata, no
  // historical transcript spans, and no historical snapshots

  assert.typeof(mode, 'string');
  /** @import {ArtifactMode} from '../src/internal.js' */
  let artifactMode = /** @type {ArtifactMode} */ (mode);
  if (mode === 'debug-on-pruned') {
    artifactMode = 'debug';
  }
  const exporter = makeSwingStoreExporter(dbDir, { artifactMode });

  // hostKV
  t.is(exporter.getHostKV('host.h1'), 'hostvalue1');
  t.is(exporter.getHostKV('host.hmissing'), undefined);
  t.throws(() => exporter.getHostKV('nonhost'), {
    message: 'getHostKV requires host keys',
  });

  // exportData
  {
    const exportData = new Map();
    for await (const [key, value] of exporter.getExportData()) {
      exportData.set(key, value);
    }
    // console.log('exportData:', exportData);

    const check = (key, expected) => {
      t.true(exportData.has(key));
      let value = exportData.get(key);
      exportData.delete(key);
      if (typeof expected === 'object') {
        value = JSON.parse(value);
      }
      t.deepEqual(value, expected);
    };

    check('kv.key1', 'value1');
    check('snapshot.v1.4', {
      vatID: 'v1',
      snapPos: 4,
      inUse: 0,
      hash: snapHash,
    });
    check('snapshot.v1.7', {
      vatID: 'v1',
      snapPos: 7,
      inUse: 1,
      hash: snapHash,
    });
    check('snapshot.v1.current', 'snapshot.v1.7');
    const base = { vatID: 'v1', isCurrent: 0 };
    check('transcript.v1.0', {
      ...base,
      incarnation: 0,
      startPos: 0,
      endPos: 2,
      hash: spanHash0,
    });
    check('transcript.v1.2', {
      ...base,
      incarnation: 1,
      startPos: 2,
      endPos: 5,
      hash: spanHash1,
    });
    check('transcript.v1.5', {
      ...base,
      incarnation: 1,
      startPos: 5,
      endPos: 8,
      hash: spanHash2,
    });
    check('transcript.v1.current', {
      ...base,
      incarnation: 1,
      startPos: 8,
      endPos: 10,
      isCurrent: 1,
      hash: spanHash3,
    });
    check(`bundle.${bundle0ID}`, bundle0ID);

    // the above list is supposed to be exhaustive
    if (exportData.size) {
      console.log('unexpected exportData keys');
      console.log(exportData);
      t.fail('unexpected exportData keys');
    }
  }

  // artifacts
  {
    const names = new Set();
    const contents = new Map();
    for await (const name of exporter.getArtifactNames()) {
      names.add(name);
      contents.set(name, (await buffer(exporter.getArtifact(name))).toString());
    }
    // console.log('artifacts:', contents);

    const check = async (name, expected) => {
      t.true(names.has(name));
      names.delete(name);
      let data = contents.get(name);
      if (typeof expected === 'object') {
        data = JSON.parse(data);
      }
      t.deepEqual(data, expected);
    };

    // export mode 'operational' means we omit historical snapshots and
    // transcript spans

    await check('snapshot.v1.7', 'snapshot data');
    await check('transcript.v1.8.10', 'load-snapshot\ndelivery3\n');
    await check(`bundle.${bundle0ID}`, bundle0);

    t.true(rank[mode] > 0);
    if (rank[mode] >= rank.replay) {
      // add the old transcript spans of the current incarnation
      await check(
        'transcript.v1.2.5',
        'start-worker\ndelivery1\nsave-snapshot\n',
      );
      await check(
        'transcript.v1.5.8',
        'load-snapshot\ndelivery2\nsave-snapshot\n',
      );
    }

    if (rank[mode] >= rank.archival) {
      // add the spans of the old incarnation
      await check('transcript.v1.0.2', 'start-worker\nshutdown-worker\n');
    }

    if (mode === 'debug') {
      // adds the old snapshots, which are only present if
      // initSwingStore() was given {keepSnapshots: true}
      await check('snapshot.v1.4', 'snapshot data');
      // mode='debug-on-pruned' exercises the keepSnapshots:false case
    }

    if (names.size) {
      console.log(`unexpected artifacts:`);
      console.log(names);
      t.fail('unexpected artifacts');
    }
  }
});

test('export operational', exportTest, 'operational');
test('export replay', exportTest, 'replay');
test('export archival', exportTest, 'archival');
test('export debug', exportTest, 'debug');
test('export debug-on-pruned', exportTest, 'debug-on-pruned');

test('export omits pruned span artifacts', async t => {
  const [dbDir, cleanup] = await tmpDir('testdb');
  t.teardown(cleanup);
  // const dbDir = 't-db';

  // use keepTranscripts=false to simulate an explicit prune of the
  // old span
  const options = { keepTranscripts: false };
  const ss1 = initSwingStore(dbDir, options);
  const ks = ss1.kernelStorage;

  // build a DB with two spans, one is inUse, other is pruned

  ks.transcriptStore.initTranscript('v1');
  ks.transcriptStore.addItem('v1', 'start-worker'); // 0
  ks.transcriptStore.addItem('v1', 'delivery1'); // 1
  await ks.snapStore.saveSnapshot('v1', 2, getSnapshotStream(snapshotData));
  ks.transcriptStore.addItem('v1', 'save-snapshot'); // 2
  await ks.transcriptStore.rolloverSpan('v1'); // range= 0..3
  const spanHash1 =
    '57152efdd7fdf75c03371d2b4f1088d5bf3eae7fe643babce527ff81df38998c';
  // rolloverSpan prunes the contents of the old span

  ks.transcriptStore.addItem('v1', 'load-snapshot'); // 3
  ks.transcriptStore.addItem('v1', 'delivery2'); // 4
  const spanHash2 =
    'b26c8faf425c3c2738e0c5a5e9a7cd71075c68f0c9f2d6cdfd83c68204801dbb';

  await ss1.hostStorage.commit();

  const artifactMode = 'debug';
  const exporter = makeSwingStoreExporter(dbDir, { artifactMode });

  // exportData
  {
    const exportData = new Map();
    for await (const [key, value] of exporter.getExportData()) {
      exportData.set(key, value);
    }
    // console.log('exportData:', exportData);

    const check = (key, expected) => {
      t.true(exportData.has(key));
      let value = exportData.get(key);
      exportData.delete(key);
      if (typeof expected === 'object') {
        value = JSON.parse(value);
      }
      t.deepEqual(value, expected);
    };

    check('snapshot.v1.2', {
      vatID: 'v1',
      snapPos: 2,
      inUse: 1,
      hash: snapHash,
    });
    check('snapshot.v1.current', 'snapshot.v1.2');
    const base = { vatID: 'v1', incarnation: 0, isCurrent: 0 };
    check('transcript.v1.0', {
      ...base,
      startPos: 0,
      endPos: 3,
      hash: spanHash1,
    });
    check('transcript.v1.current', {
      ...base,
      startPos: 3,
      endPos: 5,
      isCurrent: 1,
      hash: spanHash2,
    });

    // the above list is supposed to be exhaustive
    if (exportData.size) {
      console.log('unexpected exportData keys');
      console.log(exportData);
      t.fail('unexpected exportData keys');
    }
  }

  // artifacts
  {
    const names = new Set();
    const contents = new Map();
    for await (const name of exporter.getArtifactNames()) {
      names.add(name);
      contents.set(name, (await buffer(exporter.getArtifact(name))).toString());
    }
    // console.log('artifacts:', contents);

    const check = async (name, expected) => {
      t.true(names.has(name));
      names.delete(name);
      let data = contents.get(name);
      if (typeof expected === 'object') {
        data = JSON.parse(data);
      }
      t.deepEqual(data, expected);
    };

    // export mode 'archival' means we include all available
    // historical snapshots and transcript spans

    await check('snapshot.v1.2', 'snapshot data');
    // no transcript.v1.0.3 because the contents were pruned
    await check('transcript.v1.3.5', 'load-snapshot\ndelivery2\n');

    if (names.size) {
      console.log(`unexpected artifacts:`);
      console.log(names);
      t.fail('unexpected artifacts');
    }
  }
});
