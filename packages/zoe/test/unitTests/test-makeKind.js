// @ts-check
/* global VatData */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import { fakeVatAdmin, zcfBundlecap } from '../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/../minimalMakeKindContract.js`;

test('makeKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin, zcfBundlecap);
  const installation = await E(zoe).install(bundle);
  t.notThrows(() => VatData.makeKind());
  t.notThrows(() => VatData.makeDurableKind());
  t.notThrows(() => VatData.makeScalarBigMapStore());
  t.notThrows(() => VatData.makeScalarBigWeakMapStore());
  t.notThrows(() => VatData.makeScalarBigSetStore());
  t.notThrows(() => VatData.makeScalarBigWeakSetStore());
  await t.notThrowsAsync(() => E(zoe).startInstance(installation));
});
