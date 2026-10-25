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
  const inputPath = path.join(dir, 'empty');
  fs.writeFileSync(inputPath, '');
  const worker = new Worker(
    new URL('fixtures/file-input-worker.js', import.meta.url),
    { workerData: { inputPath } },
  );
  t.teardown(async () => {
    await worker.terminate();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const service = makeJsonRpcService(worker, 0, () => {}, {
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

const runDriver = (t, mode, env = {}) => {
  const child = spawn(
    process.execPath,
    [
      fileURLToPath(new URL('fixtures/rpc-service-driver.js', import.meta.url)),
      mode,
    ],
    {
      stdio: ['ignore', 'pipe', 'pipe', 'ignore', 'pipe', 'pipe'],
      timeout: 10000,
      env: { ...process.env, ...env },
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
        .filter(line => mode !== 'log-config' || line.startsWith('{"'))
        .map(line => JSON.parse(line));
    },
    output: () => stdout,
  };
};

// A waiter can observe FAILING before the peer finishes publishing its detail.
// That documented state fails immediately with the generic transport error.
for (const [mode, expected] of /** @type {[string, RegExp][]} */ ([
  ['reader-exit', /input worker disappeared|RPC transport failed/],
  ['reader-early-exit', /input worker disappeared|RPC transport failed/],
  ['reader-partial-exit', /input worker disappeared|RPC transport failed/],
  [
    'reader-error',
    /input worker disappeared|reader crash|RPC transport failed/,
  ],
  ['monitor-exit', /lifetime monitor disappeared|RPC transport failed/],
  ['monitor-early-exit', /lifetime monitor disappeared|RPC transport failed/],
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
] of /** @type {[string, string | Uint8Array | undefined, RegExp][]} */ ([
  ['EOF', undefined, /EOF|RPC transport failed/],
  ['malformed JSON', '{not JSON}\n', /JSON|RPC transport failed/],
  [
    'malformed UTF-8 inside otherwise valid JSON',
    Uint8Array.from([
      ...new TextEncoder().encode('{"id":1,"result":"'),
      0xff,
      ...new TextEncoder().encode('","error":null}\n'),
    ]),
    /encoded data|UTF-8|utf-8|RPC transport failed/,
  ],
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

test('transport diagnostics report correlation and lifecycle without payloads', async t => {
  const driver = runDriver(t, 'diagnostics');
  t.is((await driver.read()).id, 1);
  driver.write({ id: 1, result: 'private-response-data', error: null });
  const records = await driver.result();
  const events = records
    .filter(record => record.debug)
    .map(record => record.debug);
  t.deepEqual(
    events.map(record => record.event),
    [
      'RPC service starting',
      'RPC request sent',
      'RPC response received',
      'RPC shutdown starting',
      'RPC service stopped',
    ],
  );
  t.deepEqual(events[1].details, { id: 1, method: 'agd.ReceiveMessage' });
  t.deepEqual(events[2].details, { id: 1, error: false });
  t.notRegex(
    JSON.stringify(events),
    /private-request-data|private-response-data/,
  );
  t.true(records.some(record => record.finished));
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

test('inbound diagnostic IDs follow out-of-order settlements', async t => {
  const driver = runDriver(t, 'diagnostics-inbound');
  driver.write({ method: 'action', id: 0, params: ['private-request-data'] });
  driver.write({ method: 'action', id: 1, params: ['private-request-data'] });
  t.deepEqual(await driver.read(), {
    id: 1,
    result: 'private-response-data',
    error: null,
  });
  t.deepEqual(await driver.read(), {
    id: 0,
    result: 'private-response-data',
    error: null,
  });
  const records = await driver.result();
  const events = records
    .filter(record => record.debug)
    .map(record => record.debug);
  t.deepEqual(
    events
      .filter(record => record.event === 'RPC request received')
      .map(record => record.details.id),
    [0, 1],
  );
  t.deepEqual(
    events
      .filter(record => record.event === 'RPC response sent')
      .map(record => record.details.id),
    [1, 0],
  );
  t.notRegex(
    JSON.stringify(events),
    /private-request-data|private-response-data/,
  );
});

test('failure diagnostics retain active correlation context', async t => {
  const driver = runDriver(t, 'diagnostics-failure');
  t.is((await driver.read()).id, 1);
  driver.input.end();
  const records = await driver.result();
  const events = records
    .filter(record => record.debug)
    .map(record => record.debug);
  t.deepEqual(
    events.find(record => record.event === 'RPC service failed')?.details,
    { activeRequestId: 1, pendingReplies: 0 },
  );
  t.truthy(records.find(record => record.callError));
  t.truthy(records.find(record => record.failure));
  t.notRegex(JSON.stringify(events), /private-request-data/);
});

test('logger failures do not disrupt RPC framing or settlement', async t => {
  const driver = runDriver(t, 'logger-error');
  t.is((await driver.read()).id, 1);
  driver.write({ id: 1, result: 'response', error: null });
  t.deepEqual(await driver.result(), [
    { reply: { id: 1, result: 'response', error: null } },
    { finished: true },
  ]);
});

for (const [debug, enabled] of /** @type {[string | undefined, boolean][]} */ ([
  [undefined, false],
  ['', false],
  ['agoric:none', false],
  ['agoric:debug', true],
  ['agoric', true],
])) {
  test(`repository logging selector ${debug ?? 'unset'} controls transport diagnostics`, async t => {
    const driver = runDriver(t, 'log-config', { DEBUG: debug });
    t.is((await driver.read()).id, 1);
    driver.write({ id: 1, result: 'private-response-data', error: null });
    const records = await driver.result();
    t.deepEqual(records, [
      {
        levels: {
          error: debug !== 'agoric:none',
          info: debug !== 'agoric:none',
          log: debug === undefined || enabled,
          debug: enabled,
        },
      },
      { reply: { id: 1, result: 'private-response-data', error: null } },
      { finished: true },
    ]);
    const output = await driver.output();
    if (enabled) {
      t.regex(output, /ag-chain-cosmos: rpc: RPC service starting/);
      t.regex(output, /RPC request sent/);
      t.regex(output, /RPC service stopped/);
    } else
      t.notRegex(output, /RPC service|RPC request|RPC response|RPC shutdown/);
    const logLines = output
      .split('\n')
      .filter(line => !line.startsWith('{"'))
      .join('\n');
    t.notRegex(logLines, /private-response-data/);
  });
}

test('pipe framing preserves a response larger than the transfer buffer', async t => {
  const driver = runDriver(t, 'call');
  const result = `${'x'.repeat(128 * 1024)}🦉`;
  t.is((await driver.read()).id, 1);
  driver.write({ id: 1, result, error: null });
  const records = await driver.result();
  t.is(records.find(record => record.reply)?.reply.result, result);
  t.true(records.some(record => record.finished));
});
