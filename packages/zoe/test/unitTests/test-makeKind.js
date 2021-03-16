// @ts-check
/* global __dirname makeKind makeWeakStore */

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoe } from '../../src/zoeService/zoe';
import fakeVatAdmin from '../../src/contractFacet/fakeVatAdmin';

const root = `${__dirname}/../minimalMakeKindContract`;

test('makeKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const zoe = makeZoe(fakeVatAdmin);
  const installation = await E(zoe).install(bundle);
  t.notThrows(() => makeKind());
  t.notThrows(() => makeWeakStore());
  await t.notThrowsAsync(() => zoe.startInstance(installation));
});
