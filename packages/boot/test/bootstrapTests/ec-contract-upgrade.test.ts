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

const wallets = {
  gov1: 'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
  gov2: 'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
  gov3: 'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
  gov4: 'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
  gov5: 'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
  gov6: 'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
};

const latestQuestionKey = `published.committees.Economic_Committee.latestQuestion`;
const lastOutcomeKey = `published.committees.Economic_Committee.latestOutcome`;

const PROPOSAL_INV = 'old_proposal_invitation';
const VOTER_INV = 'old_voter_invitation';
const NEW_VOTER_INV = 'new_voter_invitation';

const getQuestionId = id => `propose-question-${id}`;
const getVoteId = id => `vote-${id}`;

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

  console.timeEnd('DefaultTestContext');
  const walletFactoryDriver = await makeWalletFactoryDriver(
    runUtils,
    storage,
    agoricNamesRemotes,
  );

  const smartWallets = await Promise.all(
    Object.values(wallets).map(async addr =>
      walletFactoryDriver.provideSmartWallet(addr),
    ),
  );
  const { fromCapData } = makeMarshal(undefined, slotToBoardRemote);

  return {
    ...swingsetTestKit,
    storage,
    smartWallets,
    fromCapData,
  };
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test.serial('normal running of committee', async t => {
  const { advanceTimeTo, storage, smartWallets, fromCapData } = t.context;

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { econCommitteeCharter, economicCommittee, VaultFactory } =
    agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  // Accepting all invitations for original committee
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

  // Proposing a question using first wallet
  await smartWallets[0].executeOffer({
    id: getQuestionId(1),
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
  t.like(smartWallets[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(1), numWantsSatisfied: 1 },
  });

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
        id: getVoteId(1),
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

  smartWallets.slice(0, 3).forEach(w =>
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(1), numWantsSatisfied: 1 },
    }),
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

  t.assert(lastOutcome.outcome === 'win');
});

test.todo('check high priority senders before replacing committee');

test.serial('replace committee', async t => {
  const { buildProposal, evalProposal } = t.context;
  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/inter-protocol/replace-electorate-core.js',
    ),
  );
  await eventLoopIteration();
  t.true(true); // just to avoid failure
});

test.todo('check high priority senders after replacing committee');

test.serial('successful vote by 2 continuing members', async t => {
  const { smartWallets, storage, fromCapData, advanceTimeTo } = t.context;
  const newCommittee = smartWallets.slice(0, 3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { economicCommittee, VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  // Accepting all new invitations for voters
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
        id: NEW_VOTER_INV,
        invitationSpec: {
          source: 'purse',
          instance: economicCommittee,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  // Proposing question using old charter invitation
  await newCommittee[0].executeOffer({
    id: getQuestionId(2),
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
  t.like(newCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(2), numWantsSatisfied: 1 },
  });

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
        id: getVoteId(2),
        invitationSpec: {
          invitationArgs: [
            [lastQuestionForNewCommittee.positions[0]],
            lastQuestionForNewCommittee.questionHandle,
          ],
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: NEW_VOTER_INV,
          source: 'continuing',
        },
        proposal: {},
      }),
    ),
  );
  newCommittee.slice(0, 2).forEach(w =>
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(2), numWantsSatisfied: 1 },
    }),
  );

  // Waiting for period to end
  await advanceTimeTo(4n);

  // Verifying outcome
  const lastOutcomeForNewCommittee = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.assert(lastOutcomeForNewCommittee.outcome === 'win');
});

test.serial('unsuccessful vote by 2 outgoing members', async t => {
  const { smartWallets, storage, fromCapData, advanceTimeTo } = t.context;
  const outgoingCommittee = smartWallets.slice(3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  // Should have no new invitations
  outgoingCommittee.forEach(w => {
    const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
      return p.brand.toString().includes('Invitation');
    });
    if (!invitationPurse) return null;

    const invitation = invitationPurse.balance.value.find(a =>
      a.description.includes('Voter'),
    );
    t.assert(invitation === undefined);
  });

  // Proposing question using old charter invitation
  await outgoingCommittee[0].executeOffer({
    id: getQuestionId(3),
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: PROPOSAL_INV,
      source: 'continuing',
    },
    offerArgs: {
      deadline: 5n,
      instance: VaultFactory,
      params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();
  t.like(outgoingCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(3), numWantsSatisfied: 1 },
  });

  // Voting on question using first 2 wallets
  // voting is done by invitations already present and should fail
  const lastQuestionForOutgoingCommittee = unmarshalFromVstorage(
    storage.data,
    latestQuestionKey,
    fromCapData,
    -1,
  );
  const votePromises = outgoingCommittee.slice(0, 2).map(w =>
    w.executeOffer({
      id: getVoteId(3),
      invitationSpec: {
        invitationArgs: [
          [lastQuestionForOutgoingCommittee.positions[0]],
          lastQuestionForOutgoingCommittee.questionHandle,
        ],
        invitationMakerName: 'makeVoteInvitation',
        previousOffer: VOTER_INV,
        source: 'continuing',
      },
      proposal: {},
    }),
  );

  await t.throwsAsync(votePromises[0]);
  await t.throwsAsync(votePromises[1]);

  outgoingCommittee.slice(0, 2).forEach(w =>
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(3), numWantsSatisfied: 1 },
    }),
  );

  // Waiting for period to end
  await advanceTimeTo(6n);

  const lastOutcomeForNewCommittee = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.assert(lastOutcomeForNewCommittee.outcome === 'fail');
});

