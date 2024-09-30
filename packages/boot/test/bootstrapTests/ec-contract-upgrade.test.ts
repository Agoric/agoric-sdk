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
const highPrioritySenderKey = 'highPrioritySenders';

const offerIds = {
  propose: { outgoing: 'outgoing_propose' },
  vote: { outgoing: 'outgoing_vote', incoming: 'incoming_vote' },
};

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

  const getUpdatedDebtLimit = () => {
    const atomGovernance = unmarshalFromVstorage(
      storage.data,
      'published.vaultFactory.managers.manager0.governance',
      fromCapData,
      -1,
    );
    return atomGovernance.current.DebtLimit.value.value;
  };
  return {
    ...swingsetTestKit,
    storage,
    smartWallets,
    fromCapData,
    getUpdatedDebtLimit,
  };
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test.serial('normal running of committee', async t => {
  const {
    advanceTimeTo,
    storage,
    smartWallets,
    fromCapData,
    getUpdatedDebtLimit,
  } = t.context;

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { econCommitteeCharter, economicCommittee, VaultFactory } =
    agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Accepting all invitations for original committee');
  await Promise.all(
    smartWallets.map(w =>
      w.executeOffer({
        id: offerIds.propose.outgoing,
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
        // TODO: manage brands by object identity #10167
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      // @ts-expect-error
      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      return w.executeOffer({
        id: offerIds.vote.outgoing,
        invitationSpec: {
          source: 'purse',
          instance: economicCommittee,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  t.log('Proposing a question using first wallet');
  await smartWallets[0].executeOffer({
    id: getQuestionId(1),
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: offerIds.propose.outgoing,
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

  t.log('Voting on question using first 3 wallets');
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
          previousOffer: offerIds.vote.outgoing,
          source: 'continuing',
        },
        proposal: {},
      }),
    ),
  );

  for (const w of smartWallets.slice(0, 3)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(1), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeTo(2n);

  t.log('Verifying outcome');
  const lastOutcome = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.deepEqual(getUpdatedDebtLimit(), 100_000_000n);
  t.assert(lastOutcome.outcome === 'win');
});

test.serial(
  'check high priority senders before replacing committee',
  async t => {
    const { storage } = t.context;

    const data: any = storage.toStorage({
      method: 'children',
      args: [highPrioritySenderKey],
    });
    t.deepEqual(data.sort(), Object.values(wallets).sort());
  },
);

test.serial('replace committee', async t => {
  const { buildProposal, evalProposal } = t.context;
  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/inter-protocol/replace-electorate-core.js',
      ['BOOTSTRAP_TEST'],
    ),
  );
  await eventLoopIteration();
  t.true(true); // just to avoid failure
});

test.serial(
  'check high priority senders after replacing committee',
  async t => {
    const { storage } = t.context;

    const data: any = storage.toStorage({
      method: 'children',
      args: [highPrioritySenderKey],
    });
    t.deepEqual(data.sort(), Object.values(wallets).slice(0, 3).sort());
  },
);

test.serial('successful vote by 2 continuing members', async t => {
  const {
    smartWallets,
    storage,
    fromCapData,
    advanceTimeTo,
    getUpdatedDebtLimit,
  } = t.context;
  const newCommittee = smartWallets.slice(0, 3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { economicCommittee, VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Accepting all new invitations for voters');
  await Promise.all(
    newCommittee.map(w => {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        // TODO: manage brands by object identity #10167
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) return null;

      // @ts-expect-error
      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      return w.executeOffer({
        id: offerIds.vote.incoming,
        invitationSpec: {
          source: 'purse',
          instance: economicCommittee,
          description: invitation.description,
        },
        proposal: {},
      });
    }),
  );

  t.log('Proposing question using old charter invitation');
  await newCommittee[0].executeOffer({
    id: getQuestionId(2),
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: offerIds.propose.outgoing,
      source: 'continuing',
    },
    offerArgs: {
      deadline: 3n,
      instance: VaultFactory,
      params: { DebtLimit: { brand: debtBrand, value: 200_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();
  t.like(newCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(2), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 2 wallets');
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
          previousOffer: offerIds.vote.incoming,
          source: 'continuing',
        },
        proposal: {},
      }),
    ),
  );
  for (const w of newCommittee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(2), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeTo(4n);

  t.log('Verifying outcome');
  const lastOutcomeForNewCommittee = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.deepEqual(getUpdatedDebtLimit(), 200_000_000n);
  t.assert(lastOutcomeForNewCommittee.outcome === 'win');
});

test.serial('unsuccessful vote by 2 outgoing members', async t => {
  const {
    smartWallets,
    storage,
    fromCapData,
    advanceTimeTo,
    getUpdatedDebtLimit,
  } = t.context;
  const outgoingCommittee = smartWallets.slice(3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Should have no new invitations');
  for (const w of outgoingCommittee) {
    const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
      // TODO: manage brands by object identity #10167
      return p.brand.toString().includes('Invitation');
    });
    if (!invitationPurse) continue;

    // @ts-expect-error
    const invitation = invitationPurse.balance.value.find(a =>
      a.description.includes('Voter'),
    );
    t.assert(invitation === undefined);
  }

  t.log('Proposing question using old charter invitation');
  await outgoingCommittee[0].executeOffer({
    id: getQuestionId(3),
    invitationSpec: {
      invitationMakerName: 'VoteOnParamChange',
      previousOffer: offerIds.propose.outgoing,
      source: 'continuing',
    },
    offerArgs: {
      deadline: 5n,
      instance: VaultFactory,
      params: { DebtLimit: { brand: debtBrand, value: 300_000_000n } },
      path: { paramPath: { key: { collateralBrand } } },
    },
    proposal: {},
  });
  await eventLoopIteration();
  t.like(outgoingCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(3), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 2 wallets');
  t.log('voting is done by invitations already present and should fail');
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
        previousOffer: offerIds.vote.outgoing,
        source: 'continuing',
      },
      proposal: {},
    }),
  );

  await t.throwsAsync(votePromises[0]);
  await t.throwsAsync(votePromises[1]);

  for (const w of outgoingCommittee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(3), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeTo(6n);

  const lastOutcomeForNewCommittee = unmarshalFromVstorage(
    storage.data,
    lastOutcomeKey,
    fromCapData,
    -1,
  );
  t.notDeepEqual(getUpdatedDebtLimit(), 300_000_000n);
  t.assert(lastOutcomeForNewCommittee.outcome === 'fail');
});

test.serial(
  'successful vote by 2 continuing and 1 outgoing members',
  async t => {
    const {
      smartWallets,
      storage,
      fromCapData,
      advanceTimeTo,
      getUpdatedDebtLimit,
    } = t.context;
    const committee = [...smartWallets.slice(0, 2), smartWallets[3]];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    t.log('All invitations should already be accepted.');
    for (const w of committee) {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        // TODO: manage brands by object identity #10167
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) continue;

      // @ts-expect-error
      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      t.assert(invitation === undefined);
    }

    t.log('Proposing question using old charter invitation');
    await committee[0].executeOffer({
      id: getQuestionId(4),
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: offerIds.propose.outgoing,
        source: 'continuing',
      },
      offerArgs: {
        deadline: 7n,
        instance: VaultFactory,
        params: { DebtLimit: { brand: debtBrand, value: 400_000_000n } },
        path: { paramPath: { key: { collateralBrand } } },
      },
      proposal: {},
    });
    await eventLoopIteration();
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(4), numWantsSatisfied: 1 },
    });

    t.log('Voting on question using first all wallets');
    t.log('first 2 should pass, last should fail');
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
          previousOffer:
            index === 2 ? offerIds.vote.outgoing : offerIds.vote.incoming, // using old invitation for outgoing member
          source: 'continuing',
        },
        proposal: {},
      }),
    );

    await votePromises[0];
    await votePromises[1];
    await t.throwsAsync(votePromises[2]);

    for (const w of committee) {
      t.like(w.getLatestUpdateRecord(), {
        status: { id: getVoteId(4), numWantsSatisfied: 1 },
      });
    }

    t.log('Waiting for period to end');
    await advanceTimeTo(8n);

    const lastOutcomeForNewCommittee = unmarshalFromVstorage(
      storage.data,
      lastOutcomeKey,
      fromCapData,
      -1,
    );
    t.deepEqual(getUpdatedDebtLimit(), 400_000_000n);
    t.assert(lastOutcomeForNewCommittee.outcome === 'win');
  },
);

