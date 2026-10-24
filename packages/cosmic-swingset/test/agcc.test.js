import '@endo/init/debug.js';
import test from 'ava';
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
import { makePromiseKit } from '@endo/promise-kit';
import { assert } from '@endo/errors';
import { loadAgcc, MAX_FILE_DESCRIPTOR } from '../src/agcc-shim.js';
import {
  makeAgcc,
  VM_RECEIVE_MESSAGE,
  AGD_RECEIVE_MESSAGE,
} from '../src/agcc-agvm.js';
import { VM_SHUTDOWN_METHOD } from '../src/helpers/rpc-service.js';

/** @import { Duplex } from 'node:stream'; */

test('bridge selection requires complete, whole decimal FD configuration', async t => {
  const bridge = {
    start: () => {
      throw Error('not started in selection tests');
    },
  };
  const calls = [];
  const loaders = {
    loadNative: async () => {
      calls.push('native');
      return bridge;
    },
    makeExternal: (inputFd, outputFd) => {
      calls.push([inputFd, outputFd]);
      return bridge;
    },
  };
  t.is(await loadAgcc({}, loaders), bridge);
  t.deepEqual(calls, ['native']);
  calls.length = 0;
  t.is(
    await loadAgcc(
      { AGVM_INPUT_FD: '0', AGVM_OUTPUT_FD: String(MAX_FILE_DESCRIPTOR) },
      loaders,
    ),
    bridge,
  );
  t.deepEqual(calls, [[0, MAX_FILE_DESCRIPTOR]]);
  calls.length = 0;
  for (const env of [
    { AGVM_INPUT_FD: '4' },
    { AGVM_OUTPUT_FD: '5' },
    ...[
      '',
      '-1',
      '3.14',
      '4x',
      '0x7E',
      ' 4',
      '4 ',
      'Infinity',
      String(2 ** 31),
      String(2 ** 53),
    ].map(value => ({ AGVM_INPUT_FD: value, AGVM_OUTPUT_FD: '5' })),
    { AGVM_INPUT_FD: '4', AGVM_OUTPUT_FD: '' },
  ]) {
    await t.throwsAsync(loadAgcc(env, loaders), {
      message: /file descriptor|specified together/,
    });
  }
  t.deepEqual(calls, [], 'invalid configuration must not load either adapter');
});

test('external startup validates arguments and exposes only a sender after start', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcc-start-'));
  const inputFd = fs.openSync(path.join(dir, 'input'), 'w+');
  const worker = new Worker(
    new URL('../src/agd-input-worker.js', import.meta.url),
  );
  const finished = makePromiseKit();
  t.teardown(async () => {
    await worker.terminate();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  const io = {
    write: () => {
      throw Error('invalid calls must not write');
    },
    makeInputWorker: () => worker,
    makeMonitor: () =>
      new Worker(new URL('../src/rpc-monitor-worker.js', import.meta.url)),
    onFinish: () => finished.resolve(undefined),
    onError: finished.reject,
  };
  for (const fd of [-1, 0.5, 2 ** 31, NaN]) {
    t.throws(() => makeAgcc(fd, 1, io), { message: /file descriptor/ });
    t.throws(() => makeAgcc(0, fd, io), { message: /file descriptor/ });
  }
  const bridge = makeAgcc(inputFd, 1, io);
  t.deepEqual(Object.keys(bridge), ['start']);
  t.throws(() => Reflect.apply(bridge.start, undefined, [null, ['agd']]), {
    message: /function/,
  });
  for (const argv of [[], ['agd', 42], Array(1)]) {
    t.throws(() => Reflect.apply(bridge.start, undefined, [() => {}, argv]), {
      message: /argv/,
    });
  }
  const sender = bridge.start(() => {}, ['agd', 'start']);
  t.deepEqual(Object.keys(sender), ['send']);
  t.throws(() => bridge.start(() => {}, ['agd']), { message: /once/ });
  for (const port of [0, -1, 1.5, 2 ** 31, NaN, Infinity, 'r1']) {
    t.throws(() => Reflect.apply(sender.send, undefined, [port, '{}']), {
      message: /port/,
    });
  }
  t.throws(() => Reflect.apply(sender.send, undefined, [1, {}]), {
    message: /string/,
  });
  await t.throwsAsync(finished.promise, { message: /EOF/ });
});

test('external bridge routes real pipe RPC replies independently of logical ports', async t => {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('fixtures/agcc-driver.js', import.meta.url))],
    {
      stdio: ['ignore', 'ignore', 'pipe', 'ignore', 'pipe', 'pipe'],
      timeout: 15000,
    },
  );
  assert(child.stderr);
  const stderr = text(child.stderr);
  const exited = once(child, 'exit');
  const streams = Array.from(child.stdio);
  const input = /** @type {Duplex} */ (streams[4]);
  const output = /** @type {Duplex} */ (streams[5]);
  const lines = createInterface({ input: output });
  const iterator = lines[Symbol.asyncIterator]();
  t.teardown(() => {
    child.kill();
    lines.close();
  });
  const write = rpcMessage => input.write(`${JSON.stringify(rpcMessage)}\n`);
  const read = async () => {
    const line = await iterator.next();
    if (line.done) throw Error(`bridge exited: ${await stderr}`);
    return JSON.parse(line.value);
  };
  const action = (id, type, data = '', needsReply = true) =>
    write({
      method: VM_RECEIVE_MESSAGE,
      params: [{ port: 1, data: JSON.stringify({ type, data }), needsReply }],
      id,
    });
  action(1, 'call', 'request');
  t.deepEqual(await read(), {
    method: AGD_RECEIVE_MESSAGE,
    params: [{ port: 7, data: 'request', needsReply: true }],
    id: 1,
  });
  write({ id: 1, result: '{"error":"application failure"}', error: null });
  t.deepEqual(await read(), {
    id: 1,
    result: '{"error":"application failure"}',
    error: null,
  });
  action(0, 'resolve-twice');
  t.deepEqual(await read(), { id: 0, result: 'first', error: null });
  action(2, 'reject');
  t.deepEqual(await read(), { id: 2, result: null, error: 'declined' });
  action(3, 'notify', '', false);
  t.deepEqual(await read(), {
    id: 3,
    result: '<no-reply-requested>',
    error: null,
  });
  action(4, 'call', 'second request');
  t.deepEqual(await read(), {
    method: AGD_RECEIVE_MESSAGE,
    params: [{ port: 7, data: 'second request', needsReply: true }],
    id: 2,
  });
  write({ id: 2, result: null, error: 'Go RPC failure' });
  t.deepEqual(await read(), {
    id: 4,
    error: null,
    result: '{"error":"Go RPC failure"}',
  });
  action(7, 'direct-call', 'direct request');
  t.is((await read()).id, 3);
  write({ id: 3, result: null, error: 'direct failure' });
  const directFailure = await read();
  t.is(directFailure.id, 7);
  t.is(directFailure.result, null);
  t.regex(directFailure.error, /direct failure/);
  action(8, 'custom-error', 'custom request');
  t.is((await read()).id, 4);
  write({ id: 4, result: null, error: 'custom failure' });
  t.deepEqual(await read(), {
    id: 8,
    result: 'handled: custom failure',
    error: null,
  });
  action(9, 'direct-call', 'successful direct request');
  t.is((await read()).id, 5);
  write({ id: 5, result: 'successful result', error: null });
  t.deepEqual(await read(), {
    id: 9,
    result: 'successful result',
    error: null,
  });
  write({ method: VM_SHUTDOWN_METHOD, params: [], id: 5 });
  t.deepEqual(await read(), { id: 5, result: '<shutdown>', error: null });
  t.deepEqual(await exited, [0, null]);
  t.is(await stderr, '');
});

