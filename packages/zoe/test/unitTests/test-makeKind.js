// @ts-check
/* global makeKind makeVirtualScalarWeakMap */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeAndApplyFeePurse } from '../../src/applyFeePurse.js';
import { makeZoeKit } from '../../src/zoeService/zoe.js';
import fakeVatAdmin from '../../tools/fakeVatAdmin.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/../minimalMakeKindContract.js`;

test('makeKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const { zoeService } = makeZoeKit(fakeVatAdmin);
  const { zoeService: zoe } = makeAndApplyFeePurse(zoeService);
  const installation = await E(zoe).install(bundle);
  t.notThrows(() => makeKind());
  t.notThrows(() => makeVirtualScalarWeakMap());
  await t.notThrowsAsync(() => zoe.startInstance(installation));
});
