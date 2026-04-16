/* eslint-env node */
// @ts-check
import test from 'ava';
import { encodeBase64 } from '@endo/base64';
import { QueryDataResponse } from '@agoric/cosmic-proto/agoric/vstorage/query.js';
import { makeVStorage } from '../src/vstorage.js';

const testConfig = {
  chainName: 'test-chain',
  rpcAddrs: ['http://localhost:26657'],
};

/** @type {any} */
const fetch = () => Promise.resolve({});

// === Fallback test helpers ===

/** @param {string} value */
const encodeDataValue = (value = '') =>
  encodeBase64(QueryDataResponse.toProto({ value }));

/**
 * @param {object} [opts]
 * @param {number} [opts.code]
 * @param {number} [opts.height]
 * @param {string} [opts.value]
 * @param {string} [opts.log]
 * @param {string} [opts.codespace]
 */
const makeAbciResponse = ({
  code = 0,
  height = 100,
  value,
  log = '',
  codespace = '',
} = {}) => ({
  result: {
    response: {
      code,
      height: String(height),
      ...(code === 0
        ? { value: value ?? encodeDataValue(`data-h${height}`) }
        : {}),
      log,
      codespace,
    },
  },
});

/**
 * @param {Record<string, (url: string) => object>} handlers keyed by rpcAddr prefix
 */
const makeMockFetch = handlers => {
  /** @type {string[]} */
  const calls = [];

  /** @type {any} */
  const mockFetch = async (/** @type {string} */ url) => {
    calls.push(url);
    for (const [prefix, handler] of Object.entries(handlers)) {
      if (url.startsWith(prefix)) {
        const result = handler(url);
        return { json: () => Promise.resolve(result) };
      }
    }
    throw Error(`no mock handler for ${url}`);
  };

  return { fetch: mockFetch, calls };
};

/** @param {string} url */
const nodeOf = url => url.match(/^https?:\/\/[^/]+/)?.[0];

const NODE_A = 'http://node-a:26657';
const NODE_B = 'http://node-b:26657';
const NODE_C = 'http://node-c:26657';

/** @param {string[]} addrs */
const makeConfig = (...addrs) => ({ chainName: 'test', rpcAddrs: addrs });

test('readFully can be used without instance binding', async t => {
  const vstorage = makeVStorage({ fetch }, testConfig);
  const { readFully } = vstorage;

  // Mock implementation to avoid actual network calls
  vstorage.readAt = async () => ({ blockHeight: '0', values: ['test'] });

  // This would throw if readFully required 'this' binding
  await t.notThrowsAsync(() => readFully('some/path'));
});

test('storage history should be in chronological order', async t => {
  /**
   * @param {number} maximumHeight
   * @param {number} minimumHeight
   */
  const generateDescendingValues = (maximumHeight, minimumHeight) =>
    [...Array(maximumHeight - minimumHeight + 1)]
      .map((_, i) => [
        String((maximumHeight - i) * 2 - 1),
        String((maximumHeight - i) * 2 - 2),
      ])
      .flat();

  const generateRandomNumber = () => Math.ceil(Math.random() * 10);

  /**
   * @param {number} maximumHeight
   * @param {number} minimumHeight
   */
  const generateResponses = (maximumHeight, minimumHeight) =>
    [...Array(maximumHeight - minimumHeight + 1)].map((_, i) => ({
      blockHeight: String(maximumHeight - i),
      values: [
        String((maximumHeight - i - 1) * 2),
        String((maximumHeight - i - 1) * 2 + 1),
      ],
    }));

  const minimumHeight = generateRandomNumber();
  const storagePathName = 'published.test';

  const maximumHeight = generateRandomNumber() + minimumHeight;

  const responses = generateResponses(maximumHeight, minimumHeight);

  const responseMap = responses.reduce(
    (finalResponse, response) => ({
      ...finalResponse,
      [`${storagePathName}-${response.blockHeight}`]: response,
    }),
    {},
  );

  const vstorageKit = makeVStorage({ fetch }, testConfig);

  /**
   * @param {string} path
   * @param {number} height
   */
  vstorageKit.readAt = async (path, height = maximumHeight) =>
    responseMap[`${path}-${height}`];

  const response = await vstorageKit.readFully(storagePathName, minimumHeight);

  t.deepEqual(response, generateDescendingValues(maximumHeight, minimumHeight));
});

