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
  const sharedArray = [];
  const config = {
    vatSources: new Map(),
    devices: [
      [
        'd1',
        require.resolve('./files-devices/device-1'),
        {
          shared: sharedArray,
        },
      ],
    ],
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
  t.deepEqual(sharedArray, ['pushed']);
  t.end();
}

test('d1 with SES', async t => {
  await test1(t, true);
});

test('d1 without SES', async t => {
  await test1(t, false);
});

async function test2(t, mode, withSES) {
  const config = {
    vatSources: new Map(),
    devices: [['d2', require.resolve('./files-devices/device-2'), {}]],
    bootstrapIndexJS: require.resolve('./files-devices/bootstrap-2'),
  };
  const c = await buildVatController(config, withSES, [mode]);
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
  }
  t.end();
}

test('d2.1 with SES', async t => {
  await test2(t, '1', true);
});

test('d2.1 without SES', async t => {
  await test2(t, '1', false);
});

test('d2.2 with SES', async t => {
  await test2(t, '2', true);
});

test('d2.2 without SES', async t => {
  await test2(t, '2', false);
});

test('d2.3 with SES', async t => {
  await test2(t, '3', true);
});

test('d2.3 without SES', async t => {
  await test2(t, '3', false);
});
