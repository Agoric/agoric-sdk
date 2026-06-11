import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const {
  decodeTypeDocData,
  encodeTypeDocData,
  updateUrls,
} = require('../../update-typedoc-functions-path.cjs');

void test('TypeDoc deflate data stays deflate encoded', async () => {
  const data = [{ text: 'functions/foo.html', path: 'functions/foo.html' }];

  const encoded = await encodeTypeDocData(data, 'deflate-base64');
  const decoded = await decodeTypeDocData(encoded);

  assert.equal(encoded.startsWith('data:'), false);
  assert.deepEqual(decoded, { data, format: 'deflate-base64' });
});

void test('legacy gzip data URI stays gzip data URI encoded', async () => {
  const data = [{ text: 'functions/foo.html', path: 'functions/foo.html' }];

  const encoded = await encodeTypeDocData(data, 'gzip-data-uri');
  const decoded = await decodeTypeDocData(encoded);

  assert.match(encoded, /^data:application\/octet-stream;base64,/);
  assert.deepEqual(decoded, { data, format: 'gzip-data-uri' });
});

void test('updateUrls rewrites nested TypeDoc paths', () => {
  const data = {
    children: [{ path: 'functions/foo.html' }, { path: 'modules/bar.html' }],
  };

  assert.deepEqual(updateUrls(data, 'functions', 'funcs'), {
    children: [{ path: 'funcs/foo.html' }, { path: 'modules/bar.html' }],
  });
});
