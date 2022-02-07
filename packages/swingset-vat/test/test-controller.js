// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { spawn } from 'child_process';
import { provideHostStorage } from '../src/hostStorage.js';
import {
  buildVatController,
  loadBasedir,
  initializeSwingset,
  makeSwingsetController,
} from '../src/index.js';
import { checkKT } from './util.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function removeTriple(arr, a, b, c) {
  for (let i = 0; i < arr.length; i += 1) {
    const elem = arr[i];
    if (elem[0] === a && elem[1] === b && elem[2] === c) {
      arr.splice(i, 1);
      return;
    }
  }
}

test('load empty', async t => {
  const config = {};
  const controller = await buildVatController(config);
  await controller.run();
  t.truthy(true);
});

async function simpleCall(t) {
  const config = {
    vats: {
      vat1: {
        sourceSpec: new URL('vat-controller-1.js', import.meta.url).pathname,
        creationOptions: { enableSetup: true },
      },
    },
  };
  const hostStorage = provideHostStorage();
  const controller = await buildVatController(config, [], { hostStorage });
  const data = controller.dump();
  // note: data.vatTables is sorted by vatID, but we have no particular
  // reason to believe that vat1 will get a lower ID than vatAdmin, because
  // vats are processed in Map.keys() order
  const adminVatID = controller.vatNameToID('vatAdmin');
  const vat1ID = controller.vatNameToID('vat1');
  const commsVatID = controller.vatNameToID('comms');
  const vattpVatID = controller.vatNameToID('vattp');
  const timerVatID = controller.vatNameToID('timer');

  t.deepEqual(data.vatTables, [
    { vatID: vat1ID, state: { transcript: [] } },
    { vatID: adminVatID, state: { transcript: [] } },
    { vatID: commsVatID, state: { transcript: [] } },
    { vatID: vattpVatID, state: { transcript: [] } },
    { vatID: timerVatID, state: { transcript: [] } },
  ]);
  // the vatAdmin root is pre-registered
  const vatAdminRoot = ['ko20', adminVatID, 'o+0'];
  t.deepEqual(data.kernelTable, [vatAdminRoot]);

  // vat1:o+0 will map to ko21
  controller.queueToVatRoot('vat1', 'foo', capdata('args'));
  t.deepEqual(controller.dump().runQueue, [
    {
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: 'kp40',
      },
      target: 'ko21',
      type: 'send',
    },
  ]);
  await controller.run();
  t.deepEqual(JSON.parse(controller.dump().log[0]), {
    target: 'o+0',
    method: 'foo',
    args: capdata('args'),
  });

  controller.log('2');
  t.is(controller.dump().log[1], '2');

  // The resulting activity hash is sensitive to a significant amount of
  // code, including the contents of marshal and assert (because they get
  // bundled into e.g. the comms vat source bundle, which is stored in the
  // kvStore during initializeKernel). Testing against the exact hash value
  // would require changing this test each time one of those upstream
  // libraries changed, which is clearly infeasible. Instead, merely check
  // that `controller.getActivityhash()` returns a hash-shaped string.

  const ah = controller.getActivityhash();
  t.is(typeof ah, 'string', ah);
  t.truthy(/^[0-9a-f]{64}$/.test(ah), ah);
}

test('simple call', async t => {
  await simpleCall(t);
});

test('bootstrap', async t => {
  const config = await loadBasedir(
    new URL('basedir-controller-2', import.meta.url).pathname,
  );
  // the controller automatically runs the bootstrap function.
  // basedir-controller-2/bootstrap.js logs "bootstrap called" and queues a call to
  // left[0].bootstrap
  const c = await buildVatController(config);
  t.deepEqual(c.dump().log, ['bootstrap called']);
});

test('XS bootstrap', async t => {
  const config = await loadBasedir(
    new URL('basedir-controller-2', import.meta.url).pathname,
  );
  config.defaultManagerType = 'xs-worker';
  const hostStorage = provideHostStorage();
  const c = await buildVatController(config, [], { hostStorage });
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.is(
    hostStorage.kvStore.get('kernel.defaultManagerType'),
    'xs-worker',
    'defaultManagerType is saved by kernelKeeper',
  );
  const vatID = c.vatNameToID('bootstrap');
  const options = JSON.parse(hostStorage.kvStore.get(`${vatID}.options`));
  t.is(
    options.managerType,
    'xs-worker',
    'managerType gets recorded for the bootstrap vat',
  );
});

