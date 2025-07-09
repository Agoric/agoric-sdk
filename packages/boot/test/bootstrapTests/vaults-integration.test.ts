/** @file Bootstrap test integration vaults with smart-wallet */
import type { TestFn } from 'ava';

import { makeWalletFactoryDriver } from '@aglocal/boot/tools/drivers.js';
import { makeMockBridgeKit } from '@agoric/cosmic-swingset/tools/test-bridge-utils.ts';
import { makeCosmicSwingsetTestKit } from '@agoric/cosmic-swingset/tools/test-kit.js';
import { Offers } from '@agoric/inter-protocol/src/clientSupport.js';
import type { ParamChangesOfferArgs } from '@agoric/inter-protocol/src/econCommitteeCharter.js';
import { unmarshalFromVstorage } from '@agoric/internal/src/marshal.js';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import {
  boardSlottingMarshaller,
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
} from '@agoric/vats/tools/board-utils.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Fail } from '@endo/errors';

// presently all these tests use one collateral manager
const collateralBrandKey = 'ATOM';
const { fromCapData } = boardSlottingMarshaller(slotToBoardRemote);

const likePayouts = (collateral: number, minted: number) => ({
  Collateral: { value: BigInt(collateral * 1_000_000) },
  Minted: { value: BigInt(minted * 1_000_000) },
});

const makeDefaultTestContext = async () => {
  console.time('DefaultTestContext');

  const storage = makeFakeStorageKit('bootstrapTests');
  const swingsetTestKit = await makeCosmicSwingsetTestKit({
    configSpecifier: '@agoric/vm-config/decentral-itest-vaults-config.json',
    handleBridgeSend: makeMockBridgeKit({ storageKit: storage }),
  });

  const { EV, queueAndRun } = swingsetTestKit;

  console.timeLog('DefaultTestContext', 'swingsetTestKit');

  const readLatestEntryFromStorage = (path: string) => {
    let data;
    try {
      data = unmarshalFromVstorage(storage.data, path, fromCapData, -1);
    } catch {
      // fall back to regular JSON
      const raw = storage.getValues(path).at(-1);
      assert(raw, `No data found for ${path}`);
      data = JSON.parse(raw);
    }
    return data;
  };

  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  agoricNamesRemotes.brand.ATOM || Fail`ATOM missing from agoricNames`;
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  const walletFactoryDriver = await makeWalletFactoryDriver(
    { EV, queueAndRun },
    storage,
    agoricNamesRemotes,
  );
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');

  return {
    ...swingsetTestKit,
    agoricNamesRemotes,
    readLatestEntryFromStorage,
    walletFactoryDriver,
  };
};

const test = anyTest as TestFn<
  Awaited<ReturnType<typeof makeDefaultTestContext>>
>;

test.before(async t => (t.context = await makeDefaultTestContext()));
test.after.always(t => t.context.shutdown());

test.serial('metrics path', async t => {
  const { EV } = t.context;
  const vaultFactoryKit =
    await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  const vfTopics = await EV(vaultFactoryKit.publicFacet).getPublicTopics();
  const vfMetricsPath = await EV.get(vfTopics.metrics).storagePath;
  t.is(vfMetricsPath, 'published.vaultFactory.metrics');
});

test.serial('open vault', async t => {
  console.time('open vault');
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1open');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open-vault',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });
  console.timeLog('open vault', 'executed offer');

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', numWantsSatisfied: 1 },
  });
  console.timeEnd('open vault');
});

test.serial('adjust balances', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1adjust');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'adjust-open',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });
  console.log('adjust-open status', wd.getLatestUpdateRecord());
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'adjust-open', numWantsSatisfied: 1 },
  });

  console.log('adjust');
  await wd.executeOfferMaker(
    Offers.vaults.AdjustBalances,
    { offerId: 'adjust', collateralBrandKey, giveMinted: 0.0005 },
    'adjust-open',
  );
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'adjust', numWantsSatisfied: 1 },
  });
});

test.serial('close vault', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1toclose');

  const giveCollateral = 9.0;

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open-vault',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral,
  });
  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', result: 'UNPUBLISHED', numWantsSatisfied: 1 },
    error: undefined,
  });
  console.log('try giving more than is available in the purse/vbank');
  await t.throwsAsync(
    wd.executeOfferMaker(
      Offers.vaults.CloseVault,
      {
        offerId: 'close-extreme',
        collateralBrandKey,
        giveMinted: 99_999_999.999_999,
      },
      'open-vault',
    ),
    { message: /^Withdrawal .* failed because the purse only contained .*/ },
  );

  const message =
    'Offer {"brand":"[Alleged: IST brand]","value":"[1n]"} is not sufficient to pay off debt {"brand":"[Alleged: IST brand]","value":"[5025000n]"}';

  await t.throwsAsync(
    wd.executeOfferMaker(
      Offers.vaults.CloseVault,
      {
        offerId: 'close-insufficient',
        collateralBrandKey,
        giveMinted: 0.000_001,
      },
      'open-vault',
    ),
    { message },
  );

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-insufficient',
      numWantsSatisfied: 1, // trivially true because proposal `want` was empty.
      error: `Error: ${message}`,
    },
  });

  console.log('close correctly');
  await wd.executeOfferMaker(
    Offers.vaults.CloseVault,
    { offerId: 'close-well', collateralBrandKey, giveMinted: 5.025 },
    'open-vault',
  );

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'close-well',
      error: undefined,
      numWantsSatisfied: 1,
      result: 'your vault is closed, thank you for your business',
      // funds are returned
      payouts: likePayouts(giveCollateral, 0),
    },
  });
});

