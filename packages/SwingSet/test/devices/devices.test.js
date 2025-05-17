// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { parse } from '@endo/marshal';
import { kser, kslot } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';
import buildCommand from '../../src/devices/command/command.js';
import { bundleOpts, vstr } from '../util.js';

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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  await c.run();

  // console.log(util.inspect(c.dump(), { depth: null }));
  t.is(
    c.dump().log[0],
    vstr([
      {
        bootstrap: kslot('o+0', 'root'),
        comms: kslot('o-50', 'root'),
        timer: kslot('o-51', 'root'),
        vatAdmin: kslot('o-52', 'root'),
        vattp: kslot('o-53', 'root'),
      },
      {
        d0: kslot('d-70', 'device'),
        vatAdmin: kslot('d-71', 'device'),
      },
    ]),
  );
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
  const devEndows = {
    d1: {
      shared: sharedArray,
    },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  c.queueToVatRoot('bootstrap', 'step1', []);
  await c.run();
  t.deepEqual(c.dump().log, ['callNow', 'invoke 1 2', vstr({ ret: 3 })]);
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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run(); // startup

  function qv(method) {
    c.queueToVatRoot('bootstrap', method, [], 'panic');
  }

  if (mode === '1') {
    qv('do1');
    await c.run();
    t.deepEqual(c.dump().log, ['calling d2.method1', 'method1 hello', 'done']);
  } else if (mode === '2') {
    qv('do2');
    await c.run();
    t.deepEqual(c.dump().log, [
      'calling d2.method2',
      'method2',
      'method3 true',
      'value',
    ]);
  } else if (mode === '3') {
    qv('do3');
    await c.run();
    t.deepEqual(c.dump().log, ['calling d2.method3', 'method3', 'ret true']);
  } else if (mode === '4') {
    qv('do4');
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
    qv('do5');
    await c.run();
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
  const { kernelStorage, debug } = initSwingStore();
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

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  // The initial state should be missing (null). Then we set it with the call
  // from bootstrap, and read it back.
  await initializeSwingset(config, ['write+read'], kernelStorage, initOpts);
  const c1 = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c1.shutdown);
  const d3 = c1.deviceNameToID('d3');
  await c1.run();
  t.deepEqual(c1.dump().log, ['undefined', 'w+r', 'called', 'got {"s":"new"}']);
  const s = debug.dump().kvEntries;
  t.deepEqual(JSON.parse(s[`${d3}.deviceState`]), kser({ s: 'new' }));
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
  const devEndows = {
    command: { ...cm.endowments },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.queueToVatRoot('bootstrap', 'doCommand1', [], 'panic');
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
  const devEndows = {
    command: { ...cm.endowments },
  };

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, devEndows, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  c.queueToVatRoot('bootstrap', 'doCommand2', [], 'panic');
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

// warner HERE
test.serial('liveslots throws when D() gets promise', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrap2,
      },
    },
    devices: {
      d0: {
        sourceSpec: dfile('device-0'),
        creationOptions: { unendowed: true },
      },
    },
  };
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');

  // When liveslots catches an attempt to send a promise into D(), it throws
  // a regular error, which the vat can catch.
  c.queueToVatRoot('bootstrap', 'doPromise1', [], 'panic');
  await c.run();
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);

  // If that isn't working as expected, and the promise makes it to
  // syscall.callNow, the translator will notice and kill the vat. We send a
  // ping() to it to make sure it's still alive. If the vat were dead,
  // queueToVatRoot would throw because the vat was deleted.
  c.queueToVatRoot('bootstrap', 'ping', [], 'panic');
  await c.run();

  // If the translator doesn't catch the promise and it makes it to the device,
  // the kernel will panic, and the c.run()s would throw
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
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  c.pinVatRoot('bootstrap');
  await c.run();

  // deliver doBadCallNow, which will fail, which kills vat-bootstrap, which
  // emits "DANGER: static vat v1 terminated", but does not panic the kernel
  c.queueToVatRoot('bootstrap', 'doBadCallNow', [], 'ignore');
  await c.run();
  t.deepEqual(c.dump().log, ['sending Promise', 'good: callNow failed']);

  // now check that the vat was terminated: this should throw an exception
  // because the entire bootstrap vat was deleted
  t.throws(() => c.queueToVatRoot('bootstrap', 'ping', []), {
    message: /vat name .* must exist, but doesn't/,
  });
});

test.serial('device errors cause vat-catchable D error', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
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

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const bootstrapResult = await initializeSwingset(
    config,
    [],
    kernelStorage,
    initOpts,
  );
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  await c.run();

  t.is(c.kpStatus(bootstrapResult), 'fulfilled'); // not 'rejected'
  const r = c.kpResolution(bootstrapResult);
  const expected = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(parse(r.body), ['got', expected]);
});

test.serial('foreign device nodes cause a catchable error', async t => {
  const kernelStorage = initSwingStore().kernelStorage;
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

  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const bootstrapResult = await initializeSwingset(
    config,
    [],
    kernelStorage,
    initOpts,
  );
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);
  await c.run();

  t.is(c.kpStatus(bootstrapResult), 'fulfilled'); // not 'rejected'
  const r = c.kpResolution(bootstrapResult);
  const expected = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );
  t.deepEqual(parse(r.body), ['got', expected]);
});
