// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';

import { parseBundleSpec } from '../src/controller/bundle-spec.js';

test('parseBundleSpec parses valid JSON', async t => {
  const bundle = parseBundleSpec(
    _path =>
      '{"moduleFormat":"endoZipBase64","endoZipBase64":"abc","endoZipBase64Sha512":"sha"}',
    '/tmp/bundle.json',
  );
  t.is(bundle.moduleFormat, 'endoZipBase64');
  t.is(bundle.endoZipBase64Sha512, 'sha');
});

test('parseBundleSpec throws on invalid JSON', async t => {
  const err = t.throws(() =>
    parseBundleSpec(_path => '{not-json}', '/tmp/bundle.json'),
  );
  t.truthy(err);
});
