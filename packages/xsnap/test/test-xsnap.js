/* global setTimeout, WeakRef, setImmediate, process */
// @ts-check

import '@endo/init';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import * as proc from 'child_process';
import * as os from 'os';
import fs, { unlinkSync } from 'fs';
// eslint-disable-next-line import/no-extraneous-dependencies
import tmp from 'tmp';

import { xsnap } from '../src/xsnap.js';
import { recordXSnap } from '../src/replay.js';
import { ExitCode, ErrorCode } from '../api.js';

import { options, decode, encode, loader } from './message-tools.js';

const io = { spawn: proc.spawn, os: os.type() }; // WARNING: ambient
const ld = loader(import.meta.url);

test('evaluate and issueCommand', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(
    `issueCommand(new TextEncoder().encode("Hello, World!").buffer);`,
  );
  await vat.close();
  t.deepEqual(['Hello, World!'], opts.messages);
});

test('evaluate until idle', async t => {
  const opts = options(io);
  const vat = xsnap(opts);
  await vat.evaluate(`
    (async () => {
      issueCommand(new TextEncoder().encode("Hello, World!").buffer);
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
      report.result = new TextEncoder().encode(v).buffer;
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
    const send = it => issueCommand(new TextEncoder().encode(it).buffer);
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
    const send = it => issueCommand(new TextEncoder().encode(it).buffer);
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
    const send = it => issueCommand(new TextEncoder().encode(it).buffer);
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
    const response = issueCommand(new TextEncoder().encode('0').buffer);
    const number = +new TextDecoder().decode(response);
    issueCommand(new TextEncoder().encode(String(number + 1)).buffer);
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
      const number = +new TextDecoder().decode(message);
      issueCommand(new TextEncoder().encode(String(number + 1)).buffer);
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
      const number = +new TextDecoder().decode(message);
      return new TextEncoder().encode(String(number + 1)).buffer;
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
      const number = +new TextDecoder().decode(message);
      issueCommand(new TextEncoder().encode(String(number + 1)).buffer);
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
    issueCommand(new TextEncoder().encode(hello).buffer);
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
    message: /^(write EPIPE|xsnap test worker exited due to signal SIGTERM)$/,
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

async function runToGC() {
  const trashCan = [{}];
  const wr = new WeakRef(trashCan[0]);
  // @ts-expect-error
  trashCan[0] = undefined;

  let qty;
  for (qty = 0; wr.deref(); qty += 1) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise(setImmediate);
    trashCan[1] = Array(10_000).map(() => ({}));
  }
  return qty;
}

function pickXSnap(env = process.env) {
  let doXSnap = xsnap;
  const { XSNAP_TEST_RECORD } = env;
  if (XSNAP_TEST_RECORD) {
    console.log('SwingSet xs-worker tracing:', { XSNAP_TEST_RECORD });
    let serial = 0;
    doXSnap = opts => {
      const workerTrace = `${XSNAP_TEST_RECORD}/${serial}/`;
      serial += 1;
      fs.mkdirSync(workerTrace, { recursive: true });
      return recordXSnap(opts, workerTrace, {
        writeFileSync: fs.writeFileSync,
      });
    };
  }
  return doXSnap;
}

test('GC after snapshot vs restore', async t => {
  const xsnapr = pickXSnap();

  const opts = { ...options(io), name: 'original', meteringLimit: 0 };
  const worker = xsnapr(opts);
  t.teardown(worker.terminate);

  await worker.evaluate(`
  globalThis.send = it => issueCommand(new TextEncoder().encode(JSON.stringify(it)).buffer);
  globalThis.runToGC = (${runToGC});
  runToGC();
  // bloat the heap
  send(Array.from(Array(2_000_000).keys()).length)
  `);

  const nextGC = async (w, o) => {
    await w.evaluate(`runToGC().then(send)`);
    const workToGC = JSON.parse(o.messages.pop());
    t.log({ name: w.name, workToGC });
    return workToGC;
  };

  const beforeClone = await nextGC(worker, opts);

  const snapshot = './bloated.xss';
  await worker.snapshot(snapshot);
  t.teardown(() => unlinkSync(snapshot));

  const optClone = { ...options(io), name: 'clone', snapshot };
  const clone = xsnapr(optClone);
  t.log('cloned', { snapshot });
  t.teardown(clone.terminate);

  let workerGC = beforeClone;
  let cloneGC = workerGC;
  let iters = 0;

  while (workerGC === cloneGC && iters < 3) {
    // eslint-disable-next-line no-await-in-loop
    workerGC = await nextGC(worker, opts);
    // eslint-disable-next-line no-await-in-loop
    cloneGC = await nextGC(clone, optClone);
    iters += 1;
  }
  t.log({ beforeClone, workerGC, cloneGC, iters });
  t.is(workerGC, cloneGC);
});