test.serial(
  'open vault with insufficient funds gives helpful error',
  async t => {
    const { walletFactoryDriver } = t.context;

    const wd = await walletFactoryDriver.provideSmartWallet(
      'agoric1insufficient',
    );

    const giveCollateral = 9.0;
    const wantMinted = giveCollateral * 100;
    const message =
      'Proposed debt {"brand":"[Alleged: IST brand]","value":"[904500000n]"} exceeds max {"brand":"[Alleged: IST brand]","value":"[63462857n]"} for {"brand":"[Alleged: ATOM brand]","value":"[9000000n]"} collateral';

    await t.throwsAsync(
      wd.executeOfferMaker(Offers.vaults.OpenVault, {
        offerId: 'open-vault',
        collateralBrandKey,
        giveCollateral,
        wantMinted,
      }),
      { message },
    );

    t.like(wd.getLatestUpdateRecord(), {
      updated: 'offerStatus',
      status: {
        id: 'open-vault',
        numWantsSatisfied: 0,
        error: `Error: ${message}`,
        // funds are returned
        payouts: likePayouts(giveCollateral, 0),
      },
    });
  },
);

test.serial('exit bid', async t => {
  const { walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1bid');

  // get some IST
  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'bid-open-vault',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  await wd.sendOfferMaker(Offers.auction.Bid, {
    offerId: 'bid',
    maxBuy: '1.23ATOM',
    give: '0.1IST',
    price: 5,
  });

  await wd.tryExitOffer('bid');

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: {
      id: 'bid',
      result: 'Your bid has been accepted', // it was accepted before being exited
      numWantsSatisfied: 1, // trivially 1 because there were no "wants" in the proposal
      payouts: {
        // got back the give
        Bid: { value: 100000n },
      },
    },
  });
});

test.serial('propose change to auction governance param', async t => {
  const {
    walletFactoryDriver,
    agoricNamesRemotes,
    readLatestEntryFromStorage,
  } = t.context;

  const gov1 = 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce';
  const wd = await walletFactoryDriver.provideSmartWallet(gov1);

  console.log('accept charter invitation');
  const charter = agoricNamesRemotes.instance.econCommitteeCharter;

  await wd.executeOffer({
    id: 'accept-charter-invitation',
    invitationSpec: {
      source: 'purse',
      instance: charter,
      description: 'charter member invitation',
    },
    proposal: {},
  });

  t.like(wd.getLatestUpdateRecord(), { status: { numWantsSatisfied: 1 } });

  const auctioneer = agoricNamesRemotes.instance.auctioneer;
  const timerBrand = agoricNamesRemotes.brand.timer;
  assert(timerBrand);

  console.log('propose param change');
  /* XXX @type {Partial<AuctionParams>} */
  const params = { StartFrequency: { timerBrand, relValue: 5n * 60n } };

  const offerArgs: ParamChangesOfferArgs = {
    deadline: 1000n,
    params,
    instance: auctioneer,
    path: { paramPath: { key: 'governedParams' } },
  };

  await wd.executeOffer({
    id: 'propose-param-change',
    invitationSpec: {
      source: 'continuing',
      previousOffer: 'accept-charter-invitation',
      invitationMakerName: 'VoteOnParamChange',
    },
    offerArgs,
    proposal: {},
  });

  t.like(wd.getLatestUpdateRecord(), { status: { numWantsSatisfied: 1 } });

  const lastQuestion = readLatestEntryFromStorage(
    'published.committees.Economic_Committee.latestQuestion',
  );
  const changes = lastQuestion?.issue?.spec?.changes;
  console.log('check Economic_Committee.latestQuestion against proposal');
  t.like(changes, { StartFrequency: { relValue: 300n } });
});

test.serial('open vault day later', async t => {
  const { advanceTimeBy, walletFactoryDriver } = t.context;

  const wd = await walletFactoryDriver.provideSmartWallet('agoric1later');

  await advanceTimeBy(1, 'days');

  await wd.executeOfferMaker(Offers.vaults.OpenVault, {
    offerId: 'open-vault',
    collateralBrandKey,
    wantMinted: 5.0,
    giveCollateral: 9.0,
  });

  t.like(wd.getLatestUpdateRecord(), {
    updated: 'offerStatus',
    status: { id: 'open-vault', numWantsSatisfied: 1 },
  });
});
