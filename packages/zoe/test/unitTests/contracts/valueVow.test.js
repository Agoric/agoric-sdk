import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import { heapVowTools } from '@agoric/vow/vat.js';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { E } from '@endo/eventual-send';
import { inspectMapStore } from '@agoric/internal/src/testing-utils.js';
import { makeZoeForTest, setUpZoeForTest } from '../../../tools/setup-zoe.js';

/**
 * @import {start as startValueVow} from '../../../src/contracts/valueVow.contract.js';
 * @import {Installation} from '../../../src/zoeService/utils.js';
 */

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../../src/contracts/valueVow.contract.js`;

/** @type {import('ava').TestFn<{ installation: Installation<typeof startValueVow>, zoe: ReturnType<typeof makeZoeForTest> }>} */
const test = anyTest;

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles');
  const zoe = makeZoeForTest();
  const installation = await E(zoe).install(
    await bundleCache.load(contractFile),
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

test('baggage', async t => {
  /** @type {import('@agoric/swingset-liveslots').Baggage} */
  let contractBaggage;
  const setJig = ({ baggage }) => {
    contractBaggage = baggage;
  };
  const { bundleAndInstall, zoe } = await setUpZoeForTest({
    setJig,
  });

  await E(zoe).startInstance(
    /** @type {Installation<startValueVow>} */
    (await bundleAndInstall(contractFile)),
  );

  // @ts-expect-error setJig may not have been called
  const tree = inspectMapStore(contractBaggage);
  t.snapshot(tree, 'contract baggage after start');
});
