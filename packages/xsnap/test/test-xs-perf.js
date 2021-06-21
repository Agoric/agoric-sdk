// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import * as proc from 'child_process';
import * as os from 'os';

import { xsnap } from '../src/xsnap.js';

import { options } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambien

const { entries, fromEntries } = Object;

const shape = obj => fromEntries(entries(obj).map(([p, v]) => [p, typeof v]));

test('meter details', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  const result = await vat.evaluate(`
  let m = new Map();
  let s1 = new Set();
  for (ix = 0; ix < 20000; ix++) {
    m.set(ix, 'garbage');
    s1.add(ix);
  }
  for (ix = 0; ix < 20000; ix++) {
    m.delete(ix);
    s1.delete(ix);
  }

  // metering bigint
  const bn = 12345678901234567n;
  s1.add(bn * bn * bn);

  // metering regex
  s1.add('aaaaa!'.match(/^[a-z]+/))
  `);
  const {
    meterUsage: { meterType, ...meters },
  } = result;

  t.like(
    meters,
    { compute: 1_260_179, allocate: 42_074_144 },
    'compute, allocate meters should be stable; update METER_TYPE?',
  );

  t.log(meters);
  t.deepEqual(
    shape(meters),
    {
      compute: 'number',
      allocate: 'number',
      allocateChunksCalls: 'number',
      allocateSlotsCalls: 'number',
      garbageCollectionCount: 'number',
      mapSetAddCount: 'number',
      mapSetRemoveCount: 'number',
      maxBucketSize: 'number',
    },
    'auxiliary (non-consensus) meters are available',
  );
  t.is(meterType, 'xs-meter-8');
});

test('metering regex - REDOS', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  // Java Classname Evil Regex
  // https://en.wikipedia.org/wiki/ReDoS
  // http://www.owasp.org/index.php/OWASP_Validation_Regex_Repository
  const result = await vat.evaluate(`
  'aaaaaaaaa!'.match(/^(([a-z])+.)+/)
  `);
  const { meterUsage: meters } = result;
  t.like(meters, { compute: 149 });
});

test('meter details are still available with no limit', async t => {
  const opts = options(io);
  const vat = xsnap({ ...opts, meteringLimit: 0 });
  t.teardown(() => vat.terminate());
  const result = await vat.evaluate(`
  for (ix = 0; ix < 200; ix++) {
  }
  `);
  const { meterUsage: meters } = result;
  t.log(meters);
  t.is(typeof meters.compute, 'number');
  t.is(typeof meters.allocate, 'number');
  t.true(meters.compute > 0);
  t.true(meters.allocate > 0);
});

test('high resolution timer', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
      const send = it => issueCommand(ArrayBuffer.fromString(JSON.stringify(it)));

      const t = performance.now();
      send(t);
    `);
  const [milliseconds] = opts.messages.map(s => JSON.parse(s));
  t.log({ milliseconds, date: new Date(milliseconds) });
  t.is('number', typeof milliseconds);
});
