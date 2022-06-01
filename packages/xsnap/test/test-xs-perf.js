/* global performance */
// @ts-check

import '@endo/init';

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
    { compute: 1_380_187, allocate: 42_074_144 },
    'compute, allocate meters should be stable; update METER_TYPE?',
  );

  t.log(meters);
  t.deepEqual(
    shape(meters),
    {
      compute: 'number',
      allocate: 'number',
      currentHeapCount: 'number',
    },
    'evaluate returns meter details',
  );
  t.is(meterType, 'xs-meter-13');
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
  t.like(meters, { compute: 142 });
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
  // @ts-expect-error until ava assertion types
  t.true(meters.compute > 0);
  // @ts-expect-error until ava assertion types
  t.true(meters.allocate > 0);
});

test('high resolution timer', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
      const send = it => issueCommand(new TextEncoder().encode(JSON.stringify(it)).buffer);

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
  const {
    meterUsage: { compute: noUnMeteredCompute },
  } = await vat.evaluate(`
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
  const {
    meterUsage: { compute: someUnMeteredCompute },
  } = await vat.evaluate(`
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
    const send = it => issueCommand(new TextEncoder().encode(it).buffer);
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

/** @param {number} logn */
function dataStructurePerformance(logn) {
  // eslint-disable-next-line no-bitwise
  const n = 1 << logn;
  const send = it => {
    // eslint-disable-next-line no-undef
    return issueCommand(new TextEncoder().encode(JSON.stringify(it)).buffer);
  };
  const t0 = performance.now();
  for (let i = 0; i < 256; i += 1) {
    const a = [];
    for (let j = 0; j < n; j += 1) {
      a.push(j);
    }
    const m = new Map();
    for (let j = 0; j < n; j += 1) {
      m.set(j, j);
    }
    for (let j = 0; j < n; j += 1) {
      m.get(j);
    }
    const s = new Set();
    for (let j = 0; j < n; j += 1) {
      s.add(j);
    }
    for (let j = 0; j < n; j += 1) {
      s.has(j);
    }
  }
  const t1 = performance.now();
  const dur = t1 - t0;
  // O(n log(n))
  const rate = (n * logn) / dur;
  send({ size: n, dur, rate });
}

// This test fails intermittently due to some amount of noise that we cannot
// completely eliminate.
// Rather than have a very low-probability failing test, we skip this, but
// retain the benchmark for future verification in the unlikely event that the
// performance character of XS collections regresses.
test.skip('Array, Map, Set growth is O(log(n))', async t => {
  const opts = options(io);
  const vat = xsnap({ ...opts, meteringLimit: 0 });
  await vat.evaluate(
    `globalThis.dataStructurePerformance = (${dataStructurePerformance})`,
  );

  const run = async size => {
    const {
      meterUsage: { compute },
    } = await vat.evaluate(`dataStructurePerformance(${size})`);
    // @ts-expect-error pop() may return undefined
    const r = JSON.parse(opts.messages.pop());
    t.log({ compute, r });
    return { compute, r };
  };

  const { r: r1 } = await run(8);
  const { r: r2 } = await run(10);
  const { r: r3 } = await run(12);
  t.log({ r2_1: r2.rate / r1.rate, r3_2: r3.rate / r2.rate });
  t.true(r2.rate / r1.rate >= 1);
  t.true(r3.rate / r2.rate >= 1);
});
