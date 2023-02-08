import test from 'ava';
import '@endo/init/debug.js';
import { initSwingStore } from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { buildKernelBundle } from '../../src/controller/initializeSwingset.js';
import { kunser } from '../../src/lib/kmarshal.js';

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
      static2: { bundleName: 'bundle' },
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
    snapshotInitial: 2,
    // the new pseudo-deliveries ('initialize-worker',
    // 'save-snapshot', and 'load-snapshot' all count against the
    // snapshotInterval. So setting it to 7 will get us 5 actual
    // deliveries between the two snapshot events.
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
  commit();

  let c;
  const restart = async () => {
    if (c) {
      commit();
      await c.shutdown();
    }
    const { runtimeOptions } = t.context.data;
    c = await makeSwingsetController(kernelStorage, {}, runtimeOptions);
    t.teardown(c.shutdown);
    return c;
  };

  c = await restart(); // actually just starting for the first time
  let expectedFull = ['initialize-worker'];
  c.pinVatRoot('bootstrap');
  const vatID = c.vatNameToID('bootstrap');

  const snapInfo = () => snapStore.getSnapshotInfo(vatID)?.endPos;
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
  const snap = [].concat(save, load);
  const boot = ['message']; // bootstrap(), not nothing()
  const msg = ['message']; // nothing()
  const msgN = n => Array(n).fill('message');
  const bounds = () => {
    const b = transcriptStore.getCurrentSpanBounds(vatID);
    return [b.startPos, b.endPos];
  };
  const incarnation = () =>
    transcriptStore.getCurrentSpanBounds(vatID)?.incarnation;

  // snapshotInitial=2 and snapshotInterval=7, so we'll see a
  // save-snapshot on deliveryNum 2, and when (deliveryNum -
  // snapshot.endPos) = k*7. Until an upgrade causes a span to end
  // early, that means save-snapshot on deliveries 2, 9, 16, 23

  // the full sequence of deliveries will be:
  // span 0-2 = [0,3) (ended by snapshot)
  // 0 initialize-worker
  //  1 startVat
  // 2 save-snapshot
  // span 3-9 = [3, 10) (ended by snapshot)
  // 3 load-snapshot
  //  4 boot (message: bootstrap())
  //  5 notify (response to createVatAdminService)
  //  6 message (nothing-1)
  //  7 message (nothing-2)
  //  8 message (nothing-3)
  // 9 save-snapshot
  // span 10-15 =  [10, 16) (ended by upgrade)
  // 10 load-snapshot
  //  11 message (nothing-4)
  //  12 message (nothing-5)
  //  13 message (nothing-6)
  //  14 bringOutYourDead (for upgrade)
  // 15 shutdown-worker (for upgrade)
  //      (span ended, snapshot removed, span started)
  // span 16-19 = [16,20)
  // 16 initialize-worker (added by ensureVatOnline)
  //  17 startVat
  //  18 message (nothing-7)
  //      (now maybeSaveSnapshot notices)
  // 19 save-snapshot
  // span 20- = [20,..) (still active at end of test)
  // 20 load-snapshot

  t.deepEqual(fullSummary(), expectedFull);
  t.deepEqual(bounds(), [0, 1]);
  t.deepEqual(curSummary(), ['initialize-worker']);
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 0);

  // restart immediately, to exercise vat-preload seeing just the
  // initialize-worker

  c = await restart();
  t.deepEqual(curSummary(), ['initialize-worker']);
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 0);

  // starting the kernel will deliver the 'startVat' delivery to all
  // vats. And since snapshotInitial=2, we'll get an immediate
  // snapshot cycle after the 'startVat'. Then 'bootstrap()' and the
  // notify from createVatAdminService are delivered
  await c.run();
  expectedFull = expectedFull.concat('startVat', snap, boot, notify);
  // first span is 0-2 = [0,3), snapshot happened on the last event
  // "2". current span is 3-5 = [3,6)
  t.is(snapInfo(), 2);
  t.is(incarnation(), 0);
  t.deepEqual(bounds(), [3, 6]);
  t.deepEqual(oldSummary(0), [].concat(start, save));
  t.deepEqual(curSummary(), [].concat(load, boot, notify));
  t.deepEqual(fullSummary(), expectedFull);

  // do some deliveries to trigger an XS heap snapshot event, creating
  // a new span
  const doSomeNothing = async () => {
    const kpid = c.queueToVatRoot('bootstrap', 'nothing', [], 'panic');
    await c.run();
    t.is(c.kpStatus(kpid), 'fulfilled');
  };

  await doSomeNothing(); // d6: nothing-1
  expectedFull = expectedFull.concat(msg);
  t.is(snapInfo(), 2);
  t.is(incarnation(), 0);
  t.deepEqual(bounds(), [3, 7]);
  t.deepEqual(curSummary(), [].concat(load, boot, notify, msgN(1)));
  t.deepEqual(fullSummary(), expectedFull);

  c = await restart();
  t.deepEqual(curSummary(), [].concat(load, boot, notify, msgN(1)));

  await doSomeNothing(); // d7: nothing-2
  expectedFull = expectedFull.concat(msg);
  t.deepEqual(curSummary(), [].concat(load, boot, notify, msgN(2)));
  await doSomeNothing(); // d8: nothing-3
  expectedFull = expectedFull.concat(msg);
  // 8th delivery hits snapshotInterval, so we get a save/load
  // cycle. Spans are [0,3), [3,10), [10,11). There were snapshots on
  // 2 and 9.
  expectedFull = expectedFull.concat(snap);
  t.is(snapInfo(), 9);
  t.is(incarnation(), 0);
  t.deepEqual(bounds(), [10, 11]);
  t.deepEqual(curSummary(), [].concat(load));
  t.deepEqual(fullSummary(), expectedFull);
  c = await restart();
  t.deepEqual(curSummary(), [].concat(load));

  await doSomeNothing(); // nothing-4
  expectedFull = expectedFull.concat(msg);
  t.is(snapInfo(), 9);
  t.is(incarnation(), 0);
  t.deepEqual(bounds(), [10, 12]);
  t.deepEqual(oldSummary(3), [].concat(load, boot, notify, msgN(3), save));
  t.deepEqual(curSummary(), [].concat(load, msg));
  t.deepEqual(fullSummary(), expectedFull);

  c = await restart();
  t.deepEqual(curSummary(), [].concat(load, msg));

  // two more for good measure
  await doSomeNothing(); // nothing-5
  expectedFull = expectedFull.concat(msg);
  await doSomeNothing(); // nothing-6
  expectedFull = expectedFull.concat(msg);
  t.is(snapInfo(), 9);
  t.is(incarnation(), 0);
  t.deepEqual(bounds(), [10, 14]);
  t.deepEqual(curSummary(), [].concat(load, msgN(3)));
  t.deepEqual(fullSummary(), expectedFull);

  // Now upgrade the vat, introducing a new incarnation. We do a null
  // upgrade, but need to snoop the bundleID to use.
  const source = JSON.parse(kernelStorage.kvStore.get(`${vatID}.source`));
  const { bundleID } = source;
  c.upgradeStaticVat('bootstrap', false, bundleID);
  expectedFull = expectedFull.concat(boyd, shutdown, start);
  await c.run();
  // a weirdness in the way maybeSaveSnapshot counts means that after
  // an upgrade, we'll do a snapshot immediately after the first
  // message delivery (because processDeliveryMessage calls
  // maybeSaveSnapshot), but not after the startVat done by
  // processUpgradeVat
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 1);
  t.deepEqual(oldSummary(10), [].concat(load, msgN(3), boyd, shutdown));
  t.deepEqual(bounds(), [16, 18]);
  t.deepEqual(curSummary(), [].concat(start));
  t.deepEqual(fullSummary(), expectedFull);

  // restarting at this point means we load a blank worker and replay
  // startVat, since we haven't created a snapshot yet
  c = await restart();
  t.is(snapInfo(), undefined);
  t.is(incarnation(), 1);
  t.deepEqual(curSummary(), [].concat(start));

  // so this provokes a snapshot, leaving us in an empty span
  await doSomeNothing(); // nothing-7
  expectedFull = expectedFull.concat(msg, snap);
  t.is(snapInfo(), 19);
  t.is(incarnation(), 1);
  t.deepEqual(bounds(), [20, 21]);
  t.deepEqual(oldSummary(16), [].concat(init, ['startVat'], msg, save));
  t.deepEqual(curSummary(), [].concat(load));
  t.deepEqual(fullSummary(), expectedFull);
});
