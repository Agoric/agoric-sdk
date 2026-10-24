import '@endo/init/debug.js';
import test from 'ava';
import { assert } from '@endo/errors';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { text } from 'node:stream/consumers';
import { Worker } from 'node:worker_threads';
import { makeJsonRpcService } from '../src/helpers/rpc-service.js';

test('RPC input EOF is a transport failure rather than successful completion', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpc-eof-'));
  const fd = fs.openSync(path.join(dir, 'empty'), 'w+');
  const worker = new Worker(
    new URL('../src/agd-input-worker.js', import.meta.url),
  );
  t.teardown(async () => {
    await worker.terminate();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const service = makeJsonRpcService(worker, fd, () => {}, {
    write: () => {},
    makeMonitor: () =>
      new Worker(new URL('../src/rpc-monitor-worker.js', import.meta.url)),
  });
  t.throws(() => service.call('before-start', []), { message: /not running/ });
  const finished = service.start();
  t.throws(() => service.start(), { message: /only be started once/ });
  await t.throwsAsync(finished, { message: /EOF/ });
  t.throws(() => service.start(), { message: /only be started once/ });
  t.false(service.reply(1, 'late reply'));
});

/** @import { Duplex } from 'node:stream'; */

const runDriver = (t, mode) => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('fixtures/rpc-service-driver.js', import.meta.url)),
      mode,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe', 'ignore', 'pipe', 'pipe'],
      timeout: 10000,
    },
  );
  assert(child.stdout && child.stderr);
  const stdout = text(child.stdout);
  const stderr = text(child.stderr);
  const exited = once(child, 'exit');
  const streams = Array.from(child.stdio);
  const input = /** @type {Duplex} */ (streams[4]);
  const requests = createInterface({
    input: /** @type {Duplex} */ (streams[5]),
  });
  const iterator = requests[Symbol.asyncIterator]();
  t.teardown(() => {
    child.kill();
    requests.close();
    input.destroy();
  });
  return {
    input,
    write: message => input.write(`${JSON.stringify(message)}\n`),
    async read() {
      const line = await iterator.next();
      if (line.done) throw Error(`driver exited: ${await stderr}`);
      return JSON.parse(line.value);
    },
    async result() {
      t.deepEqual(await exited, [0, null], await stderr);
      const output = await stdout;
      if (mode === 'reader-error') t.regex(await stderr, /reader crash/);
      else t.is(await stderr, '');
      return output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
    },
  };
};

for (const [mode, expected] of /** @type {[string, RegExp][]} */ ([
  ['reader-exit', /input worker disappeared/],
  ['reader-early-exit', /input worker disappeared/],
  ['reader-partial-exit', /input worker disappeared/],
  ['reader-error', /input worker disappeared|reader crash/],
  ['monitor-exit', /lifetime monitor disappeared/],
  ['monitor-early-exit', /lifetime monitor disappeared/],
  ['write-error', /write failed/],
  ['stop-pending', /explicit stop/],
  ['close-pending', /outstanding calls/],
])) {
  test(`blocked RPC calls fail on ${mode}`, async t => {
    const driver = runDriver(t, mode);
    const result = await driver.result();
    t.truthy(
      result.find(record => record.callError),
      `${JSON.stringify(result)}`,
    );
    t.regex(result.find(record => record.callError)?.callError, expected);
    t.truthy(
      result.find(record => record.failure),
      `${JSON.stringify(result)}`,
    );
    t.false(result.some(record => record.reply || record.finished));
  });
}

for (const [
  name,
  response,
  expected,
] of /** @type {[string, string | undefined, RegExp][]} */ ([
  ['EOF', undefined, /EOF|RPC transport failed/],
  ['malformed JSON', '{not JSON}\n', /JSON|RPC transport failed/],
  [
    'mismatched reply',
    '{"id":99,"result":"wrong","error":null}\n',
    /response ID|RPC transport failed/,
  ],
  ['malformed reply', '{"id":1,"result":17,"error":null}\n', /string result/],
  [
    'malformed error',
    '{"id":1,"result":null,"error":{"message":"wrong shape"}}\n',
    /string error/,
  ],
])) {
  test(`blocked RPC call rejects ${name}`, async t => {
    const driver = runDriver(t, 'call');
    t.is((await driver.read()).id, 1);
    if (response === undefined) driver.input.end();
    else driver.input.write(response);
    const result = await driver.result();
    t.regex(result.find(record => record.callError)?.callError, expected);
    t.truthy(result.find(record => record.failure));
    t.false(result.some(record => record.reply || record.finished));
  });
}

test('RPC shutdown completes while the input pipe remains open', async t => {
  const driver = runDriver(t, 'close');
  t.deepEqual(await driver.result(), [{ finished: true }]);
});

test('overlapping calls are rejected without corrupting the active call', async t => {
  const driver = runDriver(t, 'overlap');
  t.is((await driver.read()).id, 1);
  driver.write({ id: 1, result: 'response', error: null });
  const result = await driver.result();
  t.regex(result[0].overlap, /Overlapping/);
  t.deepEqual(result[1], { reply: { id: 1, result: 'response', error: null } });
  t.deepEqual(result[2], { finished: true });
});

for (const mode of [
  'unknown-worker-message',
  'unknown-parent-message',
  'pending-inbound',
  'dispatch-error',
  'duplicate-inbound',
  'pending-shutdown',
  'read-error',
]) {
  test(`RPC service rejects ${mode}`, async t => {
    const driver = runDriver(t, mode);
    if (
      [
        'pending-inbound',
        'dispatch-error',
        'duplicate-inbound',
        'pending-shutdown',
      ].includes(mode)
    )
      driver.write({ method: 'action', id: 0, params: [] });
    if (mode === 'duplicate-inbound')
      driver.write({ method: 'action', id: 0, params: [] });
    if (mode === 'pending-shutdown')
      driver.write({ method: 'agvm.Shutdown', id: 1, params: [] });
    const result = await driver.result();
    t.truthy(result.find(record => record.failure));
    t.false(result.some(record => record.finished));
    if (mode === 'unknown-worker-message')
      t.regex(result[0].failure, /Unknown RPC worker message/);
    if (mode === 'pending-inbound')
      t.regex(result[0].failure, /outstanding calls/);
    if (mode === 'dispatch-error')
      t.regex(result[0].failure, /dispatch failed/);
    if (mode === 'unknown-parent-message')
      t.regex(result[0].failure, /Unknown RPC parent message/);
    if (mode === 'duplicate-inbound')
      t.regex(result[0].failure, /Duplicate inbound RPC ID/);
    if (mode === 'pending-shutdown')
      t.regex(result[0].failure, /outstanding calls/);
    if (mode === 'read-error')
      t.regex(result[0].failure, /bad file descriptor|EBADF/);
  });
}

test('inbound requests can settle out of order and leave no pending shutdown work', async t => {
  const driver = runDriver(t, 'inbound-order');
  driver.write({ method: 'action', id: 0, params: [] });
  driver.write({ method: 'action', id: 1, params: [] });
  t.deepEqual(await driver.read(), { id: 1, result: 'handled', error: null });
  t.deepEqual(await driver.read(), { id: 0, result: 'handled', error: null });
  t.deepEqual(await driver.result(), [{ finished: true }]);
});