test.serial(
  'successful vote by 2 continuing and 1 outgoing members',
  async t => {
    const { smartWallets, storage, fromCapData, advanceTimeTo } = t.context;
    const committee = [...smartWallets.slice(0, 2), smartWallets[3]];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    // All invitations should already be accepted.
    committee.forEach(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      t.assert(invitation === undefined);
    });

    // Proposing question using old charter invitation
    await committee[0].executeOffer({
      id: getQuestionId(4),
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: PROPOSAL_INV,
        source: 'continuing',
      },
      offerArgs: {
        deadline: 7n,
        instance: VaultFactory,
        params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
        path: { paramPath: { key: { collateralBrand } } },
      },
      proposal: {},
    });
    await eventLoopIteration();
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(4), numWantsSatisfied: 1 },
    });

    // Voting on question using first all wallets
    // first 2 should pass, last should fail
    const lastQuestionForNewCommittee = unmarshalFromVstorage(
      storage.data,
      latestQuestionKey,
      fromCapData,
      -1,
    );
    const votePromises = committee.map((w, index) =>
      w.executeOffer({
        id: getVoteId(4),
        invitationSpec: {
          invitationArgs: [
            [lastQuestionForNewCommittee.positions[0]],
            lastQuestionForNewCommittee.questionHandle,
          ],
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: index === 2 ? VOTER_INV : NEW_VOTER_INV, // using old invitation for outgoing member
          source: 'continuing',
        },
        proposal: {},
      }),
    );

    await votePromises[0];
    await votePromises[1];
    await t.throwsAsync(votePromises[2]);

    committee.forEach(w =>
      t.like(w.getLatestUpdateRecord(), {
        status: { id: getVoteId(4), numWantsSatisfied: 1 },
      }),
    );

    // Waiting for period to end
    await advanceTimeTo(8n);

    const lastOutcomeForNewCommittee = unmarshalFromVstorage(
      storage.data,
      lastOutcomeKey,
      fromCapData,
      -1,
    );
    t.assert(lastOutcomeForNewCommittee.outcome === 'win');
  },
);

test.serial(
  'unsuccessful vote by 1 continuing and 2 outgoing members',
  async t => {
    const { smartWallets, storage, fromCapData, advanceTimeTo } = t.context;
    const committee = [smartWallets[0], ...smartWallets.slice(3, 5)];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    // All invitations should already be accepted.
    committee.forEach(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      t.assert(invitation === undefined);
    });

    // Proposing question using old charter invitation
    await committee[0].executeOffer({
      id: getQuestionId(5),
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: PROPOSAL_INV,
        source: 'continuing',
      },
      offerArgs: {
        deadline: 9n,
        instance: VaultFactory,
        params: { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
        path: { paramPath: { key: { collateralBrand } } },
      },
      proposal: {},
    });
    await eventLoopIteration();
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(5), numWantsSatisfied: 1 },
    });

    // Voting on question using first all wallets
    // first 2 should fail, last should pass
    const lastQuestionForNewCommittee = unmarshalFromVstorage(
      storage.data,
      latestQuestionKey,
      fromCapData,
      -1,
    );
    const votePromises = committee.map((w, index) =>
      w.executeOffer({
        id: getVoteId(5),
        invitationSpec: {
          invitationArgs: [
            [lastQuestionForNewCommittee.positions[0]],
            lastQuestionForNewCommittee.questionHandle,
          ],
          invitationMakerName: 'makeVoteInvitation',
          previousOffer: index === 0 ? NEW_VOTER_INV : VOTER_INV, // using new invitation for continuing member
          source: 'continuing',
        },
        proposal: {},
      }),
    );

    await votePromises[0];
    await t.throwsAsync(votePromises[1]);
    await t.throwsAsync(votePromises[2]);

    committee.forEach(w =>
      t.like(w.getLatestUpdateRecord(), {
        status: { id: getVoteId(5), numWantsSatisfied: 1 },
      }),
    );

    // Waiting for period to end
    await advanceTimeTo(10n);

    const lastOutcomeForNewCommittee = unmarshalFromVstorage(
      storage.data,
      lastOutcomeKey,
      fromCapData,
      -1,
    );
    t.assert(lastOutcomeForNewCommittee.outcome === 'fail');
  },
);
