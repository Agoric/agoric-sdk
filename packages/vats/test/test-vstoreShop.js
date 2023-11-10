// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import path from 'path';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import { makeIssuerKit } from '@agoric/ertp';
import { withAmountUtils } from '@agoric/inter-protocol/test/supports.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const pathname = new URL(import.meta.url).pathname;
const dirname = path.dirname(pathname);

const assets = {
  vstoreShop: `${dirname}/../src/vstoreShop.js`,
};

const makeTestContext = async () => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');

  const { zoe } = await setUpZoeForTest();

  /** @type {Installation<import('../src/vstoreShop').start>} */
  const installation = await E(zoe).install(
    await bundleCache.load(assets.vstoreShop, 'vstoreShop'),
  );

  return { zoe, installation };
};

test.before(async t => (t.context = await makeTestContext()));

test('buy and write to storage', async t => {
  const { zoe, installation } = t.context;

  const money = withAmountUtils(makeIssuerKit('Money'));

  const basePrice = money.units(3);

  const { rootNode, data } = makeFakeStorageKit('X');
  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { Payment: money.issuer },
    { basePrice },
    { storageNode: rootNode },
  );

  /** @param {Purse} purse */
  const alice = async purse => {
    const toBuy = await E(publicFacet).makeBuyStorageInvitation();
    const Payment = await E(purse).withdraw(basePrice);
    const seat = await E(zoe).offer(
      toBuy,
      { give: { Payment: basePrice } },
      { Payment },
      { slug: 'alice-info' },
    );
    /** @type {ERef<StorageNode>} */
    const node = await E(seat).getOfferResult();
    // TODO: get payouts; return extras to purse

    await E(node).setValue('Hello, world!');
  };

  const ap = money.issuer.makeEmptyPurse();
  ap.deposit(money.mint.mintPayment(basePrice));
  await alice(ap);

  t.deepEqual(
    [...data.entries()],
    [['X.alice-info', '{"blockHeight":"0","values":["Hello, world!"]}']],
  );
});
