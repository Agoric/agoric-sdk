// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { buildRootObject as buildPSMRootObject } from '@agoric/vats/src/core/boot-psm.js';
import '@agoric/vats/src/core/types.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import {
  mockDProxy,
  mockPsmBootstrapArgs,
} from '@agoric/vats/tools/boot-test-utils.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/far';
import { INVITATION_MAKERS_DESC } from '@agoric/inter-protocol/src/psm/psmCharter.js';
import { NonNullish } from '@agoric/assert';

import { coalesceUpdates } from '../src/utils.js';
import { makeDefaultTestContext } from './contexts.js';
import { headValue, withAmountUtils } from './supports.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>
 * & {consume: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']}>
 * }
 */
const test = anyTest;

const committeeAddress = 'psmTestAddress';

const makePsmTestSpace = async log => {
  const psmParams = {
    anchorAssets: [{ denom: 'ibc/usdc1234', keyword: 'AUSD' }],
    economicCommitteeAddresses: { aMember: committeeAddress },
    argv: { bootMsg: {} },
  };

  const psmVatRoot = await buildPSMRootObject(
    {
      logger: log,
      D: mockDProxy,
    },
    psmParams,
  );
  psmVatRoot.bootstrap(...mockPsmBootstrapArgs(log));

  // @ts-expect-error cast
  return /** @type {ChainBootstrapSpace} */ (psmVatRoot.getPromiseSpace());
};

test.before(async t => {
  // @ts-expect-error cast
  t.context = await makeDefaultTestContext(t, makePsmTestSpace);
});

/**
 * @param {Awaited<ReturnType<typeof coalesceUpdates>>} state
 * @param {Brand<'nat'>} brand
 */
const purseBalance = (state, brand) => {
  const balances = Array.from(state.balances.values());
  const match = balances.find(b => b.brand === brand);
  if (!match) {
    console.debug('balances', ...balances);
    assert.fail(`${brand} not found in record`);
  }
  return match.value;
};
/**
 * @param {import('../src/smartWallet.js').CurrentWalletRecord} record
 * @param {Brand<'nat'>} brand
 */
const currentPurseBalance = (record, brand) => {
  const purses = Array.from(record.purses.values());
  const match = purses.find(b => b.brand === brand);
  if (!match) {
    console.debug('purses', ...purses);
    assert.fail(`${brand} not found in record`);
  }
  return match.balance.value;
};

