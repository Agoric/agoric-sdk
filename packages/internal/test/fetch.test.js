import test from 'ava';

import { fetchOk, makeFetchError } from '../src/fetch.js';

test('fetchOk returns successful responses', async t => {
  const response = /** @type {Response} */ ({
    ok: true,
    status: 200,
    statusText: 'OK',
    url: 'https://example.invalid/ok',
  });
  const fetchImpl = /** @type {typeof fetch} */ (async () => response);

  t.is(
    await fetchOk(
      fetchImpl,
      'https://example.invalid/ok',
      undefined,
      'Network config',
    ),
    response,
  );
});

test('makeFetchError includes status and URL details', t => {
  const response = /** @type {Response} */ ({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    url: 'https://example.invalid/missing.json',
  });

  t.is(
    makeFetchError(response, 'Plan').message,
    'Plan failed (404 Not Found) at https://example.invalid/missing.json',
  );
});

test('fetchOk rejects non-ok responses before body parsing', async t => {
  const response = /** @type {Response} */ ({
    ok: false,
    status: 500,
    statusText: 'Server Error',
    url: 'https://example.invalid/fail',
  });

  const fetchImpl = /** @type {typeof fetch} */ (async () => response);

  await t.throwsAsync(
    () => fetchOk(fetchImpl, 'https://example.invalid/fail', undefined, 'RPC'),
    {
      message: 'RPC failed (500 Server Error) at https://example.invalid/fail',
    },
  );
});
