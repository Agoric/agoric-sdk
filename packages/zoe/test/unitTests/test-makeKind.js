// @ts-check
/* global __dirname makeKind makeWeakStore */
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import { makeZoe } from '../../src/zoeService/zoe';
import fakeVatAdmin from '../../tools/fakeVatAdmin';
import { useChargeAccount } from '../../src/useChargeAccount';

const root = `${__dirname}/../minimalMakeKindContract`;

test('makeKind non-swingset', async t => {
  const bundle = await bundleSource(root);
  const { zoeService } = makeZoe(fakeVatAdmin);
  const zoe = useChargeAccount(zoeService);
  const installation = await E(zoe).install(bundle);
  t.notThrows(() => makeKind());
  t.notThrows(() => makeWeakStore());
  await t.notThrowsAsync(() => E(zoe).startInstance(installation));
});
