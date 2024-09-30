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
  propose: { outgoing: 'outgoing_propose', incoming: 'incoming_propose' },
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

test.serial('successful proposal and vote by continuing members', async t => {
  const { storage, advanceTimeBy, getUpdatedDebtLimit, governanceDriver } =
    t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { economicCommittee, VaultFactory, econCommitteeCharter } =
    agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Accepting all new invitations for voters');
  await null;
  for (const member of newCommittee) {
    await member.acceptCharterInvitation(
      offerIds.propose.incoming,
      econCommitteeCharter,
    );
    await member.acceptCommitteeInvitation(
      offerIds.vote.incoming,
      economicCommittee,
    );
  }

  t.log('Proposing question using new charter invitation');
  await governanceDriver.proposeParams(
    VaultFactory,
    { DebtLimit: { brand: debtBrand, value: 200_000_000n } },
    { paramPath: { key: { collateralBrand } } },
    newCommittee[0],
    getQuestionId(2),
    offerIds.propose.incoming,
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

test.serial('successful proposal by outgoing member', async t => {
  // Ability to propose by outgoing member should still exist
  const { storage, advanceTimeBy, getUpdatedDebtLimit, governanceDriver } =
    t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);
  const outgoingMember = governanceDriver.ecMembers[3];

  const agoricNamesRemotes = makeAgoricNamesRemotesFromFakeStorage(storage);
  const { VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  t.log('Proposing question using old charter invitation');
  await governanceDriver.proposeParams(
    VaultFactory,
    { DebtLimit: { brand: debtBrand, value: 300_000_000n } },
    { paramPath: { key: { collateralBrand } } },
    outgoingMember,
    getQuestionId(3),
    offerIds.propose.outgoing,
  );

  t.like(outgoingMember.getLatestUpdateRecord(), {
    status: { id: getQuestionId(3), numWantsSatisfied: 1 },
  });

  t.log('Voting on question using first 2 wallets');
  await governanceDriver.enactLatestProposal(
    newCommittee.slice(0, 2),
    getVoteId(3),
    offerIds.vote.incoming,
  );
  for (const w of newCommittee.slice(0, 2)) {
    t.like(w.getLatestUpdateRecord(), {
      status: { id: getVoteId(3), numWantsSatisfied: 1 },
    });
  }

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');
  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.deepEqual(getUpdatedDebtLimit(), 300_000_000n);
  t.assert(lastOutcome.outcome === 'win');
});