test('static vats are unmetered on XS', async t => {
  const hostStorage = provideHostStorage();
  const config = await loadBasedir(
    new URL('basedir-controller-2', import.meta.url).pathname,
  );
  config.defaultManagerType = 'xs-worker';
  await initializeSwingset(config, [], hostStorage);
  const limited = [];
  const c = await makeSwingsetController(
    hostStorage,
    {},
    {
      spawn(command, args, options) {
        limited.push(args.includes('-l'));
        return spawn(command, args, options);
      },
    },
  );
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.deepEqual(limited, [false, false, false, false]);
});

test('validate config.defaultManagerType', async t => {
  const config = await loadBasedir(
    new URL('basedir-controller-2', import.meta.url).pathname,
  );
  config.defaultManagerType = 'XYZ';
  await t.throwsAsync(buildVatController(config, undefined, { env: {} }), {
    message: /XYZ/,
  });
});

test.serial('bootstrap export', async t => {
  const config = await loadBasedir(
    new URL('basedir-controller-3', import.meta.url).pathname,
  );
  config.defaultManagerType = 'xs-worker';
  const c = await buildVatController(config);
  c.pinVatRoot('bootstrap');
  const vatAdminVatID = c.vatNameToID('vatAdmin');
  const vatAdminDevID = c.deviceNameToID('vatAdmin');
  const commsVatID = c.vatNameToID('comms');
  const vatTPVatID = c.vatNameToID('vattp');
  const timerVatID = c.vatNameToID('timer');
  const bootstrapVatID = c.vatNameToID('bootstrap');
  const leftVatID = c.vatNameToID('left');
  const rightVatID = c.vatNameToID('right');
  // console.log(c.dump());
  // console.log('SLOTS: ', c.dump().runQueue[0].slots);

  // The expected kernel object indices. There's no guarantee that these will
  // be assigned in any particular order, so each time we add a built-in vat,
  // they tend to get shuffled and this test must be updated. TODO: find a
  // better test, probably by sorting the list of vats by their vatID, and
  // then asserting that their root objects are assigned `koNN` numbers in
  // matching order.
  const vatAdminSvc = 'ko20';
  const boot0 = 'ko21';
  const comms0 = 'ko22';
  const left0 = 'ko23';
  const right0 = 'ko24';
  const timer0 = 'ko25';
  const vattp0 = 'ko26';
  const adminDev = 'kd30';
  const kt = [
    [adminDev, vatAdminDevID, 'd+0'],
    [boot0, bootstrapVatID, 'o+0'],
    [left0, leftVatID, 'o+0'],
    [right0, rightVatID, 'o+0'],
    [vatAdminSvc, vatAdminVatID, 'o+0'],
    [comms0, commsVatID, 'o+0'],
    [vattp0, vatTPVatID, 'o+0'],
    [timer0, timerVatID, 'o+0'],
  ];
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    {
      msg: {
        result: 'kp40',
        method: 'bootstrap',
        args: {
          body: '[{"bootstrap":{"@qclass":"slot","iface":"Alleged: vref","index":0},"comms":{"@qclass":"slot","iface":"Alleged: vref","index":1},"left":{"@qclass":"slot","iface":"Alleged: vref","index":2},"right":{"@qclass":"slot","iface":"Alleged: vref","index":3},"timer":{"@qclass":"slot","iface":"Alleged: vref","index":4},"vatAdmin":{"@qclass":"slot","iface":"Alleged: vref","index":5},"vattp":{"@qclass":"slot","iface":"Alleged: vref","index":6}},{"vatAdmin":{"@qclass":"slot","iface":"Alleged: device","index":7}}]',
          slots: [
            boot0,
            comms0,
            left0,
            right0,
            timer0,
            vatAdminSvc,
            vattp0,
            adminDev,
          ],
        },
      },
      target: boot0,
      type: 'send',
    },
  ]);

  // this test was designed before GC, and wants to single-step the kernel,
  // but doesn't care about the GC action steps, so we use this helper
  // function
  async function stepGC() {
    while (c.dump().gcActions.length) {
      // eslint-disable-next-line no-await-in-loop
      await c.step();
    }
    while (c.dump().reapQueue.length) {
      // eslint-disable-next-line no-await-in-loop
      await c.step();
    }
    await c.step(); // the non- GC action
  }

  t.deepEqual(c.dump().log, []);
  // console.log('--- c.step() running bootstrap.obj0.bootstrap');
  await stepGC(); // message bootstrap
  // kernel promise for result of the foo() that bootstrap sends to vat-left
  const fooP = 'kp41';
  t.deepEqual(c.dump().log, ['bootstrap.obj0.bootstrap()']);
  kt.push([comms0, bootstrapVatID, 'o-50']);
  kt.push([left0, bootstrapVatID, 'o-51']);
  kt.push([right0, bootstrapVatID, 'o-52']);
  kt.push([timer0, bootstrapVatID, 'o-53']);
  kt.push([vatAdminSvc, bootstrapVatID, 'o-54']);
  kt.push([vattp0, bootstrapVatID, 'o-55']);
  kt.push([fooP, bootstrapVatID, 'p+5']);
  kt.push([adminDev, bootstrapVatID, 'd-70']);
  // checkKT(t, c, kt); // disabled due to cross-engine GC variation

  t.deepEqual(c.dump().runQueue, [
    {
      type: 'send',
      target: left0,
      msg: {
        method: 'foo',
        args: {
          body: '[1,{"@qclass":"slot","iface":"Alleged: vref","index":0}]',
          slots: [right0],
        },
        result: fooP,
      },
    },
  ]);

  await stepGC(); // dropExports
  await stepGC(); // message foo
  const barP = 'kp42';
  t.deepEqual(c.dump().log, ['bootstrap.obj0.bootstrap()', 'left.foo 1']);
  kt.push([right0, leftVatID, 'o-50']);
  kt.push([barP, leftVatID, 'p+5']);
  // checkKT(t, c, kt); // disabled due to cross-engine GC variation

  t.deepEqual(c.dump().runQueue, [
    {
      type: 'send',
      target: right0,
      msg: {
        method: 'bar',
        args: {
          body: '[2,{"@qclass":"slot","iface":"Alleged: vref","index":0}]',
          slots: [right0],
        },
        result: barP,
      },
    },
    { type: 'notify', vatID: bootstrapVatID, kpid: fooP },
  ]);

  await stepGC(); // message bar

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  // checkKT(t, c, kt); // disabled due to cross-engine GC variation

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: bootstrapVatID, kpid: fooP },
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await stepGC(); // notify

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);
  removeTriple(kt, fooP, bootstrapVatID, 'p+5'); // pruned promise

  // retired imports from bootstrap vat
  removeTriple(kt, vatAdminSvc, bootstrapVatID, 'o-54');
  removeTriple(kt, comms0, bootstrapVatID, 'o-50');
  removeTriple(kt, left0, bootstrapVatID, 'o-51');
  removeTriple(kt, right0, bootstrapVatID, 'o-52');
  removeTriple(kt, timer0, bootstrapVatID, 'o-53');
  removeTriple(kt, vattp0, bootstrapVatID, 'o-55');
  // checkKT(t, c, kt); // disabled due to cross-engine GC variation

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await stepGC(); // notify

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  // that pushes several higher-priority GC dropExports onto the queue as
  // everything gets dropped
  await c.run();

  removeTriple(kt, barP, leftVatID, 'p+5'); // pruned promise

  // everybody else folds up and goes home
  removeTriple(kt, comms0, commsVatID, 'o+0');
  removeTriple(kt, left0, leftVatID, 'o+0');
  removeTriple(kt, right0, leftVatID, 'o-50');
  removeTriple(kt, right0, rightVatID, 'o+0');
  removeTriple(kt, timer0, timerVatID, 'o+0');
  removeTriple(kt, vattp0, vatTPVatID, 'o+0');
  checkKT(t, c, kt);
});
