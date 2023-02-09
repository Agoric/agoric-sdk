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
import { INVITATION_MAKERS_DESC } from '../../src/price/fluxAggregator.js';
import { ensureOracleBrands } from '../../src/proposals/price-feed-proposal.js';
import { headValue } from '../supports.js';
import { makeDefaultTestContext } from './contexts.js';
import { zip } from '../../src/collect.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>
 * & {consume: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']}>
 * }
 */
const test = anyTest;

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
  void psmVatRoot.bootstrap(...mockPsmBootstrapArgs(log));

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

const setupFeedWithWallets = async (t, oracleAddresses) => {
  const { agoricNames } = t.context.consume;

  const wallets = await Promise.all(
    oracleAddresses.map(addr => t.context.simpleProvideWallet(addr)),
  );

  const oracleWallets = Object.fromEntries(zip(oracleAddresses, wallets));

  await t.context.simpleCreatePriceFeed(oracleAddresses, 'ATOM', 'USD');

  /** @type {import('@agoric/zoe/src/zoeService/utils.js').Instance<import('@agoric/inter-protocol/src/price/fluxAggregator.contract.js').start>} */
  const priceAggregator = await E(agoricNames).lookup(
    'instance',
    'ATOM-USD price feed',
  );

  return { oracleWallets, priceAggregator };
};

let acceptInvitationCounter = 0;
const acceptInvitation = async (wallet, priceAggregator) => {
  acceptInvitationCounter += 1;
  const id = `acceptInvitation${acceptInvitationCounter}`;
  /** @type {import('@agoric/smart-wallet/src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: priceAggregator,
    description: INVITATION_MAKERS_DESC,
  };

  /** @type {import('@agoric/smart-wallet/src/offers').OfferSpec} */
  const invMakersOffer = {
    id,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  };
  await wallet.getOffersFacet().executeOffer(invMakersOffer);
  // wait for it to settle
  await eventLoopIteration();
  return id;
};

let pushPriceCounter = 0;
const pushPrice = async (wallet, adminOfferId, priceRound) => {
  /** @type {import('@agoric/smart-wallet/src/invitations.js').ContinuingInvitationSpec} */
  const proposeInvitationSpec = {
    source: 'continuing',
    previousOffer: adminOfferId,
    invitationMakerName: 'PushPrice',
    invitationArgs: harden([priceRound]),
  };

  pushPriceCounter += 1;
  const id = `pushPrice${pushPriceCounter}`;
  /** @type {import('@agoric/smart-wallet/src/offers').OfferSpec} */
  const proposalOfferSpec = {
    id,
    invitationSpec: proposeInvitationSpec,
    proposal: {},
  };

  await wallet.getOffersFacet().executeOffer(proposalOfferSpec);
  await eventLoopIteration();
  return id;
};

// The tests are serial because they mutate shared state

test.serial('invitations', async t => {
  const operatorAddress = 'agoric1invitationTest';
  const wallet = await t.context.simpleProvideWallet(operatorAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());

  // this returns wallets, but we need the updates subscriber to start before the price feed starts
  // so we provision the wallet earlier above
  const { priceAggregator } = await setupFeedWithWallets(t, [operatorAddress]);

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

  // The purse has the invitation to get the makers

  /** @type {import('@agoric/smart-wallet/src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: priceAggregator,
    description: INVITATION_MAKERS_DESC,
  };

  const id = '33';
  /** @type {import('@agoric/smart-wallet/src/offers').OfferSpec} */
  const invMakersOffer = {
    id,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  };
  await wallet.getOffersFacet().executeOffer(invMakersOffer);

  const currentSub = E(wallet).getCurrentSubscriber();
  /** @type {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */
  const currentState = await headValue(currentSub);
  t.deepEqual(Object.keys(currentState.offerToUsedInvitation), [id]);
  t.is(
    currentState.offerToUsedInvitation[id].value[0].description,
    INVITATION_MAKERS_DESC,
  );
});

test.serial('admin price', async t => {
  const operatorAddress = 'adminPriceAddress';
  const { zoe } = t.context.consume;

  const { oracleWallets, priceAggregator } = await setupFeedWithWallets(t, [
    operatorAddress,
  ]);
  const wallet = oracleWallets[operatorAddress];
  const adminOfferId = await acceptInvitation(wallet, priceAggregator);

  // Push a new price result /////////////////////////

  /** @type {import('@agoric/inter-protocol/src/price/roundsManager.js').PriceRound} */
  const result = { roundId: 1, unitPrice: 123n };

  await pushPrice(wallet, adminOfferId, result);

  // Verify price result

  const manualTimer = /** @type {ManualTimer} */ (
    t.context.consume.chainTimerService
  );
  // trigger an aggregation (POLL_INTERVAL=1n in context)
  await E(manualTimer).tickN(1);

  const paPublicFacet = await E(zoe).getPublicFacet(priceAggregator);

  const latestRoundSubscriber = await E(paPublicFacet).getRoundStartNotifier();

  t.deepEqual((await latestRoundSubscriber.subscribeAfter()).head.value, {
    roundId: 1n,
    startedAt: 0n,
  });
});

test.serial('errors', async t => {
  const operatorAddress = 'badInputsAddress';

  const { oracleWallets, priceAggregator } = await setupFeedWithWallets(t, [
    operatorAddress,
  ]);
  const wallet = oracleWallets[operatorAddress];
  const adminOfferId = await acceptInvitation(wallet, priceAggregator);

  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());

  const walletPushPrice = async priceRound => {
    const offerId = await pushPrice(wallet, adminOfferId, priceRound);
    return computedState.offerStatuses.get(offerId);
  };
  await eventLoopIteration();

  // Invalid priceRound argument
  t.like(
    await walletPushPrice({
      roundId: 1,
      unitPrice: 1,
    }),
    {
      error:
        'Error: In "pushPrice" method of (OracleAdmin): arg 0: unitPrice: number 1 - Must be a bigint',
      // trivially satisfied because the Want is empty
      numWantsSatisfied: 1,
    },
  );
  await eventLoopIteration();

  // Success, round starts
  t.like(
    await walletPushPrice({
      roundId: 1,
      unitPrice: 1n,
    }),
    {
      error: undefined,
      numWantsSatisfied: 1,
    },
  );
  await eventLoopIteration();

  // Invalid attempt to push again to the same round
  t.like(
    await walletPushPrice({
      roundId: 1,
      unitPrice: 1n,
    }),
    {
      error: 'Error: cannot report on previous rounds',
      numWantsSatisfied: 1,
    },
  );
});
