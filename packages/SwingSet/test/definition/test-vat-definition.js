import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

const mUndefined = { '@qclass': 'undefined' };

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

test('create with setup and buildRootObject', async t => {
  const config = {
    vats: {
      setup: {
        sourceSpec: new URL('vat-setup.js', import.meta.url).pathname,
      },
      liveslots: {
        sourceSpec: new URL('vat-liveslots.js', import.meta.url).pathname,
      },
    },
  };
  const c = await buildVatController(config, []);
  t.teardown(c.shutdown);
  c.pinVatRoot('setup');
  c.pinVatRoot('liveslots');
  let r = c.queueToVatRoot('setup', 'increment', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(mUndefined), 'setup incr');
  r = c.queueToVatRoot('setup', 'read', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(1), 'setup read');
  r = c.queueToVatRoot('setup', 'remotable', [], 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    capargs('Alleged: iface1'),
    'setup Remotable/getInterfaceOf',
  );

  r = c.queueToVatRoot('liveslots', 'increment', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(mUndefined), 'ls incr');
  r = c.queueToVatRoot('liveslots', 'read', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(1), 'ls read');
  r = c.queueToVatRoot('liveslots', 'remotable', [], 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    capargs('Alleged: iface1'),
    'ls Remotable/getInterfaceOf',
  );
});
