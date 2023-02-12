/* eslint-disable no-lone-blocks */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { NonNullish } from '@agoric/assert';
import { coalesceUpdates } from '@agoric/smart-wallet/src/utils.js';
import { buildRootObject } from '@agoric/vats/src/core/boot-psm.js';
import '@agoric/vats/src/core/types.js';
import {
  mockDProxy,
  mockPsmBootstrapArgs,
} from '@agoric/vats/tools/boot-test-utils.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { E } from '@endo/far';
import { zip } from '../../src/collect.js';
import { INVITATION_MAKERS_DESC as EC_INVITATION_MAKERS_DESC } from '../../src/econCommitteeCharter.js';
import { INVITATION_MAKERS_DESC as ORACLE_INVITATION_MAKERS_DESC } from '../../src/price/fluxAggregator.js';
import { ensureOracleBrands } from '../../src/proposals/price-feed-proposal.js';
import { headValue } from '../supports.js';
import {
  currentPurseBalance,
  makeDefaultTestContext,
  voteForOpenQuestion,
} from './contexts.js';

/**
 * @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>
 * & {consume: import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers['consume']}>
 * }
 */
const test = anyTest;

const committeeAddress = 'econCommitteeMemberA';

const makeTestSpace = async log => {
  const psmParams = {
    anchorAssets: [{ denom: 'ibc/usdc1234', keyword: 'AUSD' }],
    economicCommitteeAddresses: {
      aMember: committeeAddress,
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

/**
 *
 * @param {import('ava').ExecutionContext<*>} t
 * @param {string[]} oracleAddresses
 */
const setupFeedWithWallets = async (t, oracleAddresses) => {
  const { agoricNames } = t.context.consume;

  const wallets = await Promise.all(
    oracleAddresses.map(addr => t.context.simpleProvideWallet(addr)),
  );

  const oracleWallets = Object.fromEntries(zip(oracleAddresses, wallets));

  await t.context.simpleCreatePriceFeed(oracleAddresses, 'ATOM', 'USD');

  /** @type {import('@agoric/zoe/src/zoeService/utils.js').Instance<import('@agoric/inter-protocol/src/price/fluxAggregatorContract.js').start>} */
  const governedPriceAggregator = await E(agoricNames).lookup(
    'instance',
    'ATOM-USD price feed',
  );

  return { oracleWallets, governedPriceAggregator };
};

let acceptInvitationCounter = 0;
const acceptInvitation = async (wallet, priceAggregator) => {
  acceptInvitationCounter += 1;
  const id = `acceptInvitation${acceptInvitationCounter}`;
  /** @type {import('@agoric/smart-wallet/src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: priceAggregator,
    description: ORACLE_INVITATION_MAKERS_DESC,
  };
  await wallet.getOffersFacet().executeOffer({
    id,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  });
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
  await wallet.getOffersFacet().executeOffer({
    id,
    invitationSpec: proposeInvitationSpec,
    proposal: {},
  });
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
  const { governedPriceAggregator } = await setupFeedWithWallets(t, [
    operatorAddress,
  ]);

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
    ORACLE_INVITATION_MAKERS_DESC,
    1,
    computedState.balances,
  );

  t.is(proposeInvitationDetails[0].description, ORACLE_INVITATION_MAKERS_DESC);
  t.is(
    proposeInvitationDetails[0].instance,
    governedPriceAggregator,
    'priceAggregator',
  );

  // The purse has the invitation to get the makers

  /** @type {import('@agoric/smart-wallet/src/invitations.js').PurseInvitationSpec} */
  const getInvMakersSpec = {
    source: 'purse',
    instance: governedPriceAggregator,
    description: ORACLE_INVITATION_MAKERS_DESC,
  };

  const id = '33';
  await wallet.getOffersFacet().executeOffer({
    id,
    invitationSpec: getInvMakersSpec,
    proposal: {},
  });

  const currentSub = E(wallet).getCurrentSubscriber();
  /** @type {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */
  const currentState = await headValue(currentSub);
  t.deepEqual(Object.keys(currentState.offerToUsedInvitation), [id]);
  t.is(
    currentState.offerToUsedInvitation[id].value[0].description,
    ORACLE_INVITATION_MAKERS_DESC,
  );
});

test.serial('admin price', async t => {
  const operatorAddress = 'adminPriceAddress';
  const { zoe } = t.context.consume;

  const { oracleWallets, governedPriceAggregator } = await setupFeedWithWallets(
    t,
    [operatorAddress],
  );
  const wallet = oracleWallets[operatorAddress];
  const adminOfferId = await acceptInvitation(wallet, governedPriceAggregator);

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

  const paPublicFacet = E(zoe).getPublicFacet(governedPriceAggregator);

  const latestRoundSubscriber = await E(paPublicFacet).getRoundStartNotifier();

  t.deepEqual((await latestRoundSubscriber.subscribeAfter()).head.value, {
    roundId: 1n,
    startedAt: 0n,
  });
});

test.serial('errors', async t => {
  const operatorAddress = 'badInputsAddress';

  const { oracleWallets, governedPriceAggregator: priceAggregator } =
    await setupFeedWithWallets(t, [operatorAddress]);
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
        'Error: In "pushPrice" method of (OracleKit oracle): arg 0: unitPrice: number 1 - Must be a bigint',
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

// test both addOracles and removeOracles in same test to reuse the lengthy EC setup
test.serial('govern oracles list', async t => {
  const { invitationBrand } = t.context;

  const newOracle = 'agoric1OracleB';

  const { agoricNames, zoe } = await E.get(t.context.consume);
  const wallet = await t.context.simpleProvideWallet(committeeAddress);
  const computedState = coalesceUpdates(E(wallet).getUpdatesSubscriber());
  const currentSub = E(wallet).getCurrentSubscriber();

  const offersFacet = wallet.getOffersFacet();

  const econCharter = await E(agoricNames).lookup(
    'instance',
    'econCommitteeCharter',
  );
  /** @type {import('@agoric/zoe/src/zoeService/utils').Instance<import('@agoric/governance/src/committee').start> } */
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
   * @param {{get: (b: Brand) => Amount | undefined}} balances
   * @returns {Promise<[{description: string, instance: Instance}]>}
   */
  const getInvitationFor = async (desc, len, balances) =>
    E(E(zoe).getInvitationIssuer())
      .getBrand()
      .then(brand => {
        /** @type {any} */
        const invitationsAmount = balances.get(brand);
        t.is(invitationsAmount?.value.length, len);
        return invitationsAmount.value.filter(i => i.description === desc);
      });

  const proposeInvitationDetails = await getInvitationFor(
    EC_INVITATION_MAKERS_DESC,
    2,
    computedState.balances,
  );

  t.is(proposeInvitationDetails[0].description, EC_INVITATION_MAKERS_DESC);
  t.is(proposeInvitationDetails[0].instance, econCharter, 'econCharter');
  t.is(
    // @ts-expect-error cast amount kind
    currentPurseBalance(await headValue(currentSub), invitationBrand).length,
    2,
    'two invitations deposited',
  );

  t.log('accept the EC invitation makers');
  {
    /** @type {import('@agoric/smart-wallet/src/invitations').PurseInvitationSpec} */
    const getInvMakersSpec = {
      source: 'purse',
      instance: econCharter,
      description: EC_INVITATION_MAKERS_DESC,
    };

    await offersFacet.executeOffer({
      id: 'acceptEcInvitationOID',
      invitationSpec: getInvMakersSpec,
      proposal: {},
    });

    /** @type {import('@agoric/smart-wallet/src/smartWallet.js').CurrentWalletRecord} */
    let currentState = await headValue(currentSub);
    t.is(
      // @ts-expect-error cast amount kind
      currentPurseBalance(currentState, invitationBrand).length,
      1,
      'one invitation consumed, one left',
    );
    t.deepEqual(Object.keys(currentState.offerToUsedInvitation), [
      'acceptEcInvitationOID',
    ]);
    t.is(
      currentState.offerToUsedInvitation.acceptEcInvitationOID.value[0]
        .description,
      'charter member invitation',
    );
    await offersFacet.executeOffer({
      id: 'acceptVoterOID',
      invitationSpec: {
        source: 'purse',
        instance: economicCommittee,
        description: 'Voter0',
      },
      proposal: {},
    });
    currentState = await headValue(currentSub);
    t.is(
      // @ts-expect-error cast amount kind
      currentPurseBalance(currentState, invitationBrand).length,
      0,
      'last invitation consumed, none left',
    );
    t.deepEqual(Object.keys(currentState.offerToUsedInvitation), [
      'acceptEcInvitationOID',
      'acceptVoterOID',
    ]);
    // 'acceptEcInvitationOID' tested above
    t.is(
      currentState.offerToUsedInvitation.acceptVoterOID.value[0].description,
      'Voter0',
    );
  }

  const feed = await E(agoricNames).lookup('instance', 'ATOM-USD price feed');
  t.assert(feed);

  const committeePublic = E(zoe).getPublicFacet(economicCommittee);
  /** @type {ERef<ManualTimer>} */
  // @ts-expect-error cast mock
  const timer = t.context.consume.chainTimerService;

  t.log('EC addOracles');
  {
    /** @type {import('@agoric/smart-wallet/src/invitations').ContinuingInvitationSpec} */
    const proposeInvitationSpec = {
      source: 'continuing',
      previousOffer: 'acceptEcInvitationOID',
      invitationMakerName: 'VoteOnApiCall',
      invitationArgs: harden([feed, 'addOracles', [[newOracle]], 2n]),
    };

    await offersFacet.executeOffer({
      id: 'proposeAddOracles',
      invitationSpec: proposeInvitationSpec,
      proposal: {},
    });
    await eventLoopIteration();
    await offersFacet.executeOffer({
      id: '',
      invitationSpec: await voteForOpenQuestion(
        committeePublic,
        'acceptVoterOID',
      ),
      proposal: {},
    });
    // pass time to exceed the voting deadline
    await E(timer).tickN(1);
  }

  t.log('accept oracle invitation');
  const oracleWallet = await t.context.simpleProvideWallet(newOracle);
  const oracleWalletComputedState = coalesceUpdates(
    E(oracleWallet).getUpdatesSubscriber(),
  );
  await eventLoopIteration();
  {
    const oracleInvitationDetails = await getInvitationFor(
      ORACLE_INVITATION_MAKERS_DESC,
      1,
      oracleWalletComputedState.balances,
    );
    t.log(oracleInvitationDetails);

    t.is(oracleInvitationDetails[0].description, ORACLE_INVITATION_MAKERS_DESC);
    t.is(oracleInvitationDetails[0].instance, feed, 'matches feed instance');
  }
  const oracleOfferId = await acceptInvitation(oracleWallet, feed);
  t.is(oracleOfferId, 'acceptInvitation3');

  t.log('EC pause');
  {
    await offersFacet.executeOffer({
      id: 'proposePause',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'acceptEcInvitationOID',
        invitationMakerName: 'VoteOnApiCall',
        invitationArgs: harden([feed, 'pause', [], 3n]),
      },
      proposal: {},
    });
    await eventLoopIteration();

    await offersFacet.executeOffer({
      id: 'pauseOID',
      invitationSpec: await voteForOpenQuestion(
        committeePublic,
        'acceptVoterOID',
      ),
      proposal: {},
    });
    // wait for vote to resolve
    await E(timer).tickN(3);
    await eventLoopIteration();
  }

  t.log('verify pause prevents PushPrice');
  {
    const pushPriceOfferId = await pushPrice(oracleWallet, oracleOfferId, {
      roundId: 1,
      unitPrice: 123n,
    });

    const offerStatus =
      oracleWalletComputedState.offerStatuses.get(pushPriceOfferId);
    t.like(offerStatus, {
      id: pushPriceOfferId,
      error: 'Error: cannot PushPrice until unpaused',
    });
  }

  t.log('EC unpause');
  {
    await offersFacet.executeOffer({
      id: 'proposePause',
      invitationSpec: {
        source: 'continuing',
        previousOffer: 'acceptEcInvitationOID',
        invitationMakerName: 'VoteOnApiCall',
        invitationArgs: harden([feed, 'unpause', [], 6n]),
      },
      proposal: {},
    });
    await eventLoopIteration();

    await offersFacet.executeOffer({
      id: 'unpauseOID',
      invitationSpec: await voteForOpenQuestion(
        committeePublic,
        'acceptVoterOID',
      ),
      proposal: {},
    });
    // wait for vote to resolve
    await E(timer).tickN(3);
    await eventLoopIteration();
  }
  t.log('EC removeOracles');
  {
    /** @type {import('@agoric/smart-wallet/src/invitations').ContinuingInvitationSpec} */
    const proposeInvitationSpec = {
      source: 'continuing',
      previousOffer: 'acceptEcInvitationOID',
      invitationMakerName: 'VoteOnApiCall',
      invitationArgs: harden([feed, 'removeOracles', [[newOracle]], 10n]),
    };

    await offersFacet.executeOffer({
      id: 'proposeRemoveOracles',
      invitationSpec: proposeInvitationSpec,
      proposal: {},
    });
    await eventLoopIteration();

    await offersFacet.executeOffer({
      id: 'removeOraclesOID',
      invitationSpec: await voteForOpenQuestion(
        committeePublic,
        'acceptVoterOID',
      ),
      proposal: {},
    });
    // wait for vote to resolve
    await E(timer).tickN(4);
  }

  t.log('verify removed oracle can no longer PushPrice');
  {
    const pushPriceOfferId = await pushPrice(oracleWallet, oracleOfferId, {
      roundId: 1,
      unitPrice: 123n,
    });

    const offerStatus =
      oracleWalletComputedState.offerStatuses.get(pushPriceOfferId);
    t.like(offerStatus, {
      id: pushPriceOfferId,
      error: 'Error: pushPrice for disabled oracle',
    });
  }
});
