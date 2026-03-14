import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { passStyleOf } from '@endo/marshal';
import type { TestFn } from 'ava';

import {
  makeBootTestContext,
  withGovernance,
  withLiquidation,
  withWalletFactory,
} from '../tools/boot-test-context.js';

const wallets = [
  'agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx',
  'agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5',
  'agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a',
  'agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq',
  'agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5',
  'agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc',
];

const managerGovernanceKey =
  'published.vaultFactory.managers.manager0.governance';
const provisionPoolParamsKey = 'published.provisionPool.governance';
const reserveParamsKey = 'published.reserve.metrics';
const getPsmKey = brand => `published.psm.IST.${brand}.governance`;

const highPrioritySenderKey = 'highPrioritySenders';

const offerIds = {
  propose: { outgoing: 'charterMembership', incoming: 'incoming_propose' },
  vote: { outgoing: 'committeeMembership', incoming: 'incoming_vote' },
};

const getQuestionId = id => `propose-question-${id}`;
const getVoteId = id => `vote-${id}`;

export const makeZoeTestContext = async t => {
  const bootCtx = await makeBootTestContext(t, {
    configSpecifier: '@agoric/vm-config/decentral-main-vaults-config.json',
    fixtureName: 'main-vaults-base',
  });
  const walletCtx = await withWalletFactory(bootCtx);
  const governanceCtx = await withGovernance(walletCtx, { wallets });
  return withLiquidation(governanceCtx, { t });
};
const test = anyTest as TestFn<Awaited<ReturnType<typeof makeZoeTestContext>>>;

test.before(async t => {
  t.context = await makeZoeTestContext(t);
});

test.after.always(t => t.context.shutdown?.());

