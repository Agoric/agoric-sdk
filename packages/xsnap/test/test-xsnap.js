/* global setTimeout, __filename */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import * as proc from 'child_process';
import * as os from 'os';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';

import { xsnap } from '../src/xsnap.js';
import { ExitCode, ErrorCode } from '../api.js';

import { options, decode, encode, loader } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient
const ld = loader(import.meta.url);

test('evaluate and issueCommand', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`issueCommand(ArrayBuffer.fromString("Hello, World!"));`);
  await vat.close();
  t.deepEqual(['Hello, World!'], opts.messages);
});

test('evaluate until idle', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    (async () => {
      issueCommand(ArrayBuffer.fromString("Hello, World!"));
    })();
  `);
  await vat.close();
  t.deepEqual(['Hello, World!'], opts.messages);
});

test('evaluate infinite loop', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(vat.terminate);
  await t.throwsAsync(vat.evaluate(`for (;;) {}`), {
    code: ExitCode.E_TOO_MUCH_COMPUTATION,
    instanceOf: ErrorCode,
  });
  t.deepEqual([], opts.messages);
});

// TODO: Reenable when this doesn't take 3.6 seconds.
test('evaluate promise loop', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  t.teardown(vat.terminate);
  await t.throwsAsync(
    vat.evaluate(`
    function f() {
      Promise.resolve().then(f);
    }
    f();
  `),
    {
      code: ExitCode.E_TOO_MUCH_COMPUTATION,
      instanceOf: ErrorCode,
    },
  );
  t.deepEqual([], opts.messages);
});

test('evaluate and report', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  const result = await vat.evaluate(`(() => {
    const report = {};
    Promise.resolve('hi').then(v => {
      report.result = ArrayBuffer.fromString(v);
    });
    return report;
  })()`);
  await vat.close();
  const { reply } = result;
  t.deepEqual('hi', decode(reply));
});

test('evaluate error', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat
    .evaluate(`***`)
    .then(_ => {
      t.fail('should throw');
    })
    .catch(_ => {
      t.pass();
    });
  await vat.terminate();
});

test('evaluate does not throw on unhandled rejections', async t => {
  const opts = options(io);
  // ISSUE: how to test that they are not entirely unobservable?
  // It's important that we can observe them using xsbug.
  // We can confirm this by running xsbug while running this test.
  for await (const debug of [false, true]) {
    const vat = xsnap({ ...opts, debug });
    t.teardown(() => vat.terminate());
    await t.notThrowsAsync(vat.evaluate(`Promise.reject(1)`));
  }
});

test('idle includes setImmediate too', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    const send = it => issueCommand(ArrayBuffer.fromString(it));
    setImmediate(() => send("end of crank"));
    Promise.resolve("turn 2").then(send);
    send("turn 1");
  `);
  await vat.close();
  t.deepEqual(['turn 1', 'turn 2', 'end of crank'], opts.messages);
});

test('print - start compartment only', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    const send = it => issueCommand(ArrayBuffer.fromString(it));
    print('print:', 123);
    try {
      (new Compartment()).evalate('print("456")');
    } catch (_err) {
      send('no print in Compartment');
    }
  `);
  await vat.close();
  t.deepEqual(['no print in Compartment'], opts.messages);
});

test('gc - start compartment only', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    gc();
    const send = it => issueCommand(ArrayBuffer.fromString(it));
    gc();
    try {
      (new Compartment()).evalate('gc()');
    } catch (_err) {
      send('no gc in Compartment');
    }
  `);
  await vat.close();
  t.deepEqual(['no gc in Compartment'], opts.messages);
});

test('run script until idle', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.execute(ld.resolve('fixture-xsnap-script.js'));
  await vat.close();
  t.deepEqual(['Hello, World!'], opts.messages);
});

test('issueCommand is synchronous inside, async outside', async t => {
  const messages = [];
  async function handleCommand(request) {
    const number = +decode(request);
    await Promise.resolve(null);
    messages.push(number);
    await Promise.resolve(null);
    return encode(`${number + 1}`);
  }
  const vat = xsnap({ ...options(io), handleCommand });
  await vat.evaluate(`
    const response = issueCommand(ArrayBuffer.fromString('0'));
    const number = +String.fromArrayBuffer(response);
    issueCommand(ArrayBuffer.fromString(String(number + 1)));
  `);
  await vat.close();
  t.deepEqual([0, 2], messages);
});

