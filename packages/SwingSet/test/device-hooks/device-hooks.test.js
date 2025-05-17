// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { kunser, kser, kslot } from '@agoric/kmarshal';
import { initSwingStore } from '@agoric/swing-store';

import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../../src/index.js';

function dfile(name) {
  return new URL(`./${name}`, import.meta.url).pathname;
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bootstrapBundle = await bundleSource(dfile('bootstrap-device-hook.js'));
  const deviceBundle = await bundleSource(dfile('device-use-hook.js'));
  t.context.data = {
    kernelBundles,
    bootstrapBundle,
    deviceBundle,
  };
});

test('add hook', async t => {
  const config = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: {
        bundle: t.context.data.bootstrapBundle,
      },
      extra1: {
        bundle: t.context.data.bootstrapBundle,
      },
      extra2: {
        bundle: t.context.data.bootstrapBundle,
      },
    },
    devices: {
      hookdev: {
        bundle: t.context.data.deviceBundle,
        creationOptions: { unendowed: true },
      },
    },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  const initOpts = {
    ...t.context.data,
    addComms: false,
    addVattp: false,
    addTimer: false,
  };
  const { kernelBundle } = t.context.data.kernelBundles;
  const runtimeOpts = { kernelBundle };
  await initializeSwingset(config, [], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
  t.teardown(c.shutdown);

  let hookreturn;
  function setHookReturn(args, slots = []) {
    hookreturn = kser(args, slots);
  }
  const hooklog = [];

  function hook1(args) {
    hooklog.push(args);
    return hookreturn; // must be capdata
  }
  c.debug.addDeviceHook('hookdev', 'hook1', hook1);
  function throwError() {
    throw Error('deliberate hook error');
  }
  c.debug.addDeviceHook('hookdev', 'throwError', throwError);

  const bootkref = c.pinVatRoot('bootstrap');
  const extra1kref = c.pinVatRoot('extra1');
  const extra2kref = c.pinVatRoot('extra2');
  await c.run();
  t.deepEqual(hooklog, []);

  // When we queueToVatRoot() to doCapdata(), the 'hookinput' we provide will
  // appear as the first argument do doCapdata(), which passes it into
  // D(hookdev).returnCapdata(hookinput). The raw device therefore receives a
  // dispatch.invoke where `argsCapdata` is kser([hookinput]) with drefs.
  // It passes that to `syscall.callKernelHook`, which translate it, and our
  // hook receives kser([hookinput]) with krefs. We record this in hooklog
  // for comparison.
  //
  // Our hook returns 'hookreturn' (capdata with krefs). The syscall
  // translates it back and returns it to the raw device as
  // `hookResultCapdata`. For doCapdata/returnCapdata, the device wraps this
  // as `{ hookResultCapdata }` so we can see the details without the
  // D(hookdev) modifying it further. The vat's doCapdata() call receives
  // this wrapped data and uses it to resolve the result promise, so our
  // `kpResolution` gets back `kser({hookResultCapdata})`.

  function expCD(hret) {
    return kser({ hookResultCapdata: kser(hret) });
  }

  // Doing a queueToVatRoot() to doActual() does the same thing with
  // 'hookinput', but does not wrap `hookResultCapdata'. Whatever
  // kref-capdata we provide as 'hookreturn' is thus translated from kref to
  // dref to vref to kref, and `kpResolution` gets back the translated form
  // of `hookreturn`.

  // basic test: callKernelHook() with static data, returns kser(static)
  {
    setHookReturn({ y: 2 });
    const kp = c.queueToVatRoot('bootstrap', 'doCapdata', [{ x: 1 }]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([{ x: 1 }]));
    t.deepEqual(hooklog, []);
    t.deepEqual(c.kpResolution(kp), expCD({ y: 2 }));
  }

  // same, but we ask the hook to return the actual capdata, not capdata
  // which serializes the capdata
  {
    setHookReturn({ y: 4 });
    const kp = c.queueToVatRoot('bootstrap', 'doActual', [{ x: 3 }]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([{ x: 3 }]));
    t.deepEqual(hooklog, []);
    t.deepEqual(c.kpResolution(kp), kser({ y: 4 }));
  }

  // tell the vat to share several objects with us, so we can learn their krefs
  let o1kref;
  let o2kref;
  {
    const kp = c.queueToVatRoot('bootstrap', 'returnObjects', []);
    await c.run();
    const res3 = c.kpResolution(kp);
    t.is(res3.slots.length, 3);
    t.is(res3.slots[0], bootkref);
    o1kref = res3.slots[1];
    o2kref = res3.slots[2];
    // these happen to be the current values
    t.is(o1kref, 'ko24');
    t.is(o2kref, 'ko25');
  }

  // now tell the vat to pass those objects to the hook, we should see their
  // capdata emerge in the hooklog as krefs, not drefs
  {
    setHookReturn(0); // 'undefined' isn't handled by our lazy JSON marshaller
    const kp = c.queueToVatRoot('bootstrap', 'doObjects', []);
    await c.run();
    const exp = kser([
      kslot(bootkref, 'root'),
      kslot(o1kref, 'obj'),
      kslot(o2kref, 'obj'),
    ]);
    t.deepEqual(hooklog.shift(), exp);
    t.deepEqual(hooklog, []);
    t.deepEqual(c.kpResolution(kp), expCD(0));
  }

  // do it again, to make sure they get serialized the same way twice
  {
    const kp = c.queueToVatRoot('bootstrap', 'doObjects', []);
    await c.run();
    const exp = kser([
      kslot(bootkref, 'root'),
      kslot(o1kref, 'obj'),
      kslot(o2kref, 'obj'),
    ]);
    t.deepEqual(hooklog.shift(), exp);
    t.deepEqual(hooklog, []);
    t.deepEqual(c.kpResolution(kp), expCD(0));
  }

  // now have the hook return some objects, and introduce a new one (the
  // vat-extra1 root object) to test the kref->dref return pathway
  {
    // return [root, o1, extra1]
    setHookReturn([
      kslot(bootkref, 'root'),
      kslot(o1kref, 'obj'),
      kslot(extra1kref, 'root'),
    ]);
    const kp = c.queueToVatRoot('bootstrap', 'doCapdata', [0]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([0]));
    t.deepEqual(hooklog, []);
    // the device sees these drefs
    const exp = kser({
      hookResultCapdata: kser([
        kslot('o-10', 'root'),
        kslot('o-11', 'obj'),
        kslot('o-13', 'root'),
      ]),
    });
    t.deepEqual(c.kpResolution(kp), exp);
  }

  // same, but ask the hook to return actual capdata, not wrapped. Our vat
  // helper methods compares these objects against local copies to make sure
  // they are unserialized by D() within the vat correctly. We make three
  // separate calls to examine three separate objects, which makes matching
  // against the serialized data easier (no concern about ordering of slots)

  {
    // return root
    setHookReturn(kslot(bootkref, 'root'));
    const kp = c.queueToVatRoot('bootstrap', 'checkObjects1', [0]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([0]));
    t.deepEqual(hooklog, []);
    const exp = kser({ match: true, rroot: kslot(bootkref, 'root') });
    t.deepEqual(c.kpResolution(kp), exp);
  }

  {
    // return r2
    setHookReturn(kslot(o2kref, 'obj'));
    const kp = c.queueToVatRoot('bootstrap', 'checkObjects2', [0]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([0]));
    t.deepEqual(hooklog, []);
    const exp = kser({ match: true, r2: kslot(o2kref, 'obj') });
    t.deepEqual(c.kpResolution(kp), exp);
  }

  {
    // return extra2
    setHookReturn(kslot(extra2kref, 'root'));
    const kp = c.queueToVatRoot('bootstrap', 'checkObjects3', [0]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([0]));
    t.deepEqual(hooklog, []);
    const exp = kser({ rextra2: kslot(extra2kref, 'root') });
    t.deepEqual(c.kpResolution(kp), exp);
  }

  const deviceKref = 'kd32';
  {
    // exercise passing device nodes into the hook
    setHookReturn(0);
    const kp = c.queueToVatRoot('bootstrap', 'checkDevNodeIn', [0]);
    await c.run();
    // hooklog should get kref for devnode d+1
    const got = hooklog.shift();
    t.deepEqual(got, kser([kslot(deviceKref, 'device node')]));
    t.deepEqual(hooklog, []);
    // same as what the vat returned
    const exp = kser(kslot(deviceKref, 'device node'));
    t.deepEqual(c.kpResolution(kp), exp);
  }

  {
    // exercise returning device nodes from the hook
    setHookReturn(kslot(deviceKref, 'device node'));
    const kp = c.queueToVatRoot('bootstrap', 'checkDevNodeOut', [0]);
    await c.run();
    t.deepEqual(hooklog.shift(), kser([0]));
    t.deepEqual(hooklog, []);
    const exp = kser({ d2: kslot(deviceKref, 'device node'), match: true });
    t.deepEqual(c.kpResolution(kp), exp);
  }

  const err = Error(
    'syscall.callNow failed: device.invoke failed, see logs for details',
  );

  {
    // test error within hook
    setHookReturn(0);
    // writes "dm.invoke failed, informing calling vat" and "deliberate hook
    // error" to logs
    const kp = c.queueToVatRoot('bootstrap', 'throwError', [0]);
    await c.run();
    const exp = { worked: false, err };
    t.deepEqual(kunser(c.kpResolution(kp)), exp);
  }

  {
    // test missing hook name
    setHookReturn(0);
    // writes "dm.invoke failed, informing calling vat" and "device d7 has no
    // hook named missingHook" to logs
    const kp = c.queueToVatRoot('bootstrap', 'missingHook', [0]);
    await c.run();
    const exp = { worked: false, err };
    t.deepEqual(kunser(c.kpResolution(kp)), exp);
  }
});
