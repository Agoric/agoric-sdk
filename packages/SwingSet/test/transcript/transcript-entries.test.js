// @ts-nocheck
import test from 'ava';

import { kunser } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { buildKernelBundle } from '../../src/controller/initializeSwingset.js';

const bfile = name => new URL(name, import.meta.url).pathname;

test.before(async t => {
  const runtimeOptions = { kernelBundle: await buildKernelBundle() };
  t.context.data = { runtimeOptions };
});

test('transcript of new vats', async t => {
  const config = {
    bootstrap: 'static1',
    defaultReapInterval: 'never',
    snapshotInitial: 1000, // effectively disable
    snapshotInterval: 1000, // same
    bundles: {
      bundle: { sourceSpec: bfile('vat-bootstrap-transcript.js') },
    },
    vats: {
      static1: { bundleName: 'bundle' },
      static2: {
        bundleName: 'bundle',
        creationOptions: { managerType: 'local' },
      },
    },
  };
  const kernelStorage = initSwingStore().kernelStorage;
  const { kvStore, transcriptStore } = kernelStorage;
  const { readSpan } = transcriptStore;
  await initializeSwingset(config, [], kernelStorage);
  const c = await makeSwingsetController(kernelStorage);
  t.teardown(c.shutdown);

  const vatID1 = c.vatNameToID('static1');
  const vatID2 = c.vatNameToID('static2');

  // vat preload should cause all our static vats to have a transcript
  let t1 = [...readSpan(vatID1, 0)].map(JSON.parse);
  let t2 = [...readSpan(vatID2, 0)].map(JSON.parse);
  t.deepEqual(
    t1.map(te => te.d[0]),
    ['initialize-worker'],
  );
  t.deepEqual(
    t2.map(te => te.d[0]),
    ['initialize-worker'],
  );

  // the first run will perform the 'startVat' deliveries to all vats,
  // and the bootstrap message (which does createVatAdminService)
  await c.run();
  t1 = [...readSpan(vatID1, 0)].map(JSON.parse);
  t2 = [...readSpan(vatID2, 0)].map(JSON.parse);

  t.deepEqual(
    t1.map(te => te.d[0]),
    [
      'initialize-worker',
      'startVat',
      'message', // bootstrap
      'dropExports', // nobody else is using bootstrap root
      'retireExports',
      'notify',
    ],
  );
  t.deepEqual(
    t2.map(te => te.d[0]),
    ['initialize-worker', 'startVat'],
  );

  // static2 is always managerType='local', so it should never have 'metering'
  // in the transcript results
  const teStartVat = t2[1];
  t.falsy(teStartVat.r.metering);

  const kpid = c.queueToVatRoot('static1', 'create', [], 'panic');
  await c.run();
  t.is(c.kpStatus(kpid), 'fulfilled');
  const dynRootKref = kunser(c.kpResolution(kpid)).getKref(); // usually ko28

  // we snoop the kernel object table to find the new vatID
  const dynVatID = kvStore.get(`${dynRootKref}.owner`); // usually v7
  const t3 = [...readSpan(dynVatID, 0)].map(JSON.parse);

  t.deepEqual(
    t3.map(te => te.d[0]),
    ['initialize-worker', 'startVat'],
  );
});

