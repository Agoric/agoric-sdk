// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { buildRootObject as buildPSMRootObject } from '@agoric/vats/src/core/boot-psm.js';
import '@agoric/vats/src/core/types.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import {
  mockDProxy,
  mockPsmBootstrapArgs,
} from '@agoric/vats/tools/boot-test-utils.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/far';
import { makeDefaultTestContext } from './contexts.js';
import { coalesceUpdates } from '../src/utils.js';

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
    economicCommitteeAddresses: [committeeAddress],
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

test('null swap', async t => {
  const { anchor } = t.context;
  const { agoricNames, board } = await E.get(t.context.consume);
  const publishingMarshal = await E(board).getPublishingMarshaller();
  const minted = await E(agoricNames).lookup('brand', 'IST');

  const wallet = await t.context.simpleProvideWallet('agoric1nullswap');
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const offersFacet = wallet.getOffersFacet();

  const psmInstance = await E(agoricNames).lookup('instance', 'psm');

  /** @type {import('../src/invitations.js').ContractInvitationSpec} */
  const invitationSpec = {
    source: 'contract',
    instance: psmInstance,
    publicInvitationMaker: 'makeGiveStableInvitation',
  };
  /** @type {import('../src/offers').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec,
    proposal: {
      // empty amounts
      give: { In: AmountMath.makeEmpty(minted) },
      want: { Out: anchor.makeEmpty() },
    },
  };
  /** @type {import('../src/types').WalletCapData<import('../src/offers').OfferSpec>} */
  // @ts-expect-error cast
  const offerCapData = publishingMarshal.serialize(harden(offerSpec));

  // let promises settle to notify brands and create purses
  await eventLoopIteration();

  offersFacet.executeOffer(offerCapData);
  await eventLoopIteration();

  t.is(purseBalance(computedState, anchor.brand), 0n);
  t.is(purseBalance(computedState, minted), 0n);

  // success if nothing threw
  t.pass();
});

// we test this direciton of swap because wanting anchor would require the PSM to have anchor in it first
test('want stable', async t => {
  const { anchor } = t.context;
  const { agoricNames, board } = await E.get(t.context.consume);

  // no fees when wanting stable
  const swapSize = 10_000n;

  t.log('Start the PSM to ensure brands are registered');
  const psmInstance = await E(agoricNames).lookup('instance', 'psm');
  const stableBrand = await E(agoricNames).lookup('brand', Stable.symbol);

  const wallet = await t.context.simpleProvideWallet('agoric1wantstable');
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());

  const offersFacet = wallet.getOffersFacet();
  // let promises settle to notify brands and create purses
  await eventLoopIteration();

  t.is(purseBalance(computedState, anchor.brand), 0n);

  t.log('Fund the wallet');
  assert(anchor.mint);
  const payment = anchor.mint.mintPayment(anchor.make(swapSize));
  await wallet.getDepositFacet().receive(payment, payment.getAllegedBrand());

  t.log('Prepare the swap');

  /** @type {import('../src/invitations.js').ContractInvitationSpec} */
  const invitationSpec = {
    source: 'contract',
    instance: psmInstance,
    publicInvitationMaker: 'makeWantStableInvitation',
  };
  const marshaller = await E(board).getPublishingMarshaller();
  /** @type {import('../src/offers').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec,
    proposal: {
      // empty amounts
      give: { In: anchor.make(swapSize) },
    },
  };
  /** @type {import('../src/types').WalletCapData<import('../src/offers').OfferSpec>} */
  // @ts-expect-error cast
  const offerCapData = marshaller.serialize(harden(offerSpec));

  t.log('Execute the swap');
  offersFacet.executeOffer(offerCapData);
  await eventLoopIteration();
  t.is(purseBalance(computedState, anchor.brand), 0n);
  t.is(purseBalance(computedState, stableBrand), swapSize - 1n);
});

test('govern offerFilter', async t => {
  const {
    agoricNames,
    board,
    economicCommitteeCreatorFacet,
    psmGovernorCreatorFacet,
    zoe,
  } = await E.get(t.context.consume);

  const wallet = await t.context.simpleProvideWallet(committeeAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const offersFacet = wallet.getOffersFacet();

  const psmInstance = await E(agoricNames).lookup('instance', 'psm');

  t.log('Deposit voter invitation into wallet');
  {
    const invitations = await E(
      economicCommitteeCreatorFacet,
    ).getVoterInvitations();
    const voterInvitation = await invitations[0];
    t.assert(
      await E(E(zoe).getInvitationIssuer()).isLive(voterInvitation),
      'invalid invitation',
    );
    wallet
      .getDepositFacet()
      .receive(voterInvitation, voterInvitation.getAllegedBrand());
  }

  t.log('Set up question');
  const binaryVoteCounterInstallation = await E(agoricNames).lookup(
    'installation',
    'binaryVoteCounter',
  );
  const { details } = await E(psmGovernorCreatorFacet).voteOnOfferFilter(
    binaryVoteCounterInstallation,
    2n,
    harden(['wantStable']),
  );
  const { positions, questionHandle } = await details;
  const yesFilterOffers = positions[0];

  const marshaller = await E(board).getPublishingMarshaller();

  t.log('Prepare offer to voting invitation in purse');
  {
    /** @type {import('../src/invitations.js').PurseInvitationSpec} */
    const invitationSpec = {
      source: 'purse',
      instance: psmInstance, // FIXME ignored
      description: 'Voter0',
    };
    /** @type {import('../src/offers').OfferSpec} */
    const offerSpec = {
      id: 33,
      invitationSpec,
      proposal: {},
    };
    /** @type {import('../src/types').WalletCapData<import('../src/offers').OfferSpec>} */
    // @ts-expect-error cast
    const offerCapData = marshaller.serialize(harden(offerSpec));
    t.log('Execute offer for the invitation');
    offersFacet.executeOffer(offerCapData);
  }

  t.log('Prepare offer to continue invitation');
  {
    /** @type {import('../src/invitations.js').ContinuingInvitationSpec} */
    const invitationSpec = {
      source: 'continuing',
      previousOffer: 33,
      invitationMakerName: 'makeVoteInvitation',
      invitationArgs: [questionHandle],
    };
    /** @type {import('../src/offers').OfferSpec} */
    const offerSpec = {
      id: 44,
      invitationSpec,
      offerArgs: { positions: [yesFilterOffers] },
      proposal: {},
    };
    /** @type {import('../src/types').WalletCapData<import('../src/offers').OfferSpec>} */
    // @ts-expect-error cast
    const offerCapData = marshaller.serialize(harden(offerSpec));

    // wait for the previousOffer result to get into the purse
    await eventLoopIteration();
    offersFacet.executeOffer(offerCapData);
  }

  t.log('Make sure vote happened');
  await eventLoopIteration();
  const status = computedState.offerStatuses[44];
  t.like(status, {
    id: 44,
    state: 'paid',
    result: { chosen: { strings: ['wantStable'] }, shares: 1n },
  });
});

test.todo('bad offer schema');
test.todo('not enough funds');
test.todo(
  'a faulty issuer that never returns and additional offers can still flow',
);
