import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

async function test0(t, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d0', require.resolve('./files-devices/device-0'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-0'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  // console.log(util.inspect(c.dump(), { depth: null }));
  t.deepEqual(JSON.parse(c.dump().log[0]), {
    args: [
      [],
      {
        _bootstrap: { '@qclass': 'slot', index: 0 },
      },
      {
        _dummy: 'dummy',
        d0: { '@qclass': 'slot', index: 1 },
      },
    ],
  });
  t.deepEqual(JSON.parse(c.dump().log[1]), [
    { type: 'export', id: 0 },
    { type: 'deviceImport', id: 40 },
  ]);
  t.end();
}

test('d0 with SES', async t => {
  await test0(t, true);
});

test('d0 without SES', async t => {
  await test0(t, false);
});

async function test1(t, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d1', require.resolve('./files-devices/device-1'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-1'),
  };
  const c = await buildVatController(config, withSES);
  await c.step();
  c.queueToExport('_bootstrap', 0, 'step1', '{"args":[]}');
  await c.step();
  console.log(c.dump().log);
  t.deepEqual(c.dump().log, [
    'callNow',
    'invoke 0 set',
    '{"data":"{}","slots":[]}',
  ]);
  t.end();
}

test('d1 with SES', async t => {
  await test1(t, true);
});

test('d1 without SES', async t => {
  await test1(t, false);
});
