import test from 'ava';
import * as childProcess from 'child_process';
import * as os from 'os';
import { xsnap } from '../src/xsnap';

const importMetaUrl = `file://${__filename}`;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

const xsnapOptions = {
  spawn: childProcess.spawn,
  os: os.type(),
};

test('evaluate and issueCommand', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
  await vat.evaluate(`issueCommand(ArrayBuffer.fromString("Hello, World!"));`);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('evaluate until idle', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
  await vat.evaluate(`
    (async () => {
      issueCommand(ArrayBuffer.fromString("Hello, World!"));
    })();
  `);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('run script until idle', async t => {
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
  await vat.execute(new URL('fixture-xsnap-script.js', importMetaUrl).pathname);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('issueCommand is synchronous inside, async outside', async t => {
  const messages = [];
  async function handleCommand(request) {
    const number = +decoder.decode(request);
    await Promise.resolve(null);
    messages.push(number);
    await Promise.resolve(null);
    return encoder.encode(`${number + 1}`);
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
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
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
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
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
  await vat.evaluate(`
    function handleCommand(message) {
      const number = +String.fromArrayBuffer(message);
      return ArrayBuffer.fromString(String(number + 1));
    };
  `);
  t.is('1', await vat.issueStringCommand('0'));
  t.is('2', await vat.issueStringCommand('1'));
  t.is('3', await vat.issueStringCommand('2'));
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
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ ...xsnapOptions, handleCommand });
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
  const messages = [];
  async function handleCommand(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }

  const snapshot = new URL('fixture-snapshot.xss', importMetaUrl).pathname;

  const vat0 = xsnap({ ...xsnapOptions, handleCommand });
  await vat0.evaluate(`
    globalThis.hello = "Hello, World!";
  `);
  await vat0.snapshot(snapshot);
  await vat0.close();

  const vat1 = xsnap({ ...xsnapOptions, handleCommand, snapshot });
  await vat1.evaluate(`
    issueCommand(ArrayBuffer.fromString(hello));
  `);
  await vat1.close();

  t.deepEqual(['Hello, World!'], messages);
});
