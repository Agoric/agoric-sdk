// @ts-check
/**
 * @file Bootstrap test integration vaults with smart-wallet
 */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Fail } from '@agoric/assert';
import { E } from '@endo/captp';
import { makeAgoricNamesRemotesFromFakeStorage } from '../../tools/board-utils.js';
import { makeSwingsetTestKit, makeWalletFactoryDriver } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<typeof makeDefaultTestContext>>>}
 */
const test = anyTest;

const makeDefaultTestContext = async t => {
  console.time('DefaultTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t);

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { messageVat } = runUtils;

  // Wait for IbcATOM to make it into agoricNames
  await messageVat('bootstrap', 'consumeItem', ['vaultFactoryKit']);
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
  const { messageVat, messageVatObject, awaitVatObject } = t.context.runUtils;
  // example of awaitVatObject
  const vaultFactoryKit = await messageVat('bootstrap', 'consumeItem', [
    'vaultFactoryKit',
  ]);
  const vfTopics = await messageVatObject(
    vaultFactoryKit.publicFacet,
    'getPublicTopics',
  );
  const vfMetricsPath = await awaitVatObject(vfTopics.metrics, ['storagePath']);
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');
});

test('open vault', async t => {
  console.time('open vault');
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);
  console.timeLog('open vault', 'made walletDriver');

  const wd = await factoryDriver.provideSmartWallet('agoric1open');

  const { agoricNamesRemotes } = t.context;
  await wd.executeOffer({
    id: 'open-vault',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [
        ['getCollateralManager', [agoricNamesRemotes.brand.IbcATOM]],
        ['makeVaultInvitation'],
      ],
    },
    proposal: {
      give: {
        Collateral: {
          // @ts-expect-error XXX remote in OfferSpec
          brand: agoricNamesRemotes.brand.IbcATOM,
          value: 9000000n,
        },
      },
      want: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 5000000n },
      },
    },
  });
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
  await wd.executeOffer({
    id: 'adjust-open',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [
        ['getCollateralManager', [agoricNamesRemotes.brand.IbcATOM]],
        ['makeVaultInvitation'],
      ],
    },
    proposal: {
      give: {
        Collateral: {
          // @ts-expect-error XXX remote in OfferSpec
          brand: agoricNamesRemotes.brand.IbcATOM,
          value: 9000000n,
        },
      },
      want: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 5000000n },
      },
    },
  });
  console.log('adjust-open status', wd.getLatestUpdateRecord());
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'adjust-open', numWantsSatisfied: 1 },
  });

  t.log('adjust');
  await wd.executeOffer({
    id: 'adjust',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'adjust-open',
      invitationMakerName: 'AdjustBalances',
    },
    proposal: {
      give: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 500n },
      },
    },
  });
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
  await wd.executeOffer({
    id: 'open-vault',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [
        ['getCollateralManager', [agoricNamesRemotes.brand.IbcATOM]],
        ['makeVaultInvitation'],
      ],
    },
    proposal: {
      give: {
        Collateral: {
          // @ts-expect-error XXX remote in OfferSpec
          brand: agoricNamesRemotes.brand.IbcATOM,
          value: 9000000n,
        },
      },
      want: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 5000000n },
      },
    },
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', numWantsSatisfied: 1 },
  });

  t.log('try giving more than is available in the purse/vbank');
  await wd.executeOffer({
    id: 'close-extreme',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'open-vault',
      invitationMakerName: 'CloseVault',
    },
    proposal: {
      give: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 99999999999999n },
      },
    },
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-extreme',
      numWantsSatisfied: undefined,
      error:
        'Error: Withdrawal of {"brand":"[Alleged: IST brand]","value":"[99999999999999n]"} failed because the purse only contained {"brand":"[Alleged: IST brand]","value":"[14999500n]"}',
    },
  });

  await wd.executeOffer({
    id: 'close-insufficient',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'open-vault',
      invitationMakerName: 'CloseVault',
    },
    proposal: {
      give: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 1n },
      },
    },
  });
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
  await wd.executeOffer({
    id: 'close-vault',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'open-vault',
      invitationMakerName: 'CloseVault',
    },
    proposal: {
      give: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: 5000000n },
      },
    },
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-vault',
      numWantsSatisfied: 1,
    },
  });
});

test('open vault with insufficient funds gives helpful error', async t => {
  const { runUtils, storage } = t.context;

  const factoryDriver = await makeWalletFactoryDriver(runUtils, storage);

  const wd = await factoryDriver.provideSmartWallet('agoric1insufficient');

  const { agoricNamesRemotes } = t.context;
  const collat = 9000000n;
  await wd.executeOffer({
    id: 'open-vault',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['VaultFactory'],
      callPipe: [
        ['getCollateralManager', [agoricNamesRemotes.brand.IbcATOM]],
        ['makeVaultInvitation'],
      ],
    },
    proposal: {
      give: {
        Collateral: {
          // @ts-expect-error XXX remote in OfferSpec
          brand: agoricNamesRemotes.brand.IbcATOM,
          value: collat,
        },
      },
      want: {
        // @ts-expect-error XXX remote in OfferSpec
        Minted: { brand: agoricNamesRemotes.brand.IST, value: collat * 100n },
      },
    },
  });

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
