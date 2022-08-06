// import lmdb early to work around SES incompatibility
import 'lmdb';

// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';
import tmp from 'tmp';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { initSwingStore } from '@agoric/swing-store';
import {
  buildKernelBundles,
  initializeSwingset,
  makeSwingsetController,
} from '../../src/index.js';
import { bundleOpts } from '../util.js';

const bfile = name => new URL(name, import.meta.url).pathname;
test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

test('snapshots', async t => {
  const swingStorePath = tmp.dirSync({ unsafeCleanup: true }).name;
  const { commit, ...hostStorage } = initSwingStore(swingStorePath);
  const { snapStore, kvStore } = hostStorage;
  const config = {
    defaultManagerType: 'xs-worker',
    snapshotInitial: 1,
    snapshotInterval: 1,
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never', // disable BOYD, only startVat+deliver
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-snapshots.js') },
    },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  initOpts.addComms = false;
  initOpts.addVattp = false;
  initOpts.addTimer = false;
  await initializeSwingset(config, [], hostStorage, initOpts);
  const c = await makeSwingsetController(hostStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  const run = async (method, args = []) => {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', method, args);
    await c.run();
    const status = c.kpStatus(kpid);
    t.is(status, 'fulfilled');
  };

  const vatID = kvStore.get('vat.name.bootstrap');

  function getLatestSnapshot() {
    const s = kvStore.get(`local.${vatID}.lastSnapshot`);
    return JSON.parse(s)?.snapshotID;
  }

  // return 'undefined' if the snapshotID is unrecognized, or a
  // (possibly-empty) array of vatIDs that use it
  function getSnapshotUsers(snapshotID) {
    const v = kvStore.get(`local.snapshot.${snapshotID}`);
    return v ? JSON.parse(v) : v;
  }

  // the delivery of startVat and bootstrap() results in snapshot A
  const sidA = getLatestSnapshot();
  t.true(await snapStore.has(sidA));
  t.deepEqual(getSnapshotUsers(sidA), [vatID]);

  // increment() results in snapshot B
  await run('increment');

  const sidB = getLatestSnapshot();
  t.not(sidA, sidB);
  // the DB remembers 'A' as unused, so commit() will delete it, but
  // until then we should have both
  t.true(await snapStore.has(sidA));
  t.true(await snapStore.has(sidB));
  t.deepEqual(getSnapshotUsers(sidA), []);
  t.deepEqual(getSnapshotUsers(sidB), [vatID]);

  // commit() will delete the file. Ideally it would also remove the
  // entire used-by entry, but they are in different DBs with
  // different atomicity domains, so we currently leave the empty
  // used-by entries around forever
  await commit();

  t.false(await snapStore.has(sidA));
  t.true(await snapStore.has(sidB));
  // t.deepEqual(getSnapshotUsers(sidA), undefined);
  t.deepEqual(getSnapshotUsers(sidA), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidB), [vatID]);

  // this delivery does not change the vat state, so its snapshot will
  // be identical to the previous one (B). In bug 5901, vatKeeper
  // erroneously marked this ID as deleted.
  await run('read');

  t.is(getLatestSnapshot(), sidB);
  t.true(await snapStore.has(sidB));
  t.deepEqual(getSnapshotUsers(sidA), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidB), [vatID]);

  // in the buggy version, this commit() deleted B
  await commit();
  t.is(getLatestSnapshot(), sidB);
  t.true(await snapStore.has(sidB)); // .. so this failed
  t.deepEqual(getSnapshotUsers(sidA), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidB), [vatID]);

  await run('increment'); // results in snapshot C
  const sidC = getLatestSnapshot();
  t.not(sidC, sidB);
  t.true(await snapStore.has(sidB));
  t.true(await snapStore.has(sidC));
  t.deepEqual(getSnapshotUsers(sidA), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidB), []);
  t.deepEqual(getSnapshotUsers(sidC), [vatID]);

  // the commit() will delete B now that it is unused
  await commit();
  // in the buggy version, commit() failed because B was already deleted
  t.false(await snapStore.has(sidB));
  t.true(await snapStore.has(sidC));
  t.deepEqual(getSnapshotUsers(sidA), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidB), []); // not deleted
  t.deepEqual(getSnapshotUsers(sidC), [vatID]);
});