test('fallback - single node succeeds as before', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () => makeAbciResponse({ height: 100 }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A));
  const meta = await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(meta.blockHeight, 100n);
  t.is(meta.result.value, 'data-h100');
  t.is(mock.calls.length, 1);
  t.is(nodeOf(mock.calls[0]), NODE_A);
});

test('fallback - falls back to next node on network error', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () => {
      throw Error('ECONNREFUSED');
    },
    [NODE_B]: () => makeAbciResponse({ height: 200 }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));
  const meta = await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(meta.blockHeight, 200n);
  t.is(meta.result.value, 'data-h200');
  t.is(mock.calls.length, 2);
  t.is(nodeOf(mock.calls[0]), NODE_A);
  t.is(nodeOf(mock.calls[1]), NODE_B);
});

test('fallback - falls back to next node on error code', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () => makeAbciResponse({ code: 1, log: 'internal error' }),
    [NODE_B]: () => makeAbciResponse({ height: 150 }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));
  const meta = await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(meta.blockHeight, 150n);
  t.is(meta.result.value, 'data-h150');
  t.is(mock.calls.length, 2);
});

test('fallback - stale response triggers fallback to fresher node', async t => {
  let heightA = 100;
  const mock = makeMockFetch({
    [NODE_A]: () => makeAbciResponse({ height: heightA }),
    [NODE_B]: () => makeAbciResponse({ height: 200 }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));

  // First call: node A at height 100 sets HWM
  const r1 = await vs.readStorageMeta('published.test', { kind: 'data' });
  t.is(r1.blockHeight, 100n);
  t.is(mock.calls.length, 1);

  // Node A now returns stale height (50 < HWM 100)
  heightA = 50;
  const r2 = await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(r2.blockHeight, 200n);
  t.is(r2.result.value, 'data-h200');
  // Tried A first (stale), then fell to B
  t.is(nodeOf(mock.calls[1]), NODE_A);
  t.is(nodeOf(mock.calls[2]), NODE_B);
});

test('fallback - all nodes stale uses best candidate with highest height', async t => {
  let heightA = 200;
  let heightB = 200;
  const mock = makeMockFetch({
    [NODE_A]: () => makeAbciResponse({ height: heightA }),
    [NODE_B]: () => makeAbciResponse({ height: heightB }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));

  // First call sets HWM to 200
  await vs.readStorageMeta('published.test', { kind: 'data' });

  // Now both return stale heights
  heightA = 80;
  heightB = 90;
  const meta = await vs.readStorageMeta('published.test', { kind: 'data' });

  // Should pick the higher stale candidate
  t.is(meta.blockHeight, 90n);
  t.is(meta.result.value, 'data-h90');
});

test('fallback - throws when all nodes have network errors', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () => {
      throw Error('ECONNREFUSED');
    },
    [NODE_B]: () => {
      throw Error('ETIMEDOUT');
    },
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));

  await t.throwsAsync(
    () => vs.readStorageMeta('published.test', { kind: 'data' }),
    { message: /cannot read data of published.test/ },
  );
});

test('fallback - throws with error code when all nodes return errors', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () =>
      makeAbciResponse({ code: 5, codespace: 'sdk', log: 'not found' }),
    [NODE_B]: () =>
      makeAbciResponse({ code: 5, codespace: 'sdk', log: 'not found' }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A, NODE_B));

  const err = await t.throwsAsync(() =>
    vs.readStorageMeta('published.test', { kind: 'data' }),
  );
  t.truthy(err && err.message.includes('error code 5'));
});

