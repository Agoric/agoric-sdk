import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { TestFn } from 'ava';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import {
  makeAgoricNamesRemotesFromFakeStorage,
  slotToBoardRemote,
  unmarshalFromVstorage,
} from '@agoric/vats/tools/board-utils.js';
import { makeMarshal } from '@endo/marshal';

import { makeSwingsetTestKit } from '../../tools/supports.js';
import { makeWalletFactoryDriver } from '../../tools/drivers.js';

export const makeZoeTestContext = async t => {
  console.time('ZoeTestContext');
  const swingsetTestKit = await makeSwingsetTestKit(t.log, undefined, {
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
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
    storage,
    // zoeDriver,
  };
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test('replace committee and test voting', async t => {
  const {
    advanceTimeTo,
    buildProposal,
    evalProposal,
    walletFactoryDriver,
    storage,
  } = t.context;

  const wallets = {
    gov1: 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
    gov2: 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
    gov3: 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
    gov4: 'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
    gov5: 'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
    gov6: 'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
  };
  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { econCommitteeCharter, economicCommittee, VaultFactory } =
    agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  const smartWallets = await Promise.all(
    Object.values(wallets).map(async addr =>
      walletFactoryDriver.provideSmartWallet(addr),
    ),
  );

  // Accepting all invitations
  const PROPOSAL_INV = 'old_proposal_invitation';
  const VOTER_INV = 'old_voter_invitation';

  await Promise.all(
    smartWallets.map(w =>
      w.executeOffer({
        id: PROPOSAL_INV,
        invitationSpec: {
          source: 'purse',
          instance: econCommitteeCharter,
          description: 'charter member invitation',
        },
        proposal: {},
      }),
    ),
  );

  await Promise.all(
    smartWallets.map(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      return w.executeOffer({
        id: VOTER_INV,
        invitationSpec: {
          source: 'purse',
          instance: economicCommittee,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  // Proposing a question
  await smartWallets[0].executeOffer({
    id: 'propose-question-1',
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: PROPOSAL_INV,
      source: 'continuing',
    },
    offerArgs: {
      deadline: 1n,
      instance: VaultFactory,
      params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();

  // t.like(wd.getLatestUpdateRecord(), { status: { numWantsSatisfied: 1 } });

  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);
  const latestQuestionKey = `published.committees.Economic_Committee.latestQuestion`;
  const lastOutcomeKey = `published.committees.Economic_Committee.latestOutcome`;

  // Voting on question using first 3 wallets
  const lastQuestion = unmarshalFromVstorage(
    storage.data,
    latestQuestionKey,
    fromCapData,
    -1,
  );
  await Promise.all(
    smartWallets.slice(0, 3).map(w =>
      w.executeOffer({
        id: 'econ-vote',
        invitationSpec: {
          invitationArgs: [
            [lastQuestion.positions[0]],
            lastQuestion.questionHandle,
          ],
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: VOTER_INV,
          source: 'continuing',
        },
        proposal: {},
      }),
    ),
  );

  // Waiting for period to end
  await advanceTimeTo(2n);

  // Verifying outcome
  const lastOutcome = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  console.log('lastOutcome', lastOutcome);
  t.assert(lastOutcome.outcome === 'win');

  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/inter-protocol/replace-electorate-core.js',
    ),
  );
  await eventLoopIteration();

  const newCommittee = smartWallets.slice(0, 3);

  // Accepting new invitations
  // await Promise.all(
  //   newCommittee.map(w =>
  //     w.executeOffer({
  //       id: 'new-charter',
  //       invitationSpec: {
  //         source: 'purse',
  //         instance: econCommitteeCharter,
  //         description: 'charter member invitation',
  //       },
  //       proposal: {},
  //     }),
  //   ),
  // );

  const agoricNamesRemotes2 = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { economicCommittee: economicCommitteeNew } =
    agoricNamesRemotes2.instance;
  console.log(newCommittee[0].getCurrentWalletRecord().offerToUsedInvitation);
  await Promise.all(
    newCommittee.map(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      return w.executeOffer({
        id: 'new-voter',
        invitationSpec: {
          source: 'purse',
          instance: economicCommitteeNew,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  // Proposing question with new committee
  await newCommittee[0].executeOffer({
    id: 'new-charter-propose',
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: PROPOSAL_INV,
      source: 'continuing',
    },
    offerArgs: {
      deadline: 3n,
      instance: VaultFactory,
      params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();

  // Voting on question using first 2 wallets
  const lastQuestionForNewCommittee = unmarshalFromVstorage(
    storage.data,
    latestQuestionKey,
    fromCapData,
    -1,
  );
  await Promise.all(
    newCommittee.slice(0, 2).map(w =>
      w.executeOffer({
        id: 'econ-vote',
        invitationSpec: {
          invitationArgs: [
            [lastQuestionForNewCommittee.positions[0]],
            lastQuestionForNewCommittee.questionHandle,
          ],
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: 'new-voter',
          source: 'continuing',
        },
        proposal: {},
      }),
    ),
  );

  // Waiting for period to end
  await advanceTimeTo(4n);

  const lastOutcomeForNewCommittee = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.assert(lastOutcomeForNewCommittee.outcome === 'win');
});
