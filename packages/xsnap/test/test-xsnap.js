import test from 'ava';
import { xsnap } from '../src/xsnap';

const importMetaUrl = `file://${__filename}`;

const decoder = new TextDecoder();
const encoder = new TextEncoder();

test('evaluate and sysCall', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`sysCall(ArrayBuffer.fromString("Hello, World!"));`);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('evaluate until idle', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`
    (async () => {
      sysCall(ArrayBuffer.fromString("Hello, World!"));
    })();
  `);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('run script until idle', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.execute(new URL('fixture-xsnap-script.js', importMetaUrl).pathname);
  await vat.close();
  t.deepEqual(['Hello, World!'], messages);
});

test('sysCall is synchronous inside, async outside', async t => {
  const messages = [];
  async function answerSysCall(request) {
    const number = +decoder.decode(request);
    await Promise.resolve(null);
    messages.push(number);
    await Promise.resolve(null);
    return encoder.encode(`${number + 1}`);
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`
    const response = sysCall(ArrayBuffer.fromString('0'));
    const number = +String.fromArrayBuffer(response);
    sysCall(ArrayBuffer.fromString(String(number + 1)));
  `);
  await vat.close();
  t.deepEqual([0, 2], messages);
});

test('deliver a message', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`
    function answerSysCall(message) {
      const number = +String.fromArrayBuffer(message);
      sysCall(ArrayBuffer.fromString(String(number + 1)));
    };
  `);
  await vat.stringSysCall('0');
  await vat.stringSysCall('1');
  await vat.stringSysCall('2');
  await vat.close();
  t.deepEqual([1, 2, 3], messages);
});

test.only('receive a response', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`
    function answerSysCall(message) {
      const number = +String.fromArrayBuffer(message);
      return ArrayBuffer.fromString(String(number + 1));
    };
  `);
  t.is('1', await vat.stringSysCall('0'));
  t.is('2', await vat.stringSysCall('1'));
  t.is('3', await vat.stringSysCall('2'));
  await vat.close();
});

function* count(end, start = 0, stride = 1) {
  for (; start < end; start += stride) {
    yield start;
  }
}

test('serialize concurrent messages', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(+decoder.decode(message));
    return new Uint8Array();
  }
  const vat = xsnap({ answerSysCall });
  await vat.evaluate(`
    globalThis.answerSysCall = message => {
      const number = +String.fromArrayBuffer(message);
      sysCall(ArrayBuffer.fromString(String(number + 1)));
    };
  `);
  await Promise.all([...count(100)].map(n => vat.stringSysCall(`${n}`)));
  await vat.close();
  t.deepEqual([...count(101, 1)], messages);
});

test('write and read snapshot', async t => {
  const messages = [];
  async function answerSysCall(message) {
    messages.push(decoder.decode(message));
    return new Uint8Array();
  }

  const snapshot = new URL('fixture-snapshot.xss', importMetaUrl).pathname;

  const vat0 = xsnap({ answerSysCall });
  await vat0.evaluate(`
    globalThis.hello = "Hello, World!";
  `);
  await vat0.snapshot(snapshot);
  await vat0.close();

  const vat1 = xsnap({ answerSysCall, snapshot });
  await vat1.evaluate(`
    sysCall(ArrayBuffer.fromString(hello));
  `);
  await vat1.close();

  t.deepEqual(['Hello, World!'], messages);
});