test.serial('normal running of committee', async t => {
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectParamValue,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const { VaultFactory } = agoricNamesRemotes.instance;
  const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

  const committee = governanceDriver.ecMembers;

  t.log('Accepting all invitations for original committee');
  await null;
  for (const member of committee) {
    await member.acceptOutstandingCharterInvitation(offerIds.propose.outgoing);
    await member.acceptOutstandingCommitteeInvitation(offerIds.vote.outgoing);
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
  expectProposalAccepted(t, committee[0], getQuestionId(1));

  t.log('Voting on question using first 3 wallets');
  await governanceDriver.enactLatestProposal(
    committee,
    getVoteId(1),
    offerIds.vote.outgoing,
  );

  t.log('Checking if votes passed');
  expectVoteAccepted(t, committee.slice(0, 3), getVoteId(1));

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');

  const lastOutcome = await governanceDriver.getLatestOutcome();
  expectParamValue(t, managerGovernanceKey, 100_000_000n, [
    'current',
    'DebtLimit',
    'value',
    'value',
  ]);
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

test.serial.failing('replace committee', async t => {
  const { agoricNamesRemotes, applyProposal, refreshAgoricNamesRemotes } =
    t.context;

  const preEvalEconomicCommittee =
    agoricNamesRemotes.instance.economicCommittee;
  await applyProposal(
    '@agoric/builders/scripts/inter-protocol/replace-electorate-core.js',
    ['BOOTSTRAP_TEST'],
  );
  refreshAgoricNamesRemotes();

  t.not(
    preEvalEconomicCommittee,
    agoricNamesRemotes.instance.economicCommittee,
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

test.serial.failing(
  'successful proposal and vote by 2 continuing members',
  async t => {
    const {
      advanceTimeBy,
      agoricNamesRemotes,
      expectParamValue,
      expectProposalAccepted,
      expectVoteAccepted,
      governanceDriver,
    } = t.context;
    const newCommittee = governanceDriver.ecMembers.slice(0, 3);

    const { economicCommittee, econCommitteeCharter, VaultFactory } =
      agoricNamesRemotes.instance;
    const { ATOM: collateralBrand, IST: debtBrand } = agoricNamesRemotes.brand;

    t.log('Accepting all new invitations for voters');
    await null;
    for (const member of newCommittee) {
      await member.acceptOutstandingCharterInvitation(
        offerIds.propose.incoming,
        econCommitteeCharter,
      );
      await member.acceptOutstandingCommitteeInvitation(
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
      offerIds.propose.incoming,
    );

    expectProposalAccepted(t, newCommittee[0], getQuestionId(2));

    t.log('Voting on question using first 2 wallets');
    await governanceDriver.enactLatestProposal(
      newCommittee.slice(0, 2),
      getVoteId(2),
      offerIds.vote.incoming,
    );
    expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(2));

    t.log('Waiting for period to end');
    await advanceTimeBy(1, 'minutes');

    t.log('Verifying outcome');
    const lastOutcome = await governanceDriver.getLatestOutcome();
    expectParamValue(t, managerGovernanceKey, 200_000_000n, [
      'current',
      'DebtLimit',
      'value',
      'value',
    ]);
    t.assert(lastOutcome.outcome === 'win');
  },
);

test.serial('unsuccessful vote by 2 outgoing members', async t => {
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const outgoingCommittee = governanceDriver.ecMembers.slice(3);

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
  expectProposalAccepted(t, outgoingCommittee[0], getQuestionId(3));

  t.log('Voting on question using first 2 wallets');
  t.log('voting is done by invitations already present and should fail');
  const votePromises = outgoingCommittee
    .slice(0, 2)
    .map(member =>
      member.voteOnLatestProposal(getVoteId(3), offerIds.vote.outgoing),
    );

  await t.throwsAsync(votePromises[0]);
  await t.throwsAsync(votePromises[1]);

  expectVoteAccepted(t, outgoingCommittee.slice(0, 2), getVoteId(3));

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.notDeepEqual(
    t.context.readPublished(managerGovernanceKey.replace(/^published\./, ''))
      .current.DebtLimit.value.value,
    300_000_000n,
  );
  t.assert(lastOutcome.outcome === 'fail');
});

test.serial(
  'successful vote by 2 continuing and 1 outgoing members',
  async t => {
    const {
      advanceTimeBy,
      agoricNamesRemotes,
      expectParamValue,
      expectProposalAccepted,
      expectVoteAccepted,
      governanceDriver,
    } = t.context;
    const committee = [
      ...governanceDriver.ecMembers.slice(0, 2),
      governanceDriver.ecMembers[3],
    ];

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
    expectProposalAccepted(t, committee[0], getQuestionId(4));

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

    expectVoteAccepted(t, committee, getVoteId(4));

    t.log('Waiting for period to end');
    await advanceTimeBy(1, 'minutes');

    const lastOutcome = await governanceDriver.getLatestOutcome();
    expectParamValue(t, managerGovernanceKey, 400_000_000n, [
      'current',
      'DebtLimit',
      'value',
      'value',
    ]);
    t.assert(lastOutcome.outcome === 'win');
  },
);

test.serial(
  'unsuccessful vote by 1 continuing and 2 outgoing members',
  async t => {
    const {
      advanceTimeBy,
      agoricNamesRemotes,
      expectProposalAccepted,
      expectVoteAccepted,
      governanceDriver,
    } = t.context;
    const committee = [
      governanceDriver.ecMembers[0],
      ...governanceDriver.ecMembers.slice(3, 5),
    ];

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
    expectProposalAccepted(t, committee[0], getQuestionId(5));

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

    expectVoteAccepted(t, committee, getVoteId(5));

    t.log('Waiting for period to end');
    await advanceTimeBy(1, 'minutes');

    const lastOutcome = await governanceDriver.getLatestOutcome();
    t.notDeepEqual(
      t.context.readPublished(managerGovernanceKey.replace(/^published\./, ''))
        .current.DebtLimit.value.value,
      500_000_000n,
    );
    t.assert(lastOutcome.outcome === 'fail');
  },
);

// Will fail until https://github.com/Agoric/agoric-sdk/issues/10136 is completed
test.failing('outgoing member should not be able to propose', async t => {
  // Ability to propose by outgoing member should still exist
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);
  const outgoingMember = governanceDriver.ecMembers[3];

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

  expectProposalAccepted(t, outgoingMember, getQuestionId(3));

  t.log('Voting on question using first 2 wallets');
  await governanceDriver.enactLatestProposal(
    newCommittee.slice(0, 2),
    getVoteId(3),
    offerIds.vote.incoming,
  );
  expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(3));

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');
  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.notDeepEqual(
    t.context.readPublished(managerGovernanceKey.replace(/^published\./, ''))
      .current.DebtLimit.value.value,
    300_000_000n,
  );
  t.assert(lastOutcome.outcome === 'win');
});

test.serial.failing('EC can govern provisionPool parameter', async t => {
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectParamValue,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);

  const { provisionPool } = agoricNamesRemotes.instance;
  const { IST } = agoricNamesRemotes.brand;

  t.log('Proposing question using new charter invitation');
  await governanceDriver.proposeParams(
    provisionPool,
    { PerAccountInitialAmount: { brand: IST, value: 100_000_000n } },
    { paramPath: { key: 'governedParams' } },
    newCommittee[0],
    getQuestionId(5),
    offerIds.propose.incoming,
  );

  expectProposalAccepted(t, newCommittee[0], getQuestionId(5));

  t.log('Voting on question using first 2 wallets');
  await governanceDriver.enactLatestProposal(
    newCommittee.slice(0, 2),
    getVoteId(5),
    offerIds.vote.incoming,
  );
  expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(5));

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');
  const lastOutcome = await governanceDriver.getLatestOutcome();
  expectParamValue(t, provisionPoolParamsKey, 100_000_000n, [
    'current',
    'PerAccountInitialAmount',
    'value',
    'value',
  ]);
  t.assert(lastOutcome.outcome === 'win');
});

test.serial.failing('EC can govern reserve parameter', async t => {
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectParamValue,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);

  const { reserve } = agoricNamesRemotes.instance;
  const { IST } = agoricNamesRemotes.brand;

  t.log('Proposing question using new charter invitation for reserve');
  await governanceDriver.proposeApiCall(
    reserve,
    'burnFeesToReduceShortfall',
    [{ brand: IST, value: 1000n }],
    newCommittee[0],
    getQuestionId(6),
    offerIds.propose.incoming,
  );

  expectProposalAccepted(t, newCommittee[0], getQuestionId(6));

  t.log('Voting on question using first 2 wallets');
  await governanceDriver.enactLatestProposal(
    newCommittee.slice(0, 2),
    getVoteId(6),
    offerIds.vote.incoming,
  );
  expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(6));

  t.log('no oracle invitation should exist before vote passing');
  const oracleInvitation =
    await governanceDriver.ecMembers[0].findOracleInvitation();
  t.is(oracleInvitation, undefined);

  t.log('Checking params before passing proposal');
  expectParamValue(t, reserveParamsKey, 0n, ['totalFeeBurned', 'value']);

  t.log('Waiting for period to end');
  await advanceTimeBy(1, 'minutes');

  t.log('Verifying outcome');
  const lastOutcome = await governanceDriver.getLatestOutcome();
  t.assert(lastOutcome.outcome === 'win');

  expectParamValue(t, reserveParamsKey, 1000n, ['totalFeeBurned', 'value']);
});

