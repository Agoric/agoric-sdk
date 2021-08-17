// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@agoric/marshal';

import { setupCreateZCFVat } from '../../../src/zoeService/createZCFVat.js';

test('setupCreateZCFVat', async t => {
  // This is difficult to unit test, since the real functionality
  // creates a new vat

  const fakeVatAdminSvc = Far('fakeVatAdminSvc', {
    createMeter: () => {},
    createUnlimitedMeter: () => {},
    createVatByName: _name => {
      return harden({ adminNode: undefined, root: undefined });
    },
    createVat: _bundle => {
      return harden({ adminNode: undefined, root: undefined });
    },
  });

  // @ts-ignore fakeVatAdminSvc is mocked
  t.deepEqual(await setupCreateZCFVat(fakeVatAdminSvc, undefined)(), {
    meter: undefined,
    adminNode: undefined,
    root: undefined,
  });
  // @ts-ignore fakeVatAdminSvc is mocked
  t.deepEqual(await setupCreateZCFVat(fakeVatAdminSvc, 'myVat')(), {
    meter: undefined,
    adminNode: undefined,
    root: undefined,
  });
});
