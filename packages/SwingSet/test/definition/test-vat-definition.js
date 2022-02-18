import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

const mUndefined = { '@qclass': 'undefined' };

const capdata = (body, slots = []) => harden({ body, slots });

const capargs = (args, slots = []) => capdata(JSON.stringify(args), slots);

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
  c.pinVatRoot('setup');
  c.pinVatRoot('liveslots');
  let r = c.queueToVatRoot('setup', 'increment', capargs([]), 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(mUndefined), 'setup incr');
  r = c.queueToVatRoot('setup', 'read', capargs([]), 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(1), 'setup read');
  r = c.queueToVatRoot('setup', 'remotable', capargs([]), 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    capargs('Alleged: iface1'),
    'setup Remotable/getInterfaceOf',
  );

  r = c.queueToVatRoot('liveslots', 'increment', capargs([]), 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(mUndefined), 'ls incr');
  r = c.queueToVatRoot('liveslots', 'read', capargs([]), 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), capargs(1), 'ls read');
  r = c.queueToVatRoot('liveslots', 'remotable', capargs([]), 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    capargs('Alleged: iface1'),
    'ls Remotable/getInterfaceOf',
  );
});
