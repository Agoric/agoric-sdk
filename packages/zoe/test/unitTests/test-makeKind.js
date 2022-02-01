// @ts-check
/* global makeKind makeVirtualScalarWeakMap */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import fakeVatAdmin from '../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/../minimalMakeKindContract.js`;

test('makeKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const { zoeService: zoe } = makeZoeKit(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);
  t.notThrows(() => makeKind());
  t.notThrows(() => makeVirtualScalarWeakMap());
  await t.notThrowsAsync(() => E(zoe).startInstance(installation));
});
