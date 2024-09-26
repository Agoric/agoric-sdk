import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { TestFn } from 'ava';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
  unmarshalFromVstorage,
} from '@agoric/vats/tools/board-utils.js';
import { makeMarshal } from '@endo/marshal';

import { matchAmount, makeSwingsetTestKit } from '../../tools/supports.js';
import { makeWalletFactoryDriver } from '../../tools/drivers.js';

const SECONDS_PER_DAY = 24n * 60n * 60n;

export const makeZoeTestContext = async t => {
  console.time('ZoeTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: '@agoric/vm-config/decentral-demo-config.json',
  });

  const { runUtils, storage } = swingsetTestKit;
  console.timeLog('DefaultTestContext', 'swingsetTestKit');
  const { EV } = runUtils;

  await eventLoopIteration();

  // We don't need vaults, but this gets the brand, which is checked somewhere
  // Wait for ATOM to make it into agoricNames
  await EV.vat('bootstrap').consumeItem('vaultFactoryKit');
  console.timeLog('DefaultTestContext', 'vaultFactoryKit');

  // has to be late enough for agoricNames data to have been published
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  console.timeLog('DefaultTestContext', 'agoricNamesRemotes');

  //   const zoeDriver = await makeZoeDriver(swingsetTestKit);
  console.timeLog('DefaultTestContext', 'walletFactoryDriver');

  console.timeEnd('DefaultTestContext');
  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  return {
    ...swingsetTestKit,
    walletFactoryDriver,
    agoricNamesRemotes,
    storage,
    // zoeDriver,
  };
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test('run restart-vats proposal', async t => {
  const { advanceTimeTo, walletFactoryDriver, agoricNamesRemotes, storage } =
    t.context;
  const wallets = {
    gov1: 'agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce',
    gov2: 'agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang',
    gov3: 'agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h',
  };
  console.log('fraz //////\n\n');
  //   console.log(t.context);
  console.log(walletFactoryDriver);
  const smartWallets = await Promise.all(
    Object.values(wallets).map(async addr =>
      walletFactoryDriver.provideSmartWallet(addr),
    ),
  );
  console.log(smartWallets[0].getCurrentWalletRecord().purses[0].balance.value);

  const { econCommitteeCharter, economicCommittee } =
    agoricNamesRemotes.instance;
  await smartWallets[0].executeOffer({
    id: 'econgov-1',
    invitationSpec: {
      source: 'purse',
      instance: econCommitteeCharter,
      description: 'charter member invitation',
    },
    proposal: {},
  });

  console.log(smartWallets[0].getCurrentWalletRecord().offerToUsedInvitation);

  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  const vaultFactoryInstance = agoricNamesRemotes.instance.VaultFactory;
  const ten = BigInt(Math.floor(Date.now() / 1000)) + 600n;
  await smartWallets[0].executeOffer({
    id: 'econ2',
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: 'econgov-1',
      source: 'continuing',
    },
    offerArgs: {
      deadline: 1n,
      instance: vaultFactoryInstance,
      params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();

  // t.like(wd.getLatestUpdateRecord(), { status: { numWantsSatisfied: 1 } });

  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);
  const key = `published.committees.Economic_Committee.latestQuestion`;
  const lastQuestion = unmarshalFromVstorage(
    storage.data,
    key,
    fromCapData,
    -1,
  );
  console.log(lastQuestion);

  // Voting on question
  await Promise.all(
    smartWallets.map(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        // xxx take this as param
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      return w.executeOffer({
        id: 'econgov-voter-1',
        invitationSpec: {
          source: 'purse',
          instance: economicCommittee,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  await smartWallets[0].executeOffer({
    id: 'econ3',
    invitationSpec: {
      invitationArgs: [
        [lastQuestion.positions[0]],
        lastQuestion.questionHandle,
      ],
      invitationMakerName: 'makeVoteInvitation',
      previousOffer: 'econgov-voter-1',
      source: 'continuing',
    },
    proposal: {},
  });

  await smartWallets[1].executeOffer({
    id: 'econ3',
    invitationSpec: {
      invitationArgs: [
        [lastQuestion.positions[0]],
        lastQuestion.questionHandle,
      ],
      invitationMakerName: 'makeVoteInvitation',
      previousOffer: 'econgov-voter-1',
      source: 'continuing',
    },
    proposal: {},
  });

  // Waiting for period to end
  await advanceTimeTo(2n);

  const key2 = `published.committees.Economic_Committee.latestOutcome`;
  const lastOutcome = unmarshalFromVstorage(
    storage.data,
    key2,
    fromCapData,
    -1,
  );
  console.log('outcome', lastOutcome);
  t.true(true);
});
