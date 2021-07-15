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
  // @ts-ignore extra meters not declared on RunResult (TODO: #3139)
  t.true(meters.mapSetAddCount > 20000);
  t.is(meterType, 'xs-meter-8');
});

test('isReady does not compute / allocate', async t => {
  const opts = options(io);
  const vat1 = xsnap(opts);
  t.teardown(() => vat1.terminate());
  const vat2 = xsnap(opts);
  t.teardown(() => vat2.terminate());

  await vat1.evaluate('null');
  const { meterUsage: m1 } = await vat1.evaluate('null');
  t.log(m1);

  await vat2.evaluate('null');
  await vat2.isReady();
  const { meterUsage: m2 } = await vat2.evaluate('null');

  t.log(m2);

  t.is(m1.compute, m2.compute);
  t.is(m1.allocate, m2.allocate);
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

test('metering can be switched off / on at run-time', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  const { meterUsage: { compute: noUnMeteredCompute } } = await vat.evaluate(`
      for (let work=0; work < 1000; work++) {}
      const limit = currentMeterLimit();
      const before = resetMeter(0, 0);
      try {
        // nothing
      } finally {
        resetMeter(limit, before);
      }
      for (let work=0; work < 1000; work++) {}
    `);
  const { meterUsage: { compute: someUnMeteredCompute } } = await vat.evaluate(`
    for (let work=0; work < 1000; work++) {}
    const limit = currentMeterLimit();
    const before = resetMeter(0, 0);
    try {
      for (let work=0; work < 2000; work++) {}
    } finally {
      resetMeter(limit, before);
    }
    for (let work=0; work < 1000; work++) {}
  `);
  t.log({ noUnMeteredCompute, someUnMeteredCompute });
  t.is(noUnMeteredCompute, someUnMeteredCompute);
});

test('metering switch - start compartment only', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    const send = it => issueCommand(ArrayBuffer.fromString(it));
    resetMeter(0, 0);
    try {
      (new Compartment()).evalate('resetMeter(0, 0)');
    } catch (_err) {
      send('no meteringSwitch in Compartment');
    }
  `);
  await vat.close();
  t.deepEqual(['no meteringSwitch in Compartment'], opts.messages);
});
