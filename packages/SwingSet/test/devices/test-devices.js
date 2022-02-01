// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { getAllState } from '@agoric/swing-store';
import { parse } from '@endo/marshal';
import { provideHostStorage } from '../../src/hostStorage.js';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import buildCommand from '../../src/devices/command.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function dfile(name) {
  return new URL(`./${name}`, import.meta.url).pathname;
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bootstrap0 = await bundleSource(dfile('bootstrap-0'));
  const bootstrap1 = await bundleSource(dfile('bootstrap-1'));
  const bootstrap2 = await bundleSource(dfile('bootstrap-2'));
  const bootstrap3 = await bundleSource(dfile('bootstrap-3'));
  const bootstrap4 = await bundleSource(dfile('bootstrap-4'));
  const bootstrap5 = await bundleSource(dfile('bootstrap-5'));
  const bootstrap6 = await bundleSource(dfile('bootstrap-6'));
  t.context.data = {
    kernelBundles,
    bootstrap0,
    bootstrap1,
    bootstrap2,
    bootstrap3,
    bootstrap4,
    bootstrap5,
    bootstrap6,
  };
});

test.serial('d0', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap0,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: dfile('device-0'),
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage, {});
  await c.step();
  // console.log(util.inspect(c.dump(), { depth: null }));
  t.deepEqual(JSON.parse(c.dump().log[0]), [
    {
      bootstrap: { '@qclass': 'slot', iface: 'Alleged: vref', index: 0 },
      comms: { '@qclass': 'slot', iface: 'Alleged: vref', index: 1 },
      timer: { '@qclass': 'slot', iface: 'Alleged: vref', index: 2 },
      vatAdmin: { '@qclass': 'slot', iface: 'Alleged: vref', index: 3 },
      vattp: { '@qclass': 'slot', iface: 'Alleged: vref', index: 4 },
    },
    {
      d0: { '@qclass': 'slot', iface: 'Alleged: device', index: 5 },
      vatAdmin: { '@qclass': 'slot', iface: 'Alleged: device', index: 6 },
    },
  ]);
  t.deepEqual(JSON.parse(c.dump().log[1]), [
    'o+0',
    'o-50',
    'o-51',
    'o-52',
    'o-53',
    'd-70',
    'd-71',
  ]);
});

test.serial('d1', async t => {
  const sharedArray = [];
  const config = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap1,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d1: {
        sourceSpec: dfile('device-1'),
      },
    },
  };
  const deviceEndowments = {
    d1: {
      shared: sharedArray,
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.step();
  c.queueToVatRoot('bootstrap', 'step1', capargs([]));
  await c.step();
  t.deepEqual(c.dump().log, [
    'callNow',
    'invoke 1 2',
    JSON.stringify(capargs({ ret: 3 })),
  ]);
  t.deepEqual(sharedArray, ['pushed']);
});

async function test2(t, mode) {
  const config = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
      left: {
        sourceSpec: dfile('vat-left.js'),
      },
    },
    devices: {
      d2: {
        sourceSpec: dfile('device-2'),
        creationOptions: { unendowed: true },
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [mode], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, {});
  c.pinVatRoot('bootstrap');
  await c.step();
  if (mode === '1') {
    t.deepEqual(c.dump().log, ['calling d2.method1', 'method1 hello', 'done']);
  } else if (mode === '2') {
    t.deepEqual(c.dump().log, [
      'calling d2.method2',
      'method2',
      'method3 true',
      'value',
    ]);
  } else if (mode === '3') {
    t.deepEqual(c.dump().log, ['calling d2.method3', 'method3', 'ret true']);
  } else if (mode === '4') {
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
    ]);
    await c.run();
    t.deepEqual(c.dump().log, [
      'calling d2.method4',
      'method4',
      'ret method4 done',
      'd2.m4 foo',
      'method4.bar hello',
      'd2.m4 did bar',
    ]);
  } else if (mode === '5') {
    t.deepEqual(c.dump().log, ['calling v2.method5', 'called']);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
    ]);
    await c.step();
    t.deepEqual(c.dump().log, [
      'calling v2.method5',
      'called',
      'left5',
      'method5 hello',
      'left5 did d2.method5, got ok',
      'ret done',
    ]);
  }
}

test.serial('d2.1', async t => {
  await test2(t, '1');
});

test.serial('d2.2', async t => {
  await test2(t, '2');
});

test.serial('d2.3', async t => {
  await test2(t, '3');
});

test.serial('d2.4', async t => {
  await test2(t, '4');
});

test.serial('d2.5', async t => {
  await test2(t, '5');
});

