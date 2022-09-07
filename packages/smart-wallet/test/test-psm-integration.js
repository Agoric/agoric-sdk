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
import { NonNullish } from '@agoric/assert';
import { coalesceUpdates } from '../src/utils.js';
import { makeDefaultTestContext } from './contexts.js';

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

  const offersFacet = wallet.getOffersFacet();
  // let promises settle to notify brands and create purses
  await eventLoopIteration();

  t.is(purseBalance(computedState, anchor.brand), 0n);

  t.log('Fund the wallet');
  assert(anchor.mint);
  const payment = anchor.mint.mintPayment(anchor.make(swapSize));
  await wallet.getDepositFacet().receive(payment, anchor.brand);

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
  t.is(purseBalance(computedState, stableBrand), swapSize - 1n);
});

test('govern offerFilter', async t => {
  const { anchor } = t.context;
  const { agoricNames, economicCommitteeCreatorFacet, psmFacets, zoe } =
    await E.get(t.context.consume);

  const psmGovernorCreatorFacet = E.get(
    E(psmFacets).get(anchor.brand),
  ).psmGovernorCreatorFacet;

  const wallet = await t.context.simpleProvideWallet(committeeAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const offersFacet = wallet.getOffersFacet();

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

  t.log('Prepare offer to voting invitation in purse');
  {
    // get invitation details the way a user would
    const invitationDetails = await E(E(zoe).getInvitationIssuer())
      .getBrand()
      .then(brand => {
        /** @type {Amount<'set'>} */
        const invitationsAmount = NonNullish(computedState.balances.get(brand));
        t.is(invitationsAmount?.value.length, 1);
        return invitationsAmount.value[0];
      });

    /** @type {import('../src/invitations.js').PurseInvitationSpec} */
    const invitationSpec = {
      source: 'purse',
      instance: await E(agoricNames).lookup('instance', 'economicCommittee'),
      description: invitationDetails.description,
    };
    /** @type {import('../src/offers').OfferSpec} */
    const offerSpec = {
      id: 33,
      invitationSpec,
      proposal: {},
    };
    t.log('Execute offer for the invitation');
    await offersFacet.executeOffer(offerSpec);
  }
  await eventLoopIteration();
  t.like(computedState.offerStatuses[33], {
    id: 33,
    numWantsSatisfied: 1,
    // result has invitationMakers, but as a far object it can't be tested with .like()
  });

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

    // wait for the previousOffer result to get into the purse
    await eventLoopIteration();
    await offersFacet.executeOffer(offerSpec);
  }

  t.log('Make sure vote happened');
  await eventLoopIteration();
  t.like(computedState.offerStatuses[44], {
    id: 44,
    result: { chosen: { strings: ['wantStable'] }, shares: 1n },
  });
});

test.todo('bad offer schema');
test.todo('not enough funds');
test.todo(
  'a faulty issuer that never returns and additional offers can still flow',
);
