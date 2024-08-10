import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { TimeMath, RelativeTimeRecordShape } from '@agoric/time';
import { M } from '@agoric/store';

/**
 * @import {AsyncSpecTuple} from '@agoric/governance/src/contractGovernance/typedParamManager.js';
 * @import {SyncSpecTuple} from '@agoric/governance/src/contractGovernance/typedParamManager.js';
 * @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js';
 */

// TODO duplicated with zoe/src/TypeGuards.js
export const InvitationShape = M.remotable('Invitation');

/**
 * In seconds, how often to start an auction. The auction will start at
 * AUCTION_START_DELAY seconds after a multiple of START_FREQUENCY, with the
 * price at STARTING_RATE_BP. Every CLOCK_STEP, the price will be reduced by
 * DISCOUNT_STEP_BP, as long as the rate is at or above LOWEST_RATE_BP, or until
 * START_FREQUENCY has elapsed.
 */
export const START_FREQUENCY = 'StartFrequency';
/** in seconds, how often to reduce the price */
export const CLOCK_STEP = 'ClockStep';
/** discount or markup for starting price in basis points. 9999 = 1bp discount */
export const STARTING_RATE_BP = 'StartingRate';
/** A limit below which the price will not be discounted. */
export const LOWEST_RATE_BP = 'LowestRate';
/** amount to reduce prices each time step in bp, as % of the start price */
export const DISCOUNT_STEP_BP = 'DiscountStep';
/**
 * VaultManagers liquidate vaults at a frequency configured by START_FREQUENCY.
 * Auctions start this long after the hour to give vaults time to finish.
 */
export const AUCTION_START_DELAY = 'AuctionStartDelay';

// /////// used by VaultDirector /////////////////////
// time before each auction that the prices are locked.
export const PRICE_LOCK_PERIOD = 'PriceLockPeriod';

export const auctioneerParamPattern = M.splitRecord({
  [CONTRACT_ELECTORATE]: InvitationShape,
  [START_FREQUENCY]: RelativeTimeRecordShape,
  [CLOCK_STEP]: RelativeTimeRecordShape,
  [STARTING_RATE_BP]: M.nat(),
  [LOWEST_RATE_BP]: M.nat(),
  [DISCOUNT_STEP_BP]: M.nat(),
  [AUCTION_START_DELAY]: RelativeTimeRecordShape,
  [PRICE_LOCK_PERIOD]: RelativeTimeRecordShape,
});

export const auctioneerParamTypes = harden({
  [CONTRACT_ELECTORATE]: ParamTypes.INVITATION,
  [START_FREQUENCY]: ParamTypes.RELATIVE_TIME,
  [CLOCK_STEP]: ParamTypes.RELATIVE_TIME,
  [STARTING_RATE_BP]: ParamTypes.NAT,
  [LOWEST_RATE_BP]: ParamTypes.NAT,
  [DISCOUNT_STEP_BP]: ParamTypes.NAT,
  [AUCTION_START_DELAY]: ParamTypes.RELATIVE_TIME,
  [PRICE_LOCK_PERIOD]: ParamTypes.RELATIVE_TIME,
});

/**
 * @typedef {object} AuctionParams
 * @property {Amount<'set'>} ElectorateInvitationAmount
 * @property {RelativeTime} StartFrequency
 * @property {RelativeTime} ClockStep
 * @property {bigint} StartingRate
 * @property {bigint} LowestRate
 * @property {bigint} DiscountStep
 * @property {RelativeTime} AuctionStartDelay
 * @property {RelativeTime} PriceLockPeriod
 * @property {import('@agoric/time').TimerBrand} TimerBrand
 */

/** @param {AuctionParams} initial */
export const makeAuctioneerParams = ({
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
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ZCF} zcf
 * @param {AuctionParams} initial
 */
export const makeAuctioneerParamManager = (publisherKit, zcf, initial) => {
  return makeParamManager(
    publisherKit,
    {
      [CONTRACT_ELECTORATE]: [
        ParamTypes.INVITATION,
        initial[CONTRACT_ELECTORATE],
      ],
      [START_FREQUENCY]: [ParamTypes.RELATIVE_TIME, initial[START_FREQUENCY]],
      [CLOCK_STEP]: [ParamTypes.RELATIVE_TIME, initial[CLOCK_STEP]],
      [STARTING_RATE_BP]: [ParamTypes.NAT, initial[STARTING_RATE_BP]],
      [LOWEST_RATE_BP]: [ParamTypes.NAT, initial[LOWEST_RATE_BP]],
      [DISCOUNT_STEP_BP]: [ParamTypes.NAT, initial[DISCOUNT_STEP_BP]],
      [AUCTION_START_DELAY]: [
        ParamTypes.RELATIVE_TIME,
        initial[AUCTION_START_DELAY],
      ],
      [PRICE_LOCK_PERIOD]: [
        ParamTypes.RELATIVE_TIME,
        initial[PRICE_LOCK_PERIOD],
      ],
    },
    zcf,
  );
};
harden(makeAuctioneerParamManager);

/**
 * @param {{ storageNode: ERef<StorageNode>; marshaller: ERef<Marshaller> }} caps
 * @param {ERef<import('@agoric/time').TimerService>} timer
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {ERef<AssetReservePublicFacet>} reservePublicFacet
 * @param {AuctionParams} params
 */
export const makeGovernedTerms = (
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
harden(makeGovernedTerms);

/** @typedef {ReturnType<typeof makeAuctioneerParamManager>} AuctionParamManager */
