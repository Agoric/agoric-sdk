// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import * as childProcess from 'child_process';
import * as os from 'os';
import { xsnap } from '../src/xsnap';

const decoder = new TextDecoder();

const xsnapOptions = {
  name: 'xsnap test worker',
  spawn: childProcess.spawn,
  os: os.type(),
  stderr: 'inherit',
  stdout: 'inherit',
};

export function options() {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  return { ...xsnapOptions, handleCommand, messages };
}

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

      const t = performance.now();
      send(t);
    `);
  const [milliseconds] = opts.messages.map(JSON.parse);
  t.log({ milliseconds, date: new Date(milliseconds) });
  t.is('number', typeof milliseconds);
});
