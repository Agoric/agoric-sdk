// @ts-check
import '@endo/init/legacy.js';

import test from 'ava';
import { makeVStorage } from '../src/vstorage.js';

const testConfig = {
  chainName: 'test-chain',
  rpcAddrs: ['http://localhost:26657'],
};

/** @type {any} */
const fetch = () => Promise.resolve({});

test('readFully can be used without instance binding', async t => {
  const vstorage = makeVStorage({ fetch }, testConfig);
  const { readFully } = vstorage;

  // Mock implementation to avoid actual network calls
  vstorage.readAt = async () => ({ blockHeight: '0', values: ['test'] });

  // This would throw if readFully required 'this' binding
  await t.notThrowsAsync(() => readFully('some/path'));
});

test('readStorageMeta surfaces HTTP status on a non-JSON error response (e.g. rate-limiting proxy)', async t => {
  /** @type {any} */
  const fetchWith429 = async () => ({
    ok: false,
    status: 429,
  });

  const vstorage = makeVStorage({ fetch: fetchWith429 }, testConfig);
  const err = await t.throwsAsync(() =>
    vstorage.readStorageMeta('published.test', { kind: 'data' }),
  );
  t.is(/** @type {any} */ (err).status, 429);
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