test('null swap', async t => {
  const { anchor } = t.context;
  const { agoricNames } = await E.get(t.context.consume);
  const mintedBrand = await E(agoricNames).lookup('brand', 'IST');

  const wallet = await t.context.simpleProvideWallet('agoric1nullswap');
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const offersFacet = wallet.getOffersFacet();

  const psmInstance = await E(agoricNames).lookup('instance', 'psm-IST-AUSD');

  /** @type {import('../src/invitations.js').ContractInvitationSpec} */
  const invitationSpec = {
    source: 'contract',
    instance: psmInstance,
    publicInvitationMaker: 'makeGiveMintedInvitation',
  };
  /** @type {import('../src/offers').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec,
    proposal: {
      // empty amounts
      give: { In: AmountMath.makeEmpty(mintedBrand) },
      want: { Out: anchor.makeEmpty() },
    },
  };

  // let promises settle to notify brands and create purses
  await eventLoopIteration();

  await offersFacet.executeOffer(offerSpec);
  await eventLoopIteration();

  t.is(purseBalance(computedState, anchor.brand), 0n);
  t.is(purseBalance(computedState, mintedBrand), 0n);

  // success if nothing threw
  t.pass();
});

// we test this direciton of swap because wanting anchor would require the PSM to have anchor in it first
test('want stable', async t => {
  const { anchor } = t.context;
  const { agoricNames } = await E.get(t.context.consume);

  const swapSize = 10_000n;

  t.log('Start the PSM to ensure brands are registered');
  const psmInstance = await E(agoricNames).lookup('instance', 'psm-IST-AUSD');
  const stableBrand = await E(agoricNames).lookup('brand', Stable.symbol);

  const wallet = await t.context.simpleProvideWallet('agoric1wantstable');
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const currentSub = E(wallet).getCurrentSubscriber();

  const offersFacet = wallet.getOffersFacet();
  t.assert(offersFacet, 'undefined offersFacet');
  // let promises settle to notify brands and create purses
  await eventLoopIteration();

  t.is(purseBalance(computedState, anchor.brand), 0n);
  t.like(await headValue(currentSub), { lastOfferId: 0 });

  t.log('Fund the wallet');
  assert(anchor.mint);
  const payment = anchor.mint.mintPayment(anchor.make(swapSize));
  // @ts-expect-error deposit does take a FarRef<Payment>
  await wallet.getDepositFacet().receive(payment);

  t.log('Prepare the swap');

  /** @type {import('../src/invitations.js').ContractInvitationSpec} */
  const invitationSpec = {
    source: 'contract',
    instance: psmInstance,
    publicInvitationMaker: 'makeWantMintedInvitation',
  };
  /** @type {import('../src/offers').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec,
    proposal: {
      give: { In: anchor.make(swapSize) },
      want: {},
    },
  };

  t.log('Execute the swap');
  await offersFacet.executeOffer(offerSpec);
  await eventLoopIteration();
  t.is(purseBalance(computedState, anchor.brand), 0n);
  t.is(purseBalance(computedState, stableBrand), swapSize); // assume 0% fee

  const currentState = await headValue(currentSub);
  t.like(currentState, { lastOfferId: 1 });
});

test('govern offerFilter', async t => {
  const { anchor, invitationBrand } = t.context;
  const { agoricNames, psmFacets, zoe } = await E.get(t.context.consume);

  const { psm: psmInstance } = await E(psmFacets).get(anchor.brand);

  const wallet = await t.context.simpleProvideWallet(committeeAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const currentSub = E(wallet).getCurrentSubscriber();

  const offersFacet = wallet.getOffersFacet();

  const psmCharter = await E(agoricNames).lookup('instance', 'psmCharter');
  const economicCommittee = await E(agoricNames).lookup(
    'instance',
    'economicCommittee',
  );
  await eventLoopIteration();

  /**
   * get invitation details the way a user would
   *
   * @param {string} desc
   * @param {number} len
   * @param {any} balances XXX please improve this
   * @returns {Promise<[{description: string, instance: Instance}]>}
   */
  const getInvitationFor = async (desc, len, balances) =>
    // @ts-expect-error TS can't tell that it's going to satisfy the @returns.
    E(E(zoe).getInvitationIssuer())
      .getBrand()
      .then(brand => {
        /** @type {Amount<'set'>} */
        const invitationsAmount = NonNullish(balances.get(brand));
        t.is(invitationsAmount?.value.length, len);
        return invitationsAmount.value.filter(i => i.description === desc);
      });

  const proposeInvitationDetails = await getInvitationFor(
    INVITATION_MAKERS_DESC,
    2,
    computedState.balances,
  );

  t.is(proposeInvitationDetails[0].description, INVITATION_MAKERS_DESC);
  t.is(proposeInvitationDetails[0].instance, psmCharter, 'psmCharter');
  t.is(
    // @ts-expect-error cast amount kind
    currentPurseBalance(await headValue(currentSub), invitationBrand).length,
    2,
    'two invitations deposited',
  );

  // The purse has the invitation to get the makers ///////////

  /** @type {import('../src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: psmCharter,
    description: INVITATION_MAKERS_DESC,
  };

  /** @type {import('../src/offers').OfferSpec} */
  const invMakersOffer = {
    id: 44,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(invMakersOffer);

  /** @type {import('../src/smartWallet.js').CurrentWalletRecord} */
  let currentState = await headValue(currentSub);
  t.is(
    // @ts-expect-error cast amount kind
    currentPurseBalance(currentState, invitationBrand).length,
    1,
    'one invitation consumed, one left',
  );
  t.deepEqual(Object.keys(currentState.offerToUsedInvitation), ['44']);
  t.is(
    currentState.offerToUsedInvitation[44].value[0].description,
    'PSM charter member invitation',
  );

  // Call for a vote ////////////////////////////////

  /** @type {import('../src/invitations.js').ContinuingInvitationSpec} */
  const proposeInvitationSpec = {
    source: 'continuing',
    previousOffer: 44,
    invitationMakerName: 'VoteOnPauseOffers',
    invitationArgs: harden([psmInstance, ['wantStable'], 2n]),
  };

  /** @type {import('../src/offers').OfferSpec} */
  const proposalOfferSpec = {
    id: 45,
    invitationSpec: proposeInvitationSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(proposalOfferSpec);
  await eventLoopIteration();

  // vote /////////////////////////

  const committeePublic = E(zoe).getPublicFacet(economicCommittee);
  const questions = await E(committeePublic).getOpenQuestions();
  const question = E(committeePublic).getQuestion(questions[0]);
  const { positions, issue, electionType, questionHandle } = await E(
    question,
  ).getDetails();
  t.is(electionType, 'offer_filter');
  const yesPosition = harden([positions[0]]);
  t.deepEqual(issue.strings, ['wantStable']);
  t.deepEqual(yesPosition, [{ strings: ['wantStable'] }]);

  const voteInvitationDetails = await getInvitationFor(
    'Voter0',
    1,
    computedState.balances,
  );
  t.is(voteInvitationDetails.length, 1);
  const voteInvitationDetail = voteInvitationDetails[0];
  t.is(voteInvitationDetail.description, 'Voter0');
  t.is(voteInvitationDetail.instance, economicCommittee);

  /** @type {import('../src/invitations.js').PurseInvitationSpec} */
  const getCommitteeInvMakersSpec = {
    source: 'purse',
    instance: economicCommittee,
    description: 'Voter0',
  };

  /** @type {import('../src/offers').OfferSpec} */
  const committeeInvMakersOffer = {
    id: 46,
    invitationSpec: getCommitteeInvMakersSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(committeeInvMakersOffer);
  currentState = await headValue(currentSub);
  t.is(
    // @ts-expect-error cast amount kind
    currentPurseBalance(currentState, invitationBrand).length,
    0,
    'last invitation consumed, none left',
  );
  t.deepEqual(Object.keys(currentState.offerToUsedInvitation), ['44', '46']);
  // 44 tested above
  t.is(currentState.offerToUsedInvitation[46].value[0].description, 'Voter0');

  /** @type {import('../src/invitations.js').ContinuingInvitationSpec} */
  const getVoteSpec = {
    source: 'continuing',
    previousOffer: 46,
    invitationMakerName: 'makeVoteInvitation',
    invitationArgs: harden([yesPosition, questionHandle]),
  };

  /** @type {import('../src/offers').OfferSpec} */
  const voteOffer = {
    id: 47,
    invitationSpec: getVoteSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(voteOffer);
  await eventLoopIteration();

  t.is(offersFacet.getLastOfferId(), 47);
  // can't advance the clock, so the vote won't close. Call it enuf that the
  // vote didn't raise an error.
});

test('deposit unknown brand', async t => {
  const rial = withAmountUtils(makeIssuerKit('rial'));
  assert(rial.mint);

  const wallet = await t.context.simpleProvideWallet('agoric1queue');

  const payment = rial.mint.mintPayment(rial.make(1_000n));
  // @ts-expect-error deposit does take a FarRef<Payment>
  const result = await wallet.getDepositFacet().receive(harden(payment));
  // successful request but not deposited
  t.deepEqual(result, { brand: rial.brand, value: 0n });
});

test.todo('bad offer schema');
test.todo('not enough funds');
test.todo(
  'a faulty issuer that never returns and additional offers can still flow',
);
