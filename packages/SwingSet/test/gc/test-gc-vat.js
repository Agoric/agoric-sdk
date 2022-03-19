import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { provideHostStorage } from '../../src/controller/hostStorage.js';
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

function dumpClist(c) {
  // returns array like [ko27/v3/o+1, ..]
  return c.dump().kernelTable.map(e => `${e[0]}/${e[1]}/${e[2]}`);
}

function findClist(c, vatID, kref) {
  for (const e of c.dump().kernelTable) {
    if (e[0] === kref && e[1] === vatID) {
      return e[2];
    }
  }
  return undefined;
}

async function dropPresence(t, dropExport) {
  const config = {
    bootstrap: 'bootstrap',
    defaultManagerType: 'xs-worker', // Avoid local vat nondeterminism
    vats: {
      bootstrap: {
        sourceSpec: new URL('bootstrap.js', import.meta.url).pathname,
      },
      target: {
        sourceSpec: new URL('vat-target.js', import.meta.url).pathname,
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  t.teardown(c.shutdown);
  await c.run();

  const bootstrapID = c.vatNameToID('bootstrap');
  c.queueToVatRoot('bootstrap', 'one', capargs([]));
  if (dropExport) {
    c.queueToVatRoot('bootstrap', 'drop', capargs([]));
    await c.step(); // acceptance
    await c.step(); // message
    await c.step(); // reap
  }
  await c.step(); // acceptance
  await c.step(); // message
  await c.step(); // reap

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

test.serial('drop presence (export retains)', t => dropPresence(t, false));
test.serial('drop presence (export drops)', t => dropPresence(t, true));

test('forward to fake zoe', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('bootstrap.js', import.meta.url).pathname,
      },
      target: {
        sourceSpec: new URL('vat-target.js', import.meta.url).pathname,
        // creationOptions: { managerType: 'xs-worker' },
        creationOptions: { managerType: 'local' },
      },
      zoe: {
        sourceSpec: new URL('vat-fake-zoe.js', import.meta.url).pathname,
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  const targetID = c.vatNameToID('target');
  c.pinVatRoot('target');
  const zoeID = c.vatNameToID('zoe');
  c.pinVatRoot('zoe');
  t.teardown(c.shutdown);
  await c.run();

  // first we ask vat-fake-zoe for the invitation object, to learn its kref

  const r1 = c.queueToVatRoot('zoe', 'makeInvitationZoe', capargs([]));
  await c.run();
  const invitation = c.kpResolution(r1).slots[0];
  // ko27/v3/o+1 is the export
  console.log(`invitation: ${invitation}`);
  console.log(`targetID: ${targetID}`);

  // confirm that zoe is exporting it
  t.is(findClist(c, zoeID, invitation), 'o+9');
  t.true(dumpClist(c).includes(`${invitation}/${zoeID}/o+9`));
  // confirm that vat-target has not seen it yet
  t.is(findClist(c, targetID, invitation), undefined);

  // console.log(c.dump().kernelTable);
  console.log(`calling makeInvitation`);

  // Then we ask bootstrap to ask vat-target to ask vat-fake-zoe for the
  // invitation. We try to mimic the pattern used by a simple
  // tap-fungible-faucet loadgen task, which is where I observed XS not
  // releasing the invitation object.

  c.queueToVatRoot('bootstrap', 'makeInvitation0', capargs([]));
  await c.run();
  // console.log(c.dump().kernelTable);

  // vat-target should have learned about the invitation object, resolved the
  // 'makeInvitationTarget' result promise with it, then dropped it
  t.is(findClist(c, targetID, invitation), undefined);
});
