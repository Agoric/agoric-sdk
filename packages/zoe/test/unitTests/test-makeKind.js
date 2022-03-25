// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test, VatData } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@endo/eventual-send';
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/../minimalMakeKindContract.js`;

test('defineKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  vatAdminState.installBundle('b1-minimal', bundle);
  const installation = await E(zoe).installBundleID('b1-minimal');
  t.notThrows(() => VatData.defineKind());
  t.notThrows(() => VatData.makeKindHandle());
  const kh = VatData.makeKindHandle();
  t.notThrows(() => VatData.defineDurableKind(kh));
  t.notThrows(() => VatData.makeScalarBigMapStore());
  t.notThrows(() => VatData.makeScalarBigWeakMapStore());
  t.notThrows(() => VatData.makeScalarBigSetStore());
  t.notThrows(() => VatData.makeScalarBigWeakSetStore());
  await t.notThrowsAsync(() => E(zoe).startInstance(installation));
});