test('external bridge rejects an unexpected node port before dispatch', async t => {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL('fixtures/agcc-driver.js', import.meta.url))],
    {
      stdio: ['ignore', 'ignore', 'pipe', 'ignore', 'pipe', 'pipe'],
      timeout: 10000,
    },
  );
  t.teardown(() => child.kill());
  assert(child.stderr);
  const stderr = text(child.stderr);
  const exited = once(child, 'exit');
  const input = /** @type {Duplex} */ (Array.from(child.stdio)[4]);
  child.stderr.once('data', () => input.end());
  input.write(
    `${JSON.stringify({
      method: VM_RECEIVE_MESSAGE,
      params: [{ port: 2, data: '{}', needsReply: true }],
      id: 1,
    })}\n`,
  );
  const [code, signal] = await exited;
  t.is(signal, null);
  t.not(code, 0);
  const diagnostic = await stderr;
  t.regex(diagnostic, /unexpected RPC message/);
  t.regex(diagnostic, /port.*2/);
});

test.serial(
  'native binding implements the same startup/sender contract',
  async t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcc-native-'));
    t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }));
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL('fixtures/agcc-native.js', import.meta.url)), dir],
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 },
    );
    t.teardown(() => child.kill());
    const out = text(child.stdout);
    const err = text(child.stderr);
    const [code] = await once(child, 'exit');
    const stderr = await err;
    await out;
    t.is(code, 0, `native binding failed: ${stderr}`);
    t.regex(stderr, /native-contract-ok/);
  },
);

test.serial(
  'native service errors support default JSON and per-call handlers',
  async t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcc-native-errors-'));
    t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }));
    const agd = fileURLToPath(new URL('../../../bin/agd', import.meta.url));
    for (const args of [
      ['init', 'bridge-probe', '--chain-id=agcc-contract'],
      ['keys', 'add', 'validator', '--keyring-backend=test'],
      [
        'genesis',
        'add-genesis-account',
        'validator',
        '100000000stake',
        '--keyring-backend=test',
      ],
      [
        'genesis',
        'gentx',
        'validator',
        '10000000stake',
        '--chain-id=agcc-contract',
        '--keyring-backend=test',
      ],
      ['genesis', 'collect-gentxs'],
    ]) {
      const child = spawn(agd, [...args, `--home=${dir}`], {
        stdio: ['ignore', 'pipe', 'pipe'],
        // bin/agd may rebuild the Go binaries before running the command.
        timeout: 120000,
      });
      t.teardown(() => child.kill());
      const out = text(child.stdout);
      const err = text(child.stderr);
      const [code] = await once(child, 'exit');
      const stderr = await err;
      await out;
      t.is(code, 0, `${args.join(' ')} failed: ${stderr}`);
      if (code !== 0) return;
    }
    for (const operation of ['start']) {
      const child = spawn(
        process.execPath,
        [
          fileURLToPath(new URL('fixtures/agcc-native.js', import.meta.url)),
          dir,
          operation,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'], timeout: 20000 },
      );
      t.teardown(() => child.kill());
      const out = text(child.stdout);
      const err = text(child.stderr);
      const [code, signal] = await once(child, 'exit');
      const stderr = await err;
      await out;
      t.is(code, 0, `${operation} failed (${signal}): ${stderr}`);
      if (operation === 'start') t.regex(stderr, /native-service-error-ok/);
    }
  },
);
