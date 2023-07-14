// @ts-check
import { E } from '@endo/far';

// TODO: set these bundle-ids to the revised code
const bundleIDs = {
  vaultFactory:
    '84f4ecca276705b9695afb866844cb6c4e3b07fce785601c38a6dfef0452b55b25a285d3536e6aa19cc7dce70d52a3ea6ec07556e74bb8bf985e09513973c6e8',
  auctioneer:
    'e85289898e66e0423d7ec1c402ac2ced21573f93cf599d593a0533a1e2355ace624cc95c8c8c18c66d44a921511642e87837accd0e728427c269936b040bb886',
};

const START_FREQUENCY = 'StartFrequency';
/** in seconds, how often to reduce the price */
const CLOCK_STEP = 'ClockStep';
/** discount or markup for starting price in basis points. 9999 = 1bp discount */
const STARTING_RATE_BP = 'StartingRate';
/** A limit below which the price will not be discounted. */
const LOWEST_RATE_BP = 'LowestRate';
/** amount to reduce prices each time step in bp, as % of the start price */
const DISCOUNT_STEP_BP = 'DiscountStep';
/**
 * VaultManagers liquidate vaults at a frequency configured by START_FREQUENCY.
 * Auctions start this long after the hour to give vaults time to finish.
 */
const AUCTION_START_DELAY = 'AuctionStartDelay';

const ParamTypes = /** @type {const} */ ({
  AMOUNT: 'amount',
  BRAND: 'brand',
  INSTALLATION: 'installation',
  INSTANCE: 'instance',
  INVITATION: 'invitation',
  NAT: 'nat',
  RATIO: 'ratio',
  STRING: 'string',
  PASSABLE_RECORD: 'record',
  TIMESTAMP: 'timestamp',
  RELATIVE_TIME: 'relativeTime',
  UNKNOWN: 'unknown',
});

/**
 * @param {AuctionParams} initial
 */
const makeAuctioneerParams = ({
  ElectorateInvitationAmount,
  StartFrequency,
  ClockStep,
  LowestRate,
  StartingRate,
  DiscountStep,
  AuctionStartDelay,
  PriceLockPeriod,
  TimerBrand,
}) => {
  return harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: ElectorateInvitationAmount,
    },
    [START_FREQUENCY]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.coerceRelativeTimeRecord(StartFrequency, TimerBrand),
    },
    [CLOCK_STEP]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.coerceRelativeTimeRecord(ClockStep, TimerBrand),
    },
    [AUCTION_START_DELAY]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.coerceRelativeTimeRecord(AuctionStartDelay, TimerBrand),
    },
    [PRICE_LOCK_PERIOD]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.coerceRelativeTimeRecord(PriceLockPeriod, TimerBrand),
    },
    [STARTING_RATE_BP]: { type: ParamTypes.NAT, value: StartingRate },
    [LOWEST_RATE_BP]: { type: ParamTypes.NAT, value: LowestRate },
    [DISCOUNT_STEP_BP]: { type: ParamTypes.NAT, value: DiscountStep },
  });
};
harden(makeAuctioneerParams);

/**
 * See packages/inter-protocol/src/auction/params.js
 *
 * @param {{storageNode: ERef<StorageNode>, marshaller: ERef<Marshaller>}} caps
 * @param {ERef<Timer>} timer
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {ERef<AssetReservePublicFacet>} reservePublicFacet
 * @param {import('../../src/auction/params').AuctionParams} params
 */
const makeGovernedATerms = (
  { storageNode: _storageNode, marshaller: _marshaller },
  timer,
  priceAuthority,
  reservePublicFacet,
  params,
) => {
  // XXX  use storageNode and Marshaller
  return harden({
    priceAuthority,
    reservePublicFacet,
    timerService: timer,
    governedParams: makeAuctioneerParams(params),
  });
};
harden(makeGovernedATerms);

export const SECONDS_PER_MINUTE = 60n;
const SECONDS_PER_HOUR = 60n * 60n;
const auctionParams = {
  StartFrequency: 1n * SECONDS_PER_HOUR,
  ClockStep: 3n * SECONDS_PER_MINUTE,
  StartingRate: 10500n,
  LowestRate: 6500n,
  DiscountStep: 500n,
  AuctionStartDelay: 2n,
  PriceLockPeriod: SECONDS_PER_HOUR / 2n,
};

/** @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers} permittedPowers */
const switchAuctioneer = async permittedPowers => {
  const {
    consume: {
      auctioneerKit: auctioneerKitP,
      chainTimerService,
      contractKits: contractKitsP,
      priceAuthority,
      vaultFactoryKit,
      zoe,
      startGovernedUpgradable,
    },
    instance: {
      produce: { auctioneer: auctionInstance },
      consume: { reserve: reserveInstance },
    },
    issuer: {
      consume: { IST: stableIssuerP },
    },
  } = permittedPowers;

  const oldAuctionKit = await auctioneerKitP;
  // install auctioneer code and start a new instance, and save results
  const installation = await E(zoe).installBundleID(
    bundleIDs.auctioneer,
    'auctioneer',
  );
  const reservePublicFacet = await E(zoe).getPublicFacet(reserveInstance);
  const timerBrand = await E(chainTimerService).getTimerBrand();

  const electorateInvitationAmount = await E(
    E(zoe).getInvitationIssuer(),
  ).getAmountOf(oldAuctionKit.privateArgs.initialPoserInvitation);

  await E(startGovernedUpgradable)({
    governedParams: {}, // TODO
    installation,
    label: 'auctioneer',
    // @ts-expect-error cast XXX missing from type
    privateArgs: oldAuctionKit.privateArgs,
    terms: makeGovernedATerms(
      // @ts-expect-error not used
      {},
      chainTimerService,
      priceAuthority,
      reservePublicFacet,
      {
        ...auctionParams,
        ElectorateInvitationAmount: electorateInvitationAmount,
        TimerBrand: timerBrand,
      },
    ),
    issuerKeywordRecord: { Bid: stableIssuer },
  });

  // TODO: needs to be governed
  // TODO: auctioneer contract terms
  const auctioneerKit = await E(zoe).startInstance(
    installation,
    {},
    undefined,
    'auctioneer',
  );
  const contractKits = await contractKitsP;
  contractKits.init(
    auctioneerKit.instance,
    harden({
      ...auctioneerKit,
      label: 'auctioneer',
    }),
  );

  // TODO: what to do about the old auctioneer?

  // upgrade the vaultFactory
  const vfKit = await vaultFactoryKit;

  /** @type {import('../../src/vaultFactory/vaultFactory').VaultFactoryContract['privateArgs']} */
  const vfPrivate = harden({
    // @ts-expect-error cast XXX missing from type
    ...vfKit.privateArgs,
    auctioneerPublicFacet: auctioneerKit.publicFacet,
  });
  const stuff = await E(vfKit.adminFacet).upgradeContract(
    bundleIDs.vaultFactory,
    vfPrivate,
  );
  console.log('upgraded vaultVactory', stuff);
};

switchAuctioneer;
