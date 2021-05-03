/* global print, now */
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import { xsnap } from '../src/xsnap';
import { options } from './test-xsnap';

const importModuleUrl = `file://${__filename}`;

const asset = async (...segments) =>
  fs.promises.readFile(
    path.join(importModuleUrl.replace('file:/', ''), '..', ...segments),
    'utf-8',
  );

test('meter details', async t => {
  const opts = options();
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
  `);
  const {
    meterUsage: { meterType, ...meters },
  } = result;
  t.log(meters);
  const { entries, fromEntries } = Object;
  t.deepEqual(
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
    fromEntries(entries(meters).map(([p, v]) => [p, typeof v])),
  );
  t.is(meterType, 'xs-meter-6');
});

test('high resolution timer', async t => {
  const opts = options();
  const vat = xsnap(opts);
  t.teardown(() => vat.terminate());
  await vat.evaluate(`
      const send = it => issueCommand(ArrayBuffer.fromString(JSON.stringify(it)));

      const t = now();
      send(t);
    `);
  const [x] = opts.messages.map(JSON.parse);
  t.log({ usec: x, date: new Date(x * 1000.0) });
  t.is('number', typeof x);
});

test('harden performance', async t => {
  const bootScript = await asset('..', 'dist', 'bundle-ses-boot.umd.js');
  const opts = { ...options(), meteringLimit: 0 };
  const name = 'SES lockdown worker';
  const vat = xsnap({ ...opts, name });
  // t.teardown(() => vat.terminate());
  await vat.evaluate(bootScript);
  t.deepEqual([], opts.messages);

  await vat.evaluate(`
    const encoder = new TextEncoder();
    globalThis.send = msg => issueCommand(encoder.encode(JSON.stringify(msg)).buffer);
  `);

  const script = `
  const events = [];
  let t = now();
  function event(...args) {
    const te = now();
    events.push([te, te - t, ...args]);
    t = te;
  }
  function bench() {
    // 12 iterations, 65,536 objects, ~never finishes
    for (let iter = 0; iter < 11; iter += 1) {
      const size = 1024 * (1 << Math.round(iter / 2));
      print('iter', iter, size);
      event('prep iter', iter, size);
      const keys = new Array(size);
      for (let ix = 0; ix < size; ix += 1) {
        keys[ix] = {};
      }
      event('start loop over keys', iter, size);
      for (const _key of keys) {
        // how long does looping take?
      }
      event('start hardening keys', iter, size);
      for (const key of keys) {
        harden(key);
      }
      event('done hardening', iter, size);
    }
  }
  print('bench...');
  bench(events);
  print('send...', events.length);
  send(events);
  print('done');
  `;
  await vat.evaluate(script);
  vat.close();
  const [events] = opts.messages.map(JSON.parse);
  t.is(11 * 4, events.length);
  // roughly CSV
  for (const event of events) {
    t.log(event.map(v => `${v}`).join(','));
  }
});
