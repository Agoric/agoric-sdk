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
import {
  makeGovernanceDriver,
  makeWalletFactoryDriver,
} from '../../tools/drivers.js';

const wallets = [
  'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
  'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
  'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
  'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
  'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
  'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
];

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

  const governanceDriver = await makeGovernanceDriver(
    swingsetTestKit,
    agoricNamesRemotes,
    walletFactoryDriver,
    wallets,
  );

  return {
    ...swingsetTestKit,
    storage,
    getUpdatedDebtLimit,
    governanceDriver,
  };
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test.serial('normal running of committee', async t => {
  const { advanceTimeBy, storage, getUpdatedDebtLimit, governanceDriver } =
    t.context;

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { VaultFactory, economicCommittee } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  const committee = governanceDriver.ecMembers;

  t.log('Accepting all invitations for original committee');
  await null;
  for (const member of committee) {
    await member.acceptCharterInvitation(offerIds.propose.outgoing);
    await member.acceptCommitteeInvitation(offerIds.vote.outgoing);
  }

  t.log('Proposing a question using first wallet');
  await governanceDriver.proposeParams(
    VaultFactory,
    { DebtLimit: { brand: debtBrand, value: 100_000_000n } },
    { paramPath: { key: { collateralBrand } } },
    committee[0],
    getQuestionId(1),
    offerIds.propose.outgoing,
  );

  t.log('Checking if question proposal passed');
  t.like(committee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(1), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 3 wallets');
  await governanceDriver.enactLatestProposal(
    committee,
    getVoteId(1),
    offerIds.vote.outgoing,
  );

  t.log('Checking if votes passed');
  for (const w of committee.slice(0, 3)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(1), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');

  const lastOutcome = await governanceDriver.getLatestOutcome();
  console.log(lastOutcome);
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
    t.deepEqual(data.sort(), [...wallets].sort());
  },
);

test.serial('replace committee', async t => {
  const { buildProposal, evalProposal, storage } = t.context;

  const preEvalAgoricNames = makeAgoricNamesRemotesFromFakeStorage(storage);
  await evalProposal(
    buildProposal(
      '@agoric/builders/scripts/inter-protocol/replace-electorate-core.js',
      ['BOOTSTRAP_TEST'],
    ),
  );
  await eventLoopIteration();

  const postEvalAgoricNames = makeAgoricNamesRemotesFromFakeStorage(storage);

  t.not(
    preEvalAgoricNames.instance.economicCommittee,
    postEvalAgoricNames.instance.economicCommittee,
  );
});

test.serial(
  'check high priority senders after replacing committee',
  async t => {
    const { storage } = t.context;

    const data: any = storage.toStorage({
      method: 'children',
      args: [highPrioritySenderKey],
    });
    t.deepEqual(data.sort(), wallets.slice(0, 3).sort());
  },
);

test.serial('successful vote by 2 continuing members', async t => {
  const { storage, advanceTimeBy, getUpdatedDebtLimit, governanceDriver } =
    t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { economicCommittee, VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Accepting all new invitations for voters');
  await null;
  for (const member of newCommittee) {
    await member.acceptCommitteeInvitation(
      offerIds.vote.incoming,
      economicCommittee,
    );
  }

  t.log('Proposing question using old charter invitation');
  await governanceDriver.proposeParams(
    VaultFactory,
    { DebtLimit: { brand: debtBrand, value: 200_000_000n } },
    { paramPath: { key: { collateralBrand } } },
    newCommittee[0],
    getQuestionId(2),
    offerIds.propose.outgoing,
  );

  t.like(newCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(2), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 2 wallets');
  await governanceDriver.enactLatestProposal(
    newCommittee.slice(0, 2),
    getVoteId(2),
    offerIds.vote.incoming,
  );
  for (const w of newCommittee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(2), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');
  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.deepEqual(getUpdatedDebtLimit(), 200_000_000n);
  t.assert(lastOutcome.outcome === 'win');
});

test.serial('unsuccessful vote by 2 outgoing members', async t => {
  const { governanceDriver, storage, advanceTimeBy, getUpdatedDebtLimit } =
    t.context;
  const outgoingCommittee = governanceDriver.ecMembers.slice(3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Proposing question using old charter invitation');
  await governanceDriver.proposeParams(
    VaultFactory,
    { DebtLimit: { brand: debtBrand, value: 300_000_000n } },
    { paramPath: { key: { collateralBrand } } },
    outgoingCommittee[0],
    getQuestionId(3),
    offerIds.propose.outgoing,
  );
  t.like(outgoingCommittee[0].getLatestUpdateRecord(), {
    status: { id: getQuestionId(3), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 2 wallets');
  t.log('voting is done by invitations already present and should fail');
  const votePromises = outgoingCommittee
    .slice(0, 2)
    .map(member =>
      member.voteOnLatestProposal(getVoteId(3), offerIds.vote.outgoing),
    );

  await t.throwsAsync(votePromises[0]);
  await t.throwsAsync(votePromises[1]);

  for (const w of outgoingCommittee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(3), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.notDeepEqual(getUpdatedDebtLimit(), 300_000_000n);
  t.assert(lastOutcome.outcome === 'fail');
});

test.serial(
  'successful vote by 2 continuing and 1 outgoing members',
  async t => {
    const { storage, advanceTimeBy, getUpdatedDebtLimit, governanceDriver } =
      t.context;
    const committee = [
      ...governanceDriver.ecMembers.slice(0, 2),
      governanceDriver.ecMembers[3],
    ];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    t.log('Proposing question using old charter invitation');
    await governanceDriver.proposeParams(
      VaultFactory,
      { DebtLimit: { brand: debtBrand, value: 400_000_000n } },
      { paramPath: { key: { collateralBrand } } },
      committee[0],
      getQuestionId(4),
      offerIds.propose.outgoing,
    );
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(4), numWantsSatisfied: 1 },
    });

    t.log('Voting on question using first all wallets');
    t.log('first 2 should pass, last should fail');
    const votePromises = committee.map((member, index) =>
      member.voteOnLatestProposal(
        getVoteId(4),
        index === 2 ? offerIds.vote.outgoing : offerIds.vote.incoming,
      ),
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
    await advanceTimeBy(1, 'minutes');

    const lastOutcome = await governanceDriver.getLatestOutcome();
    t.deepEqual(getUpdatedDebtLimit(), 400_000_000n);
    t.assert(lastOutcome.outcome === 'win');
  },
);

test.serial(
  'unsuccessful vote by 1 continuing and 2 outgoing members',
  async t => {
    const { storage, advanceTimeBy, getUpdatedDebtLimit, governanceDriver } =
      t.context;
    const committee = [
      governanceDriver.ecMembers[0],
      ...governanceDriver.ecMembers.slice(3, 5),
    ];

    const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
    const { VaultFactory } = agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    t.log('Proposing question using old charter invitation');
    await governanceDriver.proposeParams(
      VaultFactory,
      { DebtLimit: { brand: debtBrand, value: 500_000_000n } },
      { paramPath: { key: { collateralBrand } } },
      committee[0],
      getQuestionId(5),
      offerIds.propose.outgoing,
    );
    t.like(committee[0].getLatestUpdateRecord(), {
      status: { id: getQuestionId(5), numWantsSatisfied: 1 },
    });

    t.log('Voting on question using first all wallets');
    t.log('first 2 should fail, last should pass');
    const votePromises = committee.map((member, index) =>
      member.voteOnLatestProposal(
        getVoteId(5),
        index === 0 ? offerIds.vote.incoming : offerIds.vote.outgoing,
      ),
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
    await advanceTimeBy(1, 'minutes');

    const lastOutcome = await governanceDriver.getLatestOutcome();
    t.notDeepEqual(getUpdatedDebtLimit(), 500_000_000n);
    t.assert(lastOutcome.outcome === 'fail');
  },
);