test.serial.failing('EC can govern psm parameter', async t => {
  const {
    advanceTimeBy,
    agoricNamesRemotes,
    expectParamValue,
    expectProposalAccepted,
    expectVoteAccepted,
    governanceDriver,
  } = t.context;
  const newCommittee = governanceDriver.ecMembers.slice(0, 3);

  const { IST } = agoricNamesRemotes.brand;

  const psmInstances = Object.keys(agoricNamesRemotes.instance)
    .map(instance => {
      const regex = /^psm-IST-(?<brand>.*)$/;
      return regex.exec(instance);
    })
    .filter(instance => instance !== null);

  await null;
  for (const instance of psmInstances) {
    const brand = instance.groups?.brand;
    const instanceName = instance[0];
    t.log('Proposing question using new charter invitation for', instanceName);
    await governanceDriver.proposeParams(
      agoricNamesRemotes.instance[instanceName],
      { MintLimit: { brand: IST, value: 100_000_000n } },
      { paramPath: { key: 'governedParams' } },
      newCommittee[0],
      getQuestionId(instanceName),
      offerIds.propose.incoming,
    );

    expectProposalAccepted(t, newCommittee[0], getQuestionId(instanceName));

    t.log('Voting on question using first 2 wallets');
    await governanceDriver.enactLatestProposal(
      newCommittee.slice(0, 2),
      getVoteId(instanceName),
      offerIds.vote.incoming,
    );
    expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(instanceName));

    t.log('Waiting for period to end');
    await advanceTimeBy(1, 'minutes');

    t.log('Verifying outcome');
    const lastOutcome = await governanceDriver.getLatestOutcome();
    expectParamValue(t, getPsmKey(brand), 100_000_000n, [
      'current',
      'MintLimit',
      'value',
      'value',
    ]);
    t.assert(lastOutcome.outcome === 'win');
  }
});

test.serial.failing(
  'EC can make calls to price feed governed APIs',
  async t => {
    const {
      advanceTimeBy,
      agoricNamesRemotes,
      expectProposalAccepted,
      expectVoteAccepted,
      governanceDriver,
    } = t.context;
    const newCommittee = governanceDriver.ecMembers.slice(0, 3);

    const priceFeedInstances = Object.keys(agoricNamesRemotes.instance).filter(
      instance => {
        const regex = /^(.*)-(.*) price feed$/;
        return regex.exec(instance);
      },
    );

    await null;
    for (const instanceName of priceFeedInstances) {
      t.log(
        'Proposing question using new charter invitation for',
        instanceName,
      );
      await governanceDriver.proposeApiCall(
        agoricNamesRemotes.instance[instanceName],
        'addOracles',
        [[wallets[0]]],
        newCommittee[0],
        getQuestionId(instanceName),
        offerIds.propose.incoming,
      );

      expectProposalAccepted(t, newCommittee[0], getQuestionId(instanceName));

      t.log('Voting on question using first 2 wallets');
      await governanceDriver.enactLatestProposal(
        newCommittee.slice(0, 2),
        getVoteId(instanceName),
        offerIds.vote.incoming,
      );
      expectVoteAccepted(t, newCommittee.slice(0, 2), getVoteId(instanceName));

      t.log('no oracle invitation should exist before vote passing');
      const oracleInvitation =
        await governanceDriver.ecMembers[0].findOracleInvitation();
      t.is(oracleInvitation, undefined);

      t.log('Waiting for period to end');
      await advanceTimeBy(1, 'minutes');

      t.log('Verifying outcome');
      const lastOutcome = await governanceDriver.getLatestOutcome();
      t.assert(lastOutcome.outcome === 'win');

      const oracleInvitationAfterProposal =
        await governanceDriver.ecMembers[0].findOracleInvitation();
      t.is(passStyleOf(oracleInvitationAfterProposal), 'copyRecord');
    }
  },
);