test('deliver a message', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(+decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...options(io), handleCommand });
  await vat.evaluate(`
    function handleCommand(message) {
      const number = +String.fromArrayBuffer(message);
      issueCommand(ArrayBuffer.fromString(String(number + 1)));
    };
  `);
  await vat.issueStringCommand('0');
  await vat.issueStringCommand('1');
  await vat.issueStringCommand('2');
  await vat.close();
  t.deepEqual([1, 2, 3], messages);
});

test('receive a response', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(+decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...options(io), handleCommand });
  await vat.evaluate(`
    function handleCommand(message) {
      const number = +String.fromArrayBuffer(message);
      return ArrayBuffer.fromString(String(number + 1));
    };
  `);
  t.is('1', (await vat.issueStringCommand('0')).reply);
  t.is('2', (await vat.issueStringCommand('1')).reply);
  t.is('3', (await vat.issueStringCommand('2')).reply);
  await vat.close();
});

function* count(end, start = 0, stride = 1) {
  for (; start < end; start += stride) {
    yield start;
  }
}

test('serialize concurrent messages', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(+decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...options(io), handleCommand });
  await vat.evaluate(`
    globalThis.handleCommand = message => {
      const number = +String.fromArrayBuffer(message);
      issueCommand(ArrayBuffer.fromString(String(number + 1)));
    };
  `);
  await Promise.all([...count(100)].map(n => vat.issueStringCommand(`${n}`)));
  await vat.close();
  t.deepEqual([...count(101, 1)], messages);
});

test('write and read snapshot', async t => {
  const work = tmp.fileSync({ postfix: '.xss' });
  t.teardown(() => work.removeCallback());

  const messages = [];
  async function handleCommand(message) {
    messages.push(decode(message));
    return new Uint8Array();
  }

  const snapshot = work.name;
  t.log({ snapshot });

  const vat0 = xsnap({ ...options(io), handleCommand });
  await vat0.evaluate(`
    globalThis.hello = "Hello, World!";
  `);
  await vat0.snapshot(snapshot);
  await vat0.close();

  const vat1 = xsnap({ ...options(io), handleCommand, snapshot });
  await vat1.evaluate(`
    issueCommand(ArrayBuffer.fromString(hello));
  `);
  await vat1.close();

  t.deepEqual(['Hello, World!'], messages);
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

test('fail to send command to already-closed xsnap worker', async t => {
  const vat = xsnap({ ...options(io) });
  await vat.close();
  await vat.evaluate(``).catch(err => {
    t.is(err.message, 'xsnap test worker exited');
  });
});

test('fail to send command to already-terminated xsnap worker', async t => {
  const vat = xsnap({ ...options(io) });
  await vat.terminate();
  await vat.evaluate(``).catch(err => {
    t.is(err.message, 'xsnap test worker exited due to signal SIGTERM');
  });
});

test('fail to send command to terminated xsnap worker', async t => {
  const vat = xsnap({ ...options(io), meteringLimit: 0 });
  const hang = t.throwsAsync(vat.evaluate(`for (;;) {}`), {
    instanceOf: Error,
    message: /^(Cannot write messages to xsnap test worker: write EPIPE|xsnap test worker exited due to signal SIGTERM)$/,
  });

  await vat.terminate();
  await hang;
});

test('abnormal termination', async t => {
  const vat = xsnap({ ...options(io), meteringLimit: 0 });
  const hang = t.throwsAsync(vat.evaluate(`for (;;) {}`), {
    instanceOf: Error,
    message: 'xsnap test worker exited due to signal SIGTERM',
  });

  // Allow the evaluate command to flush.
  await delay(10);
  await vat.terminate();
  await hang;
});

test('normal close of pathological script', async t => {
  const vat = xsnap({ ...options(io), meteringLimit: 0 });
  const hang = vat.evaluate(`for (;;) {}`).then(
    () => t.fail('command should not complete'),
    err => {
      t.is(err.message, 'xsnap test worker exited due to signal SIGTERM');
    },
  );
  // Allow the evaluate command to flush.
  await delay(10);
  // Close must timeout and the evaluation command
  // must hang.
  await Promise.race([vat.close().then(() => t.fail()), hang, delay(10)]);
  await vat.terminate();
  await hang;
});
