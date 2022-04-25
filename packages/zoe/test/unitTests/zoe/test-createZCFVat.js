// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';

import { setupCreateZCFVat } from '../../../src/zoeService/createZCFVat.js';

test('setupCreateZCFVat', async t => {
  // This is difficult to unit test, since the real functionality
  // creates a new vat

  const zcfBundleCap = Far('zcfBundleCap', {});
  const fakeVatAdminSvc = Far('fakeVatAdminSvc', {
    getNamedBundleCap: name => {
      assert.equal(name, 'zcf');
      return zcfBundleCap;
    },
    createVat: bundleCap => {
      assert.equal(bundleCap, zcfBundleCap);
      return harden({ adminNode: undefined, root: undefined });
    },
  });

  // @ts-expect-error fakeVatAdminSvc is mocked
  t.deepEqual(await setupCreateZCFVat(fakeVatAdminSvc, { name: 'zcf' })(), {
    // @ts-expect-error fakeVatAdminSvc is mocked
    adminNode: undefined,
    root: undefined,
  });
});
