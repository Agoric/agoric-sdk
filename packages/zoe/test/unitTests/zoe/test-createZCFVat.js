// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@endo/marshal';

import { setupCreateZCFVat } from '../../../src/zoeService/createZCFVat.js';

test('setupCreateZCFVat', async t => {
  // This is difficult to unit test, since the real functionality
  // creates a new vat

  const zcfBundleCap = harden({ name: 'zcf' });
  const fakeVatAdminSvc = Far('fakeVatAdminSvc', {
    waitForBundleCap: _id => zcfBundleCap,
    getBundleCap: _id => zcfBundleCap,
    getNamedBundleCap: name => {
      assert.equal(name, 'zcf');
      return zcfBundleCap;
    },
    createVat: bundleCap => {
      assert.equal(bundleCap, zcfBundleCap);
      return harden({ adminNode: undefined, root: undefined });
    },
  });

  t.deepEqual(
    await setupCreateZCFVat(
      // @ts-expect-error fakeVatAdminSvc is mocked
      fakeVatAdminSvc,
      zcfBundleCap,
      () => undefined, // getInvitationIssuer
      () => undefined, // getZoeService
    )(undefined),
    {
      adminNode: undefined,
      root: undefined,
    },
  );
});
