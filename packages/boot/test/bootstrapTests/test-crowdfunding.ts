/** @file Bootstrap test integration crowdfunding with smart-wallet */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { makeAgoricNamesRemotesFromFakeStorage } from '@agoric/vats/tools/board-utils.js';
import { withAmountUtils } from '@agoric/zoe/src/contractSupport/testing.js';
import type { TestFn } from 'ava';
import { makeSwingsetTestKit } from './supports.ts';
import { makeWalletFactoryDriver } from './drivers.ts';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(
    t.log,
    'bundles/crowdfunding',
    {
      configSpecifier: '@agoric/vm-config/decentral-crowdfunding-config.json',
    },
  );

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');
  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  return { ...swingsetTestKit, agoricNamesRemotes, walletFactoryDriver };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after.always(t => {
  return t.context.shutdown && t.context.shutdown();
});

test('instantiated', async t => {
  const { agoricNamesRemotes } = t.context;
  t.truthy(agoricNamesRemotes.instance.crowdfunding);
});

test('register and use a fund', async t => {
  const { agoricNamesRemotes } = t.context;
  const ist = withAmountUtils(
    // @ts-expect-error close enough
    { brand: agoricNamesRemotes.brand.IST },
  );
  const { EV } = t.context.runUtils;
  const crowdfundingKit: StartedInstanceKit<
    (typeof import('@agoric/crowdfunding/src/crowdfunding.contract.js'))['start']
  > = await EV.vat('bootstrap').consumeItem('crowdfundingKit');
  const zoe: ZoeService = await EV.vat('bootstrap').consumeItem('zoe');
  const { walletFactoryDriver } = t.context;

  const providerWallet =
    await walletFactoryDriver.provideSmartWallet('agoric1provider');
  t.true(providerWallet.isNew);
  const funder1Wallet =
    await walletFactoryDriver.provideSmartWallet('agoric1funder1');
  t.true(funder1Wallet.isNew);

  // provider starts a fund
  {
    const inv = await EV(crowdfundingKit.publicFacet).makeProvisionInvitation();
    const seat = await EV(zoe).offer(
      inv,
      // TODO test with an actual want, with a remote brand that has getKref().
      // Alternately, test through smartWalletDriver with an agoricNames brand.
      { give: {}, want: {} },
      {},
    );
    const result = await EV(seat).getOfferResult();
    t.deepEqual(result, {
      poolKey: '1',
    });
  }

  // FIXME how to get IST into the wallet?
  // funder pays it off
  // await funder1Wallet.executeOfferMaker(Offers.crowdfunding.Fund, {
  //   offerId: 'open1',
  //   compensationBrandKey: 'IST',
  //   contribution: 1.0,
  // });
});