test.serial(
  'unsuccessful vote by 1 continuing and 2 outgoing members',
  async t => {
    const {
      smartWallets,
      storage,
      fromCapData,
      advanceTimeTo,
      getUpdatedDebtLimit,
    } = t.context;
    const committee = [smartWallets[0], ...smartWallets.slice(3, 5)];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    t.log('All invitations should already be accepted.');
    for (const w of committee) {
      const invitationPurse = w.getCurrentWalletRecord().purses.find(p => {
        // TODO: manage brands by object identity #10167
        return p.brand.toString().includes('Invitation');
      });
      if (!invitationPurse) continue;

      // @ts-expect-error
      const invitation = invitationPurse.balance.value.find(a =>
        a.description.includes('Voter'),
      );
      t.assert(invitation === undefined);
    }

    t.log('Proposing question using old charter invitation');
    await committee[0].executeOffer({
      id: getQuestionId(5),
      invitationSpec: {
        invitationMakerName: 'VoteOnParamChange',
        previousOffer: offerIds.propose.outgoing,
        source: 'continuing',
      },
      offerArgs: {
        deadline: 9n,
        instance: VaultFactory,
        params: { DebtLimit: { brand: debtBrand, value: 500_000_000n } },
        path: { paramPath: { key: { collateralBrand } } },
      },
      proposal: {},
    });
    await eventLoopIteration();
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(5), numWantsSatisfied: 1 },
    });

    t.log('Voting on question using first all wallets');
    t.log('first 2 should fail, last should pass');
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
          previousOffer:
            index === 0 ? offerIds.vote.incoming : offerIds.vote.outgoing, // using new invitation for continuing member
          source: 'continuing',
        },
        proposal: {},
      }),
    );

    await votePromises[0];
    await t.throwsAsync(votePromises[1]);
    await t.throwsAsync(votePromises[2]);

    for (const w of committee) {
      t.like(w.getLatestUpdateRecord(), {
        status: { id: getVoteId(5), numWantsSatisfied: 1 },
      });
    }

    t.log('Waiting for period to end');
    await advanceTimeTo(10n);

    const lastOutcomeForNewCommittee = unmarshalFromVstorage(
      storage.data,
      lastOutcomeKey,
      fromCapData,
      -1,
    );
    t.notDeepEqual(getUpdatedDebtLimit(), 500_000_000n);
    t.assert(lastOutcomeForNewCommittee.outcome === 'fail');
  },
);