test('transcript spans', async t => {
  const config = {
    snapshotInitial: 3,
    // the new pseudo-deliveries ('initialize-worker',
    // 'save-snapshot') count against the snapshotInterval. So setting
    // it to 7 will get us 6 actual deliveries before the
    // boyd/save-snapshot, and a 9-delivery cycle
    snapshotInterval: 7,
    defaultReapInterval: 'never',
    defaultManagerType: 'xsnap',
    bundles: {
      bundle: { sourceSpec: bfile('vat-bootstrap-transcript.js') },
    },
    vats: {
      bootstrap: { bundleName: 'bundle' },
    },
    bootstrap: 'bootstrap',
  };
  const { kernelStorage, internal, hostStorage } = initSwingStore();
  const { transcriptStore, snapStore } = internal;
  const { commit } = hostStorage;
  const initOpts = { addComms: false, addVattp: false, addTimer: false };
  await initializeSwingset(config, [], kernelStorage, initOpts);
  await commit();

  let c;
  const restart = async () => {
    if (c) {
      await commit();
      await c.shutdown();
    }
    const { runtimeOptions } = t.context.data;
    c = await makeSwingsetController(kernelStorage, {}, runtimeOptions);
    t.teardown(c.shutdown);
    return c;
  };

  c = await restart(); // actually just starting for the first time
  c.pinVatRoot('bootstrap');
  const vatID = c.vatNameToID('bootstrap');

  const snapInfo = () => snapStore.getSnapshotInfo(vatID)?.snapPos;
  const readFull = () => [...transcriptStore.readFullVatTranscript(vatID)];
  const full = () => readFull().map(row => JSON.parse(row.item));
  const readOld = startPos => [...transcriptStore.readSpan(vatID, startPos)];
  const old = startPos => readOld(startPos).map(item => JSON.parse(item));
  const readCur = () => [...transcriptStore.readSpan(vatID)];
  const cur = () => readCur().map(item => JSON.parse(item));
  const summarize = te => te.d[0];
  const fullSummary = () => full().map(summarize);
  const oldSummary = startPos => old(startPos).map(summarize);
  const curSummary = () => cur().map(summarize);
  const init = ['initialize-worker'];
  const start = ['initialize-worker', 'startVat'];
  const boyd = ['bringOutYourDead'];
  const shutdown = ['shutdown-worker'];
  const save = ['save-snapshot'];
  const load = ['load-snapshot'];
  const notify = ['notify'];
  const snap = [].concat(boyd, save, load);
  const boot = ['message']; // bootstrap(), not nothing()
  const msg = ['message']; // nothing()
  const msgN = n => Array(n).fill('message');
  const curBounds = () => {
    const b = transcriptStore.getCurrentSpanBounds(vatID);
    return [b.startPos, b.endPos];
  };
  const incarnation = () =>
    transcriptStore.getCurrentSpanBounds(vatID)?.incarnation;

  // snapshotInitial=3 and snapshotInterval=7, so we'll start on
  // deliveryNum d3 (BOYD on d3, save-snapshot on d4), and when there
  // are 7 or more deliveries in the current transcript span

  // | what       | pseudo   | delivery | span | span            |
  // |            |          |      num | size | bounds          |
  // |------------+----------+----------+------+-----------------|
  // |            | init     |        0 |    1 | 0-4 / [0,5)     |
  // | startVat   |          |        1 |    2 |                 |
  // | bootstrap  |          |        2 |   3! |                 |
  // |            | BOYD     |        3 |      |                 |
  // |            | save     |        4 |      |                 |
  // |            | new-span |          |      |                 |
  // |            | load     |        5 |    1 | 5-13 / [5,14)   |
  // | notify     |          |        6 |    2 |                 |
  // | nothing-1  |          |        7 |    3 |                 |
  // | nothing-2  |          |        8 |    4 |                 |
  // | nothing-3  |          |        9 |    5 |                 |
  // | nothing-4  |          |       10 |    6 |                 |
  // | nothing-5  |          |       11 |   7! |                 |
  // |            | BOYD     |       12 |      |                 |
  // |            | save     |       13 |      |                 |
  // |            | new-span |          |      |                 |
  // |            | load     |       14 |    1 | 14-17 / [14,18) |
  // | nothing-6  |          |       15 |    2 |                 |
  // | UPGRADE!   |          |          |      |                 |
  // |            | BOYD     |       16 |      |                 |
  // |            | shutdown |       17 |      |                 |
  // |            | new-span |          |      |                 |
  // |            | init     |       18 |    1 | 18-22 / [18,23) |
  // | startVat   |          |       19 |    2 |                 |
  // | nothing-7  |          |       20 |   3! |                 |
  // |            | BOYD     |       21 |      |                 |
  // |            | save     |       22 |      |                 |
  // |            | new-span |          |      |                 |
  // |            | load     |       23 |    1 | 23-31 / [23,32) |
  // | nothing-8  |          |       24 |    2 |                 |
  // | nothing-9  |          |       25 |    3 |                 |
  // | nothing-10 |          |       26 |    4 |                 |
  // | nothing-11 |          |       27 |    5 |                 |
  // | nothing-12 |          |       28 |    6 |                 |
  // | nothing-13 |          |       29 |   7! |                 |
  // |            | BOYD     |       30 |      |                 |
  // |            | save     |       31 |      |                 |
  // |            | new-span |          |      |                 |
  // |            | load     |       32 |    1 | 32-             |
  // | nothing-14 |          |       33 |    2 |                 |
  // |            |          |          |      |                 |

  let expectedFull = [].concat(init);
  t.deepEqual(fullSummary(), expectedFull);
  t.deepEqual(curBounds(), [0, 1]);
  t.deepEqual(curSummary(), [].concat(init));
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 0);

  // restart immediately, to exercise vat-preload seeing just the
  // initialize-worker

  c = await restart();
  t.deepEqual(curSummary(), [].concat(init));
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 0);

  // starting the kernel will deliver the 'startVat' and bootstrap()
  // messages. Since snapshotInitial=3, we'll get an immediate
  // snapshot cycle after the 'bootstrap'. The notify from
  // createVatAdminService is delivered after the snapshot completes.
  await c.run();
  expectedFull = expectedFull.concat('startVat', boot, snap, notify);
  // first span is 0-4 = [0,5), snapshot happened on the last event
  // d4. current span is 5-6 = [5,7)
  t.is(snapInfo(), 4);
  t.is(incarnation(), 0);
  t.deepEqual(curBounds(), [5, 7]);
  t.deepEqual(oldSummary(0), [].concat(start, boot, boyd, save));
  t.deepEqual(curSummary(), [].concat(load, notify));
  t.deepEqual(fullSummary(), expectedFull);

  // all delivery events should record computrons
  const teStartVat = old(0)[1];
  t.is(teStartVat.d[0], 'startVat');
  t.truthy(teStartVat.r.metering);
  t.is(typeof teStartVat.r.metering.computrons, 'number');

  // do some deliveries to trigger more XS heap snapshots and create
  // more spans
  const doSomeNothing = async () => {
    const kpid = c.queueToVatRoot('bootstrap', 'nothing', [], 'panic');
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
  };

  await doSomeNothing(); // d7: nothing-1
  expectedFull = expectedFull.concat(msg);
  t.is(snapInfo(), 4);
  t.is(incarnation(), 0);
  t.deepEqual(curBounds(), [5, 8]);
  t.deepEqual(curSummary(), [].concat(load, notify, msgN(1)));
  t.deepEqual(fullSummary(), expectedFull);

  const teNothing1 = cur().slice(-1)[0];
  t.is(teNothing1.d[0], 'message');
  t.truthy(teNothing1.r.metering);
  t.is(typeof teNothing1.r.metering.computrons, 'number');

  c = await restart();
  t.deepEqual(curSummary(), [].concat(load, notify, msgN(1)));

  await doSomeNothing(); // d8: nothing-2
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(curSummary(), [].concat(load, notify, msgN(2)));
  await doSomeNothing(); // d9: nothing-3
  expectedFull = expectedFull.concat(msg);
  await doSomeNothing(); // d10: nothing-4
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(curSummary(), [].concat(load, notify, msgN(4)));
  t.deepEqual(fullSummary(), expectedFull);

  // the 7th delivery of the span will reach snapshotInterval
  await doSomeNothing(); // d11: nothing-5
  expectedFull = expectedFull.concat(msg);
  // so we get a save/load cycle. Spans are [0,5), [5,14),
  // [14,15). There were snapshots on 4 and 13.
  expectedFull = expectedFull.concat(snap);
  t.is(snapInfo(), 13);
  t.is(incarnation(), 0);
  t.deepEqual(curBounds(), [14, 15]);
  t.deepEqual(curSummary(), [].concat(load));
  t.deepEqual(fullSummary(), expectedFull);

  c = await restart();
  t.deepEqual(curSummary(), [].concat(load));

  // one more for good measure, before the upgrade
  await doSomeNothing(); // d15: nothing-5
  expectedFull = expectedFull.concat(msg);
  t.is(snapInfo(), 13);
  t.is(incarnation(), 0);
  t.deepEqual(curBounds(), [14, 16]);
  t.deepEqual(curSummary(), [].concat(load, msg));
  t.deepEqual(fullSummary(), expectedFull);

  // Now upgrade the vat, introducing a new incarnation. We do a null
  // upgrade, but need to snoop the bundleID to use.
  const source = JSON.parse(kernelStorage.kvStore.get(`${vatID}.source`));
  const { bundleID } = source;
  c.upgradeStaticVat('bootstrap', false, bundleID);
  expectedFull = expectedFull.concat(boyd, shutdown, start);
  await c.run();
  // upgrade starts with a BOYD in d16, then a shutdown-worker
  // pseudo-delivery in d17, then we erase the snapshot and start a
  // new span with an initialize-worker and a startVat.

  t.is(snapInfo(), undefined); // no snapshot yet
  t.is(incarnation(), 1);
  t.deepEqual(oldSummary(14), [].concat(load, msg, boyd, shutdown));
  t.deepEqual(curBounds(), [18, 20]);
  t.deepEqual(curSummary(), [].concat(start));
  t.deepEqual(fullSummary(), expectedFull);

  // restarting at this point means we load a blank worker and replay
  // startVat, since we haven't created a snapshot yet
  c = await restart();
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 1);
  t.deepEqual(curSummary(), [].concat(start));

  // one delivery will be enough to reach snapshotInitial
  // (init+startVat+message = 3) and provoke the first snapshot of the
  // new incarnation (thus boyd on d21 and save-snapshot on d22)

  await doSomeNothing(); // d20: nothing-7
  expectedFull = expectedFull.concat(msg, snap);
  t.is(snapInfo(), 22);
  t.is(incarnation(), 1);
  t.deepEqual(oldSummary(18), [].concat(start, msg, boyd, save));
  t.deepEqual(curBounds(), [23, 24]);
  t.deepEqual(curSummary(), [].concat(load));
  t.deepEqual(fullSummary(), expectedFull);

  // we need another six deliveries to reach snapshotInterval
  await doSomeNothing(); // d24: nothing-8
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(fullSummary(), expectedFull);

  await doSomeNothing(); // d25: nothing-9
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(fullSummary(), expectedFull);

  await doSomeNothing(); // d26: nothing-10
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(fullSummary(), expectedFull);

  await doSomeNothing(); // d27: nothing-11
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(fullSummary(), expectedFull);

  await doSomeNothing(); // d28: nothing-12
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(fullSummary(), expectedFull);
  t.is(snapInfo(), 22); // no snapshot yet

  // this will trigger snapshotInterval
  await doSomeNothing(); // d28: nothing-12
  expectedFull = expectedFull.concat(msg, snap);
  t.is(snapInfo(), 31);
  t.is(incarnation(), 1);
  t.deepEqual(oldSummary(23), [].concat(load, msgN(6), boyd, save));
  t.deepEqual(curBounds(), [32, 33]);
  t.deepEqual(curSummary(), [].concat(load));
  t.deepEqual(fullSummary(), expectedFull);
});
