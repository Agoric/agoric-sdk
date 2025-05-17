import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { kser } from '@agoric/kmarshal';
import { buildVatController } from '../../src/index.js';

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
  t.deepEqual(c.kpResolution(r), kser(undefined), 'setup incr');
  r = c.queueToVatRoot('setup', 'read', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), kser(1), 'setup read');
  r = c.queueToVatRoot('setup', 'remotable', [], 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    kser('Alleged: iface1'),
    'setup Remotable/getInterfaceOf',
  );

  r = c.queueToVatRoot('liveslots', 'increment', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), kser(undefined), 'ls incr');
  r = c.queueToVatRoot('liveslots', 'read', [], 'panic');
  await c.run();
  t.deepEqual(c.kpResolution(r), kser(1), 'ls read');
  r = c.queueToVatRoot('liveslots', 'remotable', [], 'panic');
  await c.run();
  t.deepEqual(
    c.kpResolution(r),
    kser('Alleged: iface1'),
    'ls Remotable/getInterfaceOf',
  );
});
