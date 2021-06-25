/* global __dirname */
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import path from 'path';
import { provideHostStorage } from '../../src/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';
import { capargs } from '../util.js';

function dumpObjects(c) {
  const out = {};
  for (const row of c.dump().objects) {
    const [koid, owner, reachable, recognizable] = row;
    out[koid] = [owner, reachable, recognizable];
  }
  return out;
}

async function dropPresence(t, dropExport) {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: path.join(__dirname, 'bootstrap.js'),
      },
      target: {
        sourceSpec: path.join(__dirname, 'vat-target.js'),
        creationOptions: { managerType: 'xs-worker' },
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  t.teardown(c.shutdown);
  await c.run();

  const bootstrapID = c.vatNameToID('bootstrap');
  c.queueToVatExport('bootstrap', 'o+0', 'one', capargs([]));
  if (dropExport) {
    c.queueToVatExport('bootstrap', 'o+0', 'drop', capargs([]));
    await c.step();
  }
  await c.step();

  // examine the run-queue to learn the krefs for objects A and B
  const rq = c.dump().runQueue;
  t.is(rq[0].type, 'send');
  t.is(rq[0].msg.method, 'two');
  const [krefA, krefB] = rq[0].msg.args.slots;
  t.is(krefA, 'ko26'); // arbitrary but this is what we currently expect
  t.is(krefB, 'ko27'); // same
  // both are exported by the bootstrap vat, and are reachable+recognizable
  // by the run-queue message, so the refcounts should both be 1,1
  let objs = dumpObjects(c);
  t.deepEqual(objs[krefA], [bootstrapID, 1, 1]);
  t.deepEqual(objs[krefB], [bootstrapID, 1, 1]);

  // Now let everything complete, and those objects should be dropped by the
  // importing vat, which means the exporting vat will be told they've been
  // dropped too. The exporting vat still holds the Remotables strongly.
  await c.run();
  objs = dumpObjects(c);

  if (dropExport) {
    // the exporter wasn't holding a strong ref, so when the drop arrives,
    // the exporter will retire, causing the importer to retire, causing the
    // object to disappear entirely
    t.is(objs[krefA], undefined);
    t.is(objs[krefB], undefined);
  } else {
    // the objects should be retired too, so the c-list mappings and valToSlot
    // tables will be empty.
    t.is(objs[krefA], undefined);
    t.is(objs[krefB], undefined);
  }
}

test('drop presence (export retains)', t => dropPresence(t, false));
test('drop presence (export drops)', t => dropPresence(t, true));
