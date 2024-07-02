import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { heapVowTools } from '@agoric/vow/vat.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { E } from '@endo/eventual-send';
import { makeZoeForTest } from '../../../tools/setup-zoe.js';

/**
 * @import {start as startValueVow} from '../../../src/contracts/valueVow.contract.js';
 * @import {Installation} from '../../../src/zoeService/utils.js';
 */

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractRoot = `${dirname}/../../../src/contracts/valueVow.contract.js`;

/** @type {import('ava').TestFn<{ installation: Installation<typeof startValueVow>, zoe: ReturnType<typeof makeZoeForTest> }>} */
const test = anyTest;

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles');
  const zoe = makeZoeForTest();
  const installation = await E(zoe).install(
    await bundleCache.load(contractRoot),
  );

  t.context = {
    installation,
    zoe,
  };
});

test('resolves', async t => {
  const { installation, zoe } = t.context;
  const { publicFacet } = await E(zoe).startInstance(installation);

  const vow = publicFacet.getValue();
  publicFacet.setValue('some value');
  t.is(await heapVowTools.asPromise(vow), 'some value');
});

test('invitations', async t => {
  const { installation, zoe } = t.context;
  const { publicFacet } = await E(zoe).startInstance(installation);
  const vow = await (
    await E(zoe).offer(publicFacet.makeGetterInvitation())
  ).getOfferResult();

  await E(zoe).offer(
    publicFacet.makeSetterInvitation(),
    {},
    {},
    { value: 'hello' },
  );

  t.is(await heapVowTools.asPromise(vow), 'hello');
});
