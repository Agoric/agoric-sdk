// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';

import { setupCreateZCFVat } from '../../../src/zoeService/createZCFVat.js';

test('setupCreateZCFVat', async t => {
  // This is difficult to unit test, since the real functionality
  // creates a new vat

  const zcfBundlecap = Far('zcfBundlecap', {});
  const fakeVatAdminSvc = Far('fakeVatAdminSvc', {
    getNamedBundlecap: name => {
      assert.equal(name, 'zcf');
      return zcfBundlecap;
    },
    createVat: bundlecap => {
      assert.equal(bundlecap, zcfBundlecap);
      return harden({ adminNode: undefined, root: undefined });
    },
  });

  // @ts-ignore fakeVatAdminSvc is mocked
  t.deepEqual(await setupCreateZCFVat(fakeVatAdminSvc, { name: 'zcf' })(), {
    // @ts-ignore fakeVatAdminSvc is mocked
    adminNode: undefined,
    root: undefined,
  });
});