test.serial('device state', async t => {
  const hostStorage = provideHostStorage();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap3,
      },
    },
    devices: {
      d3: {
        sourceSpec: dfile('device-3'),
        creationOptions: { unendowed: true },
      },
    },
  };

  // The initial state should be missing (null). Then we set it with the call
  // from bootstrap, and read it back.
  await initializeSwingset(config, ['write+read'], hostStorage, t.context.data);
  const c1 = await makeSwingsetController(hostStorage, {});
  const d3 = c1.deviceNameToID('d3');
  await c1.run();
  t.deepEqual(c1.dump().log, ['undefined', 'w+r', 'called', 'got {"s":"new"}']);
  const s = getAllState(hostStorage).kvStuff;
  t.deepEqual(JSON.parse(s[`${d3}.deviceState`]), capargs({ s: 'new' }));
  t.deepEqual(JSON.parse(s[`${d3}.o.nextID`]), 10);
});

test.serial('command broadcast', async t => {
  const broadcasts = [];
  const cm = buildCommand(body => broadcasts.push(body));
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      command: {
        sourceSpec: new URL(cm.srcPath, import.meta.url).pathname,
      },
    },
  };
  const deviceEndowments = {
    command: { ...cm.endowments },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, ['command1'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();
  t.deepEqual(broadcasts, [{ hello: 'everybody' }]);
});

test.serial('command deliver', async t => {
  const cm = buildCommand(() => {});
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      command: {
        sourceSpec: new URL(cm.srcPath, import.meta.url).pathname,
      },
    },
  };
  const deviceEndowments = {
    command: { ...cm.endowments },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, ['command2'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  await c.run();

  t.deepEqual(c.dump().log.length, 0);
  const p1 = cm.inboundCommand({ piece: 'missing', doReject: false });
  await c.run();
  const r1 = await p1;
  t.deepEqual(r1, { response: 'body' });
  t.deepEqual(c.dump().log, ['handle-0-missing']);

  const p2 = cm.inboundCommand({ piece: 'errory', doReject: true });
  let rejection;
  p2.then(
    res => t.fail(`expected to reject, but got ${res}`),
    rej => (rejection = rej),
  );
  await c.run();
  t.deepEqual(c.dump().log, ['handle-0-missing', 'handle-1-errory']);
  t.deepEqual(rejection, { response: 'body' });
});

test.serial('liveslots throws when D() gets promise', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: dfile('device-0'),
        creationOptions: { unendowed: true },
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, ['promise1'], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, {});
  await c.step();
  // When liveslots catches an attempt to send a promise into D(), it throws
  // a regular error, which the vat can catch.
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);

  // If that isn't working as expected, and the promise makes it to
  // syscall.callNow, the translator will notice and kill the vat. We send a
  // ping() to it to make sure it's still alive. If the vat were dead,
  // queueToVatRoot would throw because the vat was deleted.
  c.queueToVatRoot('bootstrap', 'ping', capargs([]), 'panic');
  await c.run();

  // If the translator doesn't catch the promise and it makes it to the device,
  // the kernel will panic, and the c.step() above will reject, so the
  // 'await c.step()' will throw.
});

test.serial('syscall.callNow(promise) is vat-fatal', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap4, // uses setup() to bypass liveslots
        creationOptions: { enableSetup: true },
      },
    },
    devices: {
      d0: {
        sourceSpec: dfile('device-0'),
        creationOptions: { unendowed: true },
      },
    },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage, t.context.data);
  const c = await makeSwingsetController(hostStorage, {});
  await c.step();
  // if the kernel paniced, that c.step() will reject, and the await will throw
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);
  // now check that the vat was terminated: this should throw an exception
  // because the entire bootstrap vat was deleted
  t.throws(() => c.queueToVatRoot('bootstrap', 'ping', capargs([])), {
    message: /vat name .* must exist, but doesn't/,
  });
});

test.serial('device errors cause vat-catchable D error', async t => {
  const hostStorage = provideHostStorage();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap5,
      },
    },
    devices: {
      d5: {
        sourceSpec: dfile('device-5'),
        creationOptions: { unendowed: true },
      },
    },
  };

  const bootstrapResult = await initializeSwingset(
    config,
    [],
    hostStorage,
    t.context.data,
  );
  const c = await makeSwingsetController(hostStorage, {});
  await c.run();

  t.is(c.kpStatus(bootstrapResult), 'fulfilled'); // not 'rejected'
  const r = c.kpResolution(bootstrapResult);
  const expected = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(parse(r.body), ['got', expected]);
});

test.serial('foreign device nodes cause a catchable error', async t => {
  const hostStorage = provideHostStorage();
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap6,
      },
    },
    devices: {
      d6first: {
        sourceSpec: dfile('device-6'),
        creationOptions: { unendowed: true },
      },
      d6second: {
        sourceSpec: dfile('device-6'),
        creationOptions: { unendowed: true },
      },
    },
  };

  const bootstrapResult = await initializeSwingset(
    config,
    [],
    hostStorage,
    t.context.data,
  );
  const c = await makeSwingsetController(hostStorage, {});
  await c.run();

  t.is(c.kpStatus(bootstrapResult), 'fulfilled'); // not 'rejected'
  const r = c.kpResolution(bootstrapResult);
  const expected = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(parse(r.body), ['got', expected]);
});
