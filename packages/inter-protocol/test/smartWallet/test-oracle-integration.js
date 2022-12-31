import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { NonNullish } from '@agoric/assert';
import { buildRootObject } from '@agoric/vats/src/core/boot-psm.js';
import '@agoric/vats/src/core/types.js';
import {
  mockDProxy,
  mockPsmBootstrapArgs,
} from '@agoric/vats/tools/boot-test-utils.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/far';

import { coalesceUpdates } from '@agoric/smart-wallet/src/utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { INVITATION_MAKERS_DESC } from '../../src/priceAggregatorChainlink.js';
import { ensureOracleBrands } from '../../src/proposals/price-feed-proposal.js';
import { headValue } from '../supports.js';
import { makeDefaultTestContext } from './contexts.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>
 * & {consume: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']}>
 * }
 */
const test = anyTest;

const operatorAddress = 'oracleTestAddress';

const makeTestSpace = async log => {
  const psmParams = {
    anchorAssets: [{ denom: 'ibc/usdc1234', keyword: 'AUSD' }],
    economicCommitteeAddresses: {
      /* empty */
    },
    argv: { bootMsg: {} },
  };

  const psmVatRoot = await buildRootObject(
    {
      logger: log,
      D: mockDProxy,
    },
    psmParams,
  );
  psmVatRoot.bootstrap(...mockPsmBootstrapArgs(log));

  // TODO mimic the proposals and manifest of price-feed-proposal and price-feed-core
  // calling ensureOracleBrands and createPriceFeed
  // ensuring a feed for ATOM-USD

  // @ts-expect-error cast
  const space = /** @type {ChainBootstrapSpace} */ (
    psmVatRoot.getPromiseSpace()
  );
  await eventLoopIteration();

  const timer = buildManualTimer(log);
  space.produce.chainTimerService.resolve(timer);

  /** @type {import('@agoric/inter-protocol/src/proposals/price-feed-proposal.js').PriceFeedOptions} */
  const priceFeedOptions = {
    IN_BRAND_NAME: 'ATOM',
    IN_BRAND_DECIMALS: '6',
    OUT_BRAND_NAME: 'USD',
    OUT_BRAND_DECIMALS: '6',
  };

  await ensureOracleBrands(space, {
    options: { priceFeedOptions },
  });
  await eventLoopIteration();

  return space;
};

test.before(async t => {
  // @ts-expect-error cast
  t.context = await makeDefaultTestContext(t, makeTestSpace);
});

test('admin price', async t => {
  const { agoricNames, zoe } = t.context.consume;

  const wallet = await t.context.simpleProvideWallet(operatorAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const currentSub = E(wallet).getCurrentSubscriber();

  await t.context.simpleCreatePriceFeed([operatorAddress], 'ATOM', 'USD');

  const offersFacet = wallet.getOffersFacet();

  /** @type {import('@agoric/zoe/src/zoeService/utils.js').Instance<import('@agoric/inter-protocol/src/priceAggregatorChainlink.js').start>} */
  const priceAggregator = await E(agoricNames).lookup(
    'instance',
    'ATOM-USD price feed',
  );
  const paPublicFacet = await E(zoe).getPublicFacet(priceAggregator);

  /**
   * get invitation details the way a user would
   *
   * @param {string} desc
   * @param {number} len
   * @param {any} balances XXX please improve this
   * @returns {Promise<[{description: string, instance: Instance}]>}
   */
  const getInvitationFor = async (desc, len, balances) => {
    /** @type {Amount<'set'>} */
    const invitationsAmount = NonNullish(
      balances.get(t.context.invitationBrand),
    );
    t.is(invitationsAmount?.value.length, len);
    // @ts-expect-error TS can't tell that it's going to satisfy the @returns.
    return invitationsAmount.value.filter(i => i.description === desc);
  };

  const proposeInvitationDetails = await getInvitationFor(
    INVITATION_MAKERS_DESC,
    1,
    computedState.balances,
  );

  t.is(proposeInvitationDetails[0].description, INVITATION_MAKERS_DESC);
  t.is(
    proposeInvitationDetails[0].instance,
    priceAggregator,
    'priceAggregator',
  );

  // The purse has the invitation to get the makers ///////////

  /** @type {import('@agoric/smart-wallet/src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: priceAggregator,
    description: INVITATION_MAKERS_DESC,
  };

  /** @type {import('@agoric/smart-wallet/src/offers').OfferSpec} */
  const invMakersOffer = {
    id: 44,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(invMakersOffer);

  /** @type {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */
  const currentState = await headValue(currentSub);
  t.deepEqual(Object.keys(currentState.offerToUsedInvitation), ['44']);
  t.is(
    currentState.offerToUsedInvitation[44].value[0].description,
    INVITATION_MAKERS_DESC,
  );

  // Push a new price result /////////////////////////

  /** @type {import('@agoric/inter-protocol/src/roundsManager.js').PriceRound} */
  const result = { roundId: 1, unitPrice: 123n };

  /** @type {import('@agoric/smart-wallet/src/invitations.js').ContinuingInvitationSpec} */
  const proposeInvitationSpec = {
    source: 'continuing',
    previousOffer: 44,
    invitationMakerName: 'PushPrice',
    invitationArgs: harden([result]),
  };

  /** @type {import('@agoric/smart-wallet/src/offers').OfferSpec} */
  const proposalOfferSpec = {
    id: 45,
    invitationSpec: proposeInvitationSpec,
    proposal: {},
  };

  await offersFacet.executeOffer(proposalOfferSpec);
  await eventLoopIteration();

  // Verify price result

  const manualTimer = /** @type {ManualTimer} */ (
    t.context.consume.chainTimerService
  );
  // trigger an aggregation (POLL_INTERVAL=1n in context)
  E(manualTimer).tickN(1);

  const latestRoundSubscriber = await E(paPublicFacet).getRoundStartNotifier();

  t.deepEqual((await latestRoundSubscriber.subscribeAfter()).head.value, {
    roundId: 1n,
    startedAt: 0n,
  });
});
