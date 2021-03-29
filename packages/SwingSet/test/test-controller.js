/* global require __dirname */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import path from 'path';
import { initSwingStore } from '@agoric/swing-store-simple';
import { buildVatController, loadBasedir } from '../src/index';
import { checkKT } from './util';

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
        sourceSpec: require.resolve('./vat-controller-1'),
        creationOptions: { enableSetup: true },
      },
    },
  };
  const controller = await buildVatController(config);
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
  t.deepEqual(data.kernelTable, []);

  controller.queueToVatExport('vat1', 'o+1', 'foo', capdata('args'));
  t.deepEqual(controller.dump().runQueue, [
    {
      msg: {
        method: 'foo',
        args: capdata('args'),
        result: 'kp40',
      },
      target: 'ko20',
      type: 'send',
    },
  ]);
  await controller.run();
  t.deepEqual(JSON.parse(controller.dump().log[0]), {
    target: 'o+1',
    method: 'foo',
    args: capdata('args'),
  });

  controller.log('2');
  t.is(controller.dump().log[1], '2');
}

test('simple call', async t => {
  await simpleCall(t);
});

test('bootstrap', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-2'),
  );
  // the controller automatically runs the bootstrap function.
  // basedir-controller-2/bootstrap.js logs "bootstrap called" and queues a call to
  // left[0].bootstrap
  const c = await buildVatController(config);
  t.deepEqual(c.dump().log, ['bootstrap called']);
});

test('XS bootstrap', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-2'),
  );
  config.defaultManagerType = 'xs-worker';
  const hostStorage = initSwingStore().storage;
  const c = await buildVatController(config, [], { hostStorage });
  t.deepEqual(c.dump().log, ['bootstrap called']);
  t.is(
    hostStorage.get('kernel.defaultManagerType'),
    'xs-worker',
    'defaultManagerType is saved by kernelKeeper',
  );
  const vatID = c.vatNameToID('bootstrap');
  const options = JSON.parse(hostStorage.get(`${vatID}.options`));
  t.is(
    options.managerType,
    'xs-worker',
    'managerType gets recorded for the bootstrap vat',
  );
});

test('validate config.defaultManagerType', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-2'),
  );
  config.defaultManagerType = 'XYZ';
  await t.throwsAsync(buildVatController(config), { message: /XYZ/ });
});

test('bootstrap export', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-controller-3'),
  );
  const c = await buildVatController(config);
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
  const boot0 = 'ko20';
  const comms0 = 'ko21';
  const left0 = 'ko22';
  const right0 = 'ko23';
  const timer0 = 'ko24';
  const vatAdminSvc = 'ko25';
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
          body:
            '[{"bootstrap":{"@qclass":"slot","iface":"Alleged: vref","index":0},"comms":{"@qclass":"slot","iface":"Alleged: vref","index":1},"left":{"@qclass":"slot","iface":"Alleged: vref","index":2},"right":{"@qclass":"slot","iface":"Alleged: vref","index":3},"timer":{"@qclass":"slot","iface":"Alleged: vref","index":4},"vatAdmin":{"@qclass":"slot","iface":"Alleged: vref","index":5},"vattp":{"@qclass":"slot","iface":"Alleged: vref","index":6}},{"vatAdmin":{"@qclass":"slot","iface":"Alleged: device","index":7}}]',
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

  t.deepEqual(c.dump().log, []);
  // console.log('--- c.step() running bootstrap.obj0.bootstrap');
  await c.step();
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
  checkKT(t, c, kt);

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

  await c.step();
  const barP = 'kp42';
  t.deepEqual(c.dump().log, ['bootstrap.obj0.bootstrap()', 'left.foo 1']);
  kt.push([right0, leftVatID, 'o-50']);
  kt.push([barP, leftVatID, 'p+5']);
  checkKT(t, c, kt);

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

  await c.step();

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: bootstrapVatID, kpid: fooP },
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);
  removeTriple(kt, fooP, bootstrapVatID, 'p+5'); // pruned promise
  checkKT(t, c, kt);

  t.deepEqual(c.dump().runQueue, [
    { type: 'notify', vatID: leftVatID, kpid: barP },
  ]);

  await c.step();

  t.deepEqual(c.dump().log, [
    'bootstrap.obj0.bootstrap()',
    'left.foo 1',
    'right.obj0.bar 2 true',
  ]);

  removeTriple(kt, barP, leftVatID, 'p+5'); // pruned promise
  checkKT(t, c, kt);
  t.deepEqual(c.dump().runQueue, []);
});
