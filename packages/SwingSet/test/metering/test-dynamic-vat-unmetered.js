// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import bundleSource from '@endo/bundle-source';
import { buildVatController } from '../../src/index.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

// Dynamic vats are created without metering by default

test('unmetered dynamic vat', async t => {
  const config = {
    bootstrap: 'bootstrap',
    defaultManagerType: 'xs-worker',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat-load-dynamic.js', import.meta.url).pathname,
      },
    },
  };
  const c = await buildVatController(config, []);
  c.pinVatRoot('bootstrap');

  // let the vatAdminService get wired up before we create any new vats
  await c.run();

  // we'll give this bundle to the loader vat, which will use it to create a
  // new (unmetered) dynamic vat
  const dynamicVatBundle = await bundleSource(
    new URL('metered-dynamic-vat.js', import.meta.url).pathname,
  );

  // 'createVat' will import the bundle
  const kp1 = c.queueToVatRoot(
    'bootstrap',
    'createVat',
    capargs([dynamicVatBundle]),
    'panic',
  );
  await c.run();
  const res1 = c.kpResolution(kp1);
  t.is(JSON.parse(res1.body)[0], 'created', res1.body);
  // const doneKPID = res1.slots[0];

  // Now send a message to the dynamic vat that runs normally
  const kp2 = c.queueToVatRoot('bootstrap', 'run', capargs([]), 'panic');
  await c.run();
  t.is(c.kpStatus(kp2), 'fulfilled');
  t.deepEqual(c.kpResolution(kp2), capargs(42));

  // TODO: find a way to prove that the xsnap child process does not have a
  // per-crank meter imposed upon it. Previously, this test only exercised
  // Node.js workers, and used Array(4e9) as code that would be caught by the
  // injected metering shim, but tolerated by V8 itself (because arrays are
  // lazy). This was followed by a big='1234'; for (;;) { big += big }, which
  // triggers a V8 catchable RangeError exception. XS is more literal about
  // allocation space.

  // We no longer care about injected Node.js metering; we only care about
  // metering under XS. To test that metering is really turned off on XS, we
  // must perform an action that requires more than the default per-crank
  // computron limit, but of course we'd prefer something that doesn't
  // actually take a lot of time or memory. I don't yet know how to do this.
  // For now, we're only testing that it is possible to run an XS worker
  // without a 'meter:' argument, not that the resulting vat is
  // unconstrained.
});