test('fallback - explicit height skips high-water mark check', async t => {
  let heightA = 100;
  const mock = makeMockFetch({
    [NODE_A]: () => makeAbciResponse({ height: heightA }),
  });

  const vs = makeVStorage({ fetch: mock.fetch }, makeConfig(NODE_A));

  // Set HWM to 100
  await vs.readStorageMeta('published.test', { kind: 'data' });

  // Query at explicit height 50 — should NOT be rejected as stale
  heightA = 50;
  const meta = await vs.readStorageMeta('published.test', {
    kind: 'data',
    height: 50,
  });

  t.is(meta.blockHeight, 50n);
  t.is(mock.calls.length, 2);
  // Only node A was called — no fallback triggered
  t.is(nodeOf(mock.calls[0]), NODE_A);
  t.is(nodeOf(mock.calls[1]), NODE_A);
});

test('fallback - retries higher-priority nodes after recheck interval', async t => {
  let currentTime = 1_000_000;
  const now = () => currentTime;

  let nodeAFails = true;
  const mock = makeMockFetch({
    [NODE_A]: () => {
      if (nodeAFails) throw Error('ECONNREFUSED');
      return makeAbciResponse({ height: 300 });
    },
    [NODE_B]: () => makeAbciResponse({ height: 200 }),
  });

  const vs = makeVStorage(
    { fetch: mock.fetch, now },
    makeConfig(NODE_A, NODE_B),
  );

  // 1) Node A fails, falls to B
  const r1 = await vs.readStorageMeta('published.test', { kind: 'data' });
  t.is(r1.blockHeight, 200n);
  t.is(nodeOf(mock.calls[0]), NODE_A);
  t.is(nodeOf(mock.calls[1]), NODE_B);

  // 2) Within 30s — stays on B, does NOT try A
  currentTime += 10_000;
  mock.calls.length = 0;
  const r2 = await vs.readStorageMeta('published.test', { kind: 'data' });
  t.is(r2.blockHeight, 200n);
  t.is(mock.calls.length, 1);
  t.is(nodeOf(mock.calls[0]), NODE_B);

  // 3) After 30s — retries from A (which is now back)
  currentTime += 25_000; // total 35s since switch
  mock.calls.length = 0;
  nodeAFails = false;
  const r3 = await vs.readStorageMeta('published.test', { kind: 'data' });
  t.is(r3.blockHeight, 300n);
  t.is(nodeOf(mock.calls[0]), NODE_A);
});

test('fallback - recovery walks priorities: tries 0, 1, ... until success', async t => {
  let currentTime = 1_000_000;
  const now = () => currentTime;

  const mock = makeMockFetch({
    [NODE_A]: () => {
      throw Error('ECONNREFUSED');
    },
    [NODE_B]: () => {
      throw Error('ECONNREFUSED');
    },
    [NODE_C]: () => makeAbciResponse({ height: 100 }),
  });

  const vs = makeVStorage(
    { fetch: mock.fetch, now },
    makeConfig(NODE_A, NODE_B, NODE_C),
  );

  // Falls through A → B → C
  await vs.readStorageMeta('published.test', { kind: 'data' });
  t.is(mock.calls.length, 3);
  t.is(nodeOf(mock.calls[2]), NODE_C);

  // After 30s: re-check tries A, B (both still down), settles on C
  currentTime += 35_000;
  mock.calls.length = 0;
  await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(mock.calls.length, 3);
  t.is(nodeOf(mock.calls[0]), NODE_A);
  t.is(nodeOf(mock.calls[1]), NODE_B);
  t.is(nodeOf(mock.calls[2]), NODE_C);
});

test('fallback - multi-hop: network error then error code then success', async t => {
  const mock = makeMockFetch({
    [NODE_A]: () => {
      throw Error('ECONNREFUSED');
    },
    [NODE_B]: () => makeAbciResponse({ code: 2, log: 'unavailable' }),
    [NODE_C]: () => makeAbciResponse({ height: 500 }),
  });

  const vs = makeVStorage(
    { fetch: mock.fetch },
    makeConfig(NODE_A, NODE_B, NODE_C),
  );
  const meta = await vs.readStorageMeta('published.test', { kind: 'data' });

  t.is(meta.blockHeight, 500n);
  t.is(meta.result.value, 'data-h500');
  t.is(mock.calls.length, 3);
  t.is(nodeOf(mock.calls[0]), NODE_A);
  t.is(nodeOf(mock.calls[1]), NODE_B);
  t.is(nodeOf(mock.calls[2]), NODE_C);
});
