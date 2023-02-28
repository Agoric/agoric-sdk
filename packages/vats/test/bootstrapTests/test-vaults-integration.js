// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { E } from '@endo/captp';
import {
  makeAdjustOffer,
  makeCloseOffer,
  makeOpenOffer,
} from '@agoric/inter-protocol/src/clientSupport.js';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

// presently all these tests use one collateral manager
const collateralBrandKey = 'IbcATOM';

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t);

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  // Wait for IbcATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  const walletDriver = await makeWalletFactoryDriver(runUtils, storage);
  console.timeLog('DefaultTestContext', 'walletDriver');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(
    swingsetTestKit.storage,
  );
  agoricNamesRemotes.brand.IbcATOM || Fail`IbcATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  console.timeEnd('DefaultTestContext');

  return { ...swingsetTestKit, agoricNamesRemotes, walletDriver };
};

test.before(async t => {
  t.context = await makeDefaultTestContext(t);
});
test.after(async t => {
  // not strictly necessary but conveys that we keep the controller around for the whole test file
  await E(t.context.controller).shutdown();
});

test('metrics path', async t => {
  const { EV } = t.context.runUtils;
  // example of awaitVatObject
  const vaultFactoryKit = await EV.vat('bootstrap').consumeItem(
    'vaultFactoryKit',
  );
  const vfTopics = await EV(vaultFactoryKit.publicFacet).getPublicTopics();
  const vfMetricsPath = await EV.get(vfTopics.metrics).storagePath;
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');
});

test('open vault', async t => {
  console.time('open vault');
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);
  console.timeLog('open vault', 'made walletDriver');

  const wd = await factoryDriver.provideSmartWallet('agoric1open');

  const { agoricNamesRemotes } = t.context;

  await wd.executeOffer(
    makeOpenOffer(agoricNamesRemotes.brand, {
      offerId: 'open-vault',
      collateralBrandKey,
      wantMinted: 5.0,
      giveCollateral: 9.0,
    }),
  );
  console.timeLog('open vault', 'executed offer');

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', numWantsSatisfied: 1 },
  });
  console.timeEnd('open vault');
});

test('adjust balances', async t => {
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);

  const wd = await factoryDriver.provideSmartWallet('agoric1adjust');

  const { agoricNamesRemotes } = t.context;

  await wd.executeOffer(
    makeOpenOffer(agoricNamesRemotes.brand, {
      offerId: 'adjust-open',
      collateralBrandKey,
      wantMinted: 5.0,
      giveCollateral: 9.0,
    }),
  );
  console.log('adjust-open status', wd.getLatestUpdateRecord());
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'adjust-open', numWantsSatisfied: 1 },
  });

  t.log('adjust');
  await wd.executeOffer(
    makeAdjustOffer(
      agoricNamesRemotes.brand,
      {
        offerId: 'adjust',
        collateralBrandKey,
        giveMinted: 0.0005,
      },
      'adjust-open',
    ),
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'adjust',
      numWantsSatisfied: 1,
    },
  });
});

test('close vault', async t => {
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);

  const wd = await factoryDriver.provideSmartWallet('agoric1toclose');

  const { agoricNamesRemotes } = t.context;
  await wd.executeOffer(
    makeOpenOffer(agoricNamesRemotes.brand, {
      offerId: 'open-vault',
      collateralBrandKey,
      wantMinted: 5.0,
      giveCollateral: 9.0,
    }),
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', numWantsSatisfied: 1 },
  });

  t.log('try giving more than is available in the purse/vbank');
  await wd.executeOffer(
    makeCloseOffer(
      agoricNamesRemotes.brand,
      {
        offerId: 'close-extreme',
        collateralBrandKey,
        giveMinted: 99999999.999999,
      },
      'open-vault',
    ),
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-extreme',
      numWantsSatisfied: undefined,
      error:
        'Error: Withdrawal of {"brand":"[Alleged: IST brand]","value":"[99999999999999n]"} failed because the purse only contained {"brand":"[Alleged: IST brand]","value":"[14999500n]"}',
    },
  });

  await wd.executeOffer(
    makeCloseOffer(
      agoricNamesRemotes.brand,
      {
        offerId: 'close-insufficient',
        collateralBrandKey,
        giveMinted: 0.000001,
      },
      'open-vault',
    ),
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-insufficient',
      // XXX there were no wants. Zoe treats as satisfied
      numWantsSatisfied: 1,
      error:
        'Error: Offer {"brand":"[Alleged: IST brand]","value":"[1n]"} is not sufficient to pay off debt {"brand":"[Alleged: IST brand]","value":"[5025000n]"}',
    },
  });

  t.log('close correctly');
  await wd.executeOffer(
    makeCloseOffer(
      agoricNamesRemotes.brand,
      {
        offerId: 'close-well',
        collateralBrandKey,
        giveMinted: 5.0,
      },
      'open-vault',
    ),
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-well',
      numWantsSatisfied: 1,
    },
  });
});

test('open vault with insufficient funds gives helpful error', async t => {
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);

  const wd = await factoryDriver.provideSmartWallet('agoric1insufficient');

  const { agoricNamesRemotes } = t.context;
  const giveCollateral = 9.0;
  await wd.executeOffer(
    makeOpenOffer(agoricNamesRemotes.brand, {
      offerId: 'open-vault',
      collateralBrandKey,
      giveCollateral,
      wantMinted: giveCollateral * 100,
    }),
  );

  // TODO verify funds are returned
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'open-vault',
      numWantsSatisfied: 0,
      error:
        'Error: Proposed debt {"brand":"[Alleged: IST brand]","value":"[904500000n]"} exceeds max {"brand":"[Alleged: IST brand]","value":"[63462857n]"} for {"brand":"[Alleged: IbcATOM brand]","value":"[9000000n]"} collateral',
    },
  });
});
