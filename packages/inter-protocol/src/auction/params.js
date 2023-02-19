import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { objectMap } from '@agoric/internal';
import { TimerBrandShape, TimeMath } from '@agoric/time';
import { M } from '@agoric/store';

/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager.js').AsyncSpecTuple} AsyncSpecTuple */
/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager.js').SyncSpecTuple} SyncSpecTuple */

// TODO duplicated with zoe/src/TypeGuards.js
export const InvitationShape = M.remotable('Invitation');

// The auction will start at AUCTION_START_DELAY seconds after a multiple of
// START_FREQUENCY, with the price at STARTING_RATE. Every CLOCK_STEP, the price
// will be reduced by DISCOUNT_STEP, as long as the rate is at or above
// LOWEST_RATE, or until START_FREQUENCY has elapsed.

// in seconds, how often to start an auction
export const START_FREQUENCY = 'StartFrequency';
// in seconds, how often to reduce the price
export const CLOCK_STEP = 'ClockStep';
// discount or markup for starting price in basis points. 9999 = 1 bp discount
export const STARTING_RATE = 'StartingRate';
// A limit below which the price will not be discounted.
export const LOWEST_RATE = 'LowestRate';
// amount to reduce prices each time step in bp, as % of the start price
export const DISCOUNT_STEP = 'DiscountStep';
// VaultManagers liquidate vaults at a frequency configured by START_FREQUENCY.
// Auctions start this long after the hour to give vaults time to finish.
export const AUCTION_START_DELAY = 'AuctionStartDelay';
// Basis Points to charge in penalty against vaults that are liquidated.  Notice
// that if the penalty is less than the LOWEST_RATE discount, vault holders
// could buy their assets back at an advantageous price.
export const LIQUIDATION_PENALTY = 'LiquidationPenalty';

// /////// used by VaultDirector /////////////////////
// time before each auction that the prices are locked.
export const PRICE_LOCK_PERIOD = 'PriceLockPeriod';

const RelativeTimePattern = { relValue: M.nat(), timerBrand: TimerBrandShape };

export const auctioneerParamPattern = M.splitRecord({
  [CONTRACT_ELECTORATE]: InvitationShape,
  [START_FREQUENCY]: RelativeTimePattern,
  [CLOCK_STEP]: RelativeTimePattern,
  [STARTING_RATE]: M.nat(),
  [LOWEST_RATE]: M.nat(),
  [DISCOUNT_STEP]: M.nat(),
  [AUCTION_START_DELAY]: RelativeTimePattern,
  [PRICE_LOCK_PERIOD]: RelativeTimePattern,
});

export const auctioneerParamTypes = harden({
  [CONTRACT_ELECTORATE]: ParamTypes.INVITATION,
  [START_FREQUENCY]: ParamTypes.RELATIVE_TIME,
  [CLOCK_STEP]: ParamTypes.RELATIVE_TIME,
  [STARTING_RATE]: ParamTypes.NAT,
  [LOWEST_RATE]: ParamTypes.NAT,
  [DISCOUNT_STEP]: ParamTypes.NAT,
  [AUCTION_START_DELAY]: ParamTypes.RELATIVE_TIME,
  [PRICE_LOCK_PERIOD]: ParamTypes.RELATIVE_TIME,
});

/**
 * @param {object} initial
 * @param {Amount} initial.electorateInvitationAmount
 * @param {RelativeTime} initial.startFreq
 * @param {RelativeTime} initial.clockStep
 * @param {bigint} initial.startingRate
 * @param {bigint} initial.lowestRate
 * @param {bigint} initial.discountStep
 * @param {RelativeTime} initial.auctionStartDelay
 * @param {RelativeTime} initial.priceLockPeriod
 * @param {import('@agoric/time/src/types').TimerBrand} initial.timerBrand
 */
export const makeAuctioneerParams = ({
  electorateInvitationAmount,
  startFreq,
  clockStep,
  lowestRate,
  startingRate,
  discountStep,
  auctionStartDelay,
  priceLockPeriod,
  timerBrand,
}) => {
  return harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
    [START_FREQUENCY]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.toRel(startFreq, timerBrand),
    },
    [CLOCK_STEP]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.toRel(clockStep, timerBrand),
    },
    [AUCTION_START_DELAY]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.toRel(auctionStartDelay, timerBrand),
    },
    [PRICE_LOCK_PERIOD]: {
      type: ParamTypes.RELATIVE_TIME,
      value: TimeMath.toRel(priceLockPeriod, timerBrand),
    },
    [STARTING_RATE]: { type: ParamTypes.NAT, value: startingRate },
    [LOWEST_RATE]: { type: ParamTypes.NAT, value: lowestRate },
    [DISCOUNT_STEP]: { type: ParamTypes.NAT, value: discountStep },
  });
};
harden(makeAuctioneerParams);

export const toParamValueMap = typedDescriptions => {
  return objectMap(typedDescriptions, value => {
    return value;
  });
};

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ZoeService} zoe
 * @param {object} initial
 * @param {Amount} initial.electorateInvitationAmount
 * @param {RelativeTime} initial.startFreq
 * @param {RelativeTime} initial.clockStep
 * @param {bigint} initial.startingRate
 * @param {bigint} initial.lowestRate
 * @param {bigint} initial.discountStep
 * @param {RelativeTime} initial.auctionStartDelay
 * @param {RelativeTime} initial.priceLockPeriod
 * @param {import('@agoric/time/src/types').TimerBrand} initial.timerBrand
 */
export const makeAuctioneerParamManager = (publisherKit, zoe, initial) => {
  return makeParamManager(
    publisherKit,
    {
      [CONTRACT_ELECTORATE]: [
        ParamTypes.INVITATION,
        initial[CONTRACT_ELECTORATE],
      ],
      // @ts-expect-error type confusion
      [START_FREQUENCY]: [ParamTypes.RELATIVE_TIME, initial[START_FREQUENCY]],
      // @ts-expect-error type confusion
      [CLOCK_STEP]: [ParamTypes.RELATIVE_TIME, initial[CLOCK_STEP]],
      [STARTING_RATE]: [ParamTypes.NAT, initial[STARTING_RATE]],
      [LOWEST_RATE]: [ParamTypes.NAT, initial[LOWEST_RATE]],
      [DISCOUNT_STEP]: [ParamTypes.NAT, initial[DISCOUNT_STEP]],
      // @ts-expect-error type confusion
      [AUCTION_START_DELAY]: [
        ParamTypes.RELATIVE_TIME,
        initial[AUCTION_START_DELAY],
      ],
      // @ts-expect-error type confusion
      [PRICE_LOCK_PERIOD]: [
        ParamTypes.RELATIVE_TIME,
        initial[PRICE_LOCK_PERIOD],
      ],
    },
    zoe,
  );
};
harden(makeAuctioneerParamManager);

/**
 * @param {{storageNode: ERef<StorageNode>, marshaller: ERef<Marshaller>}} caps
 * @param {{
 *   electorateInvitationAmount: Amount,
 *   priceAuthority: ERef<PriceAuthority>,
 *   timer: ERef<import('@agoric/time/src/types').TimerService>,
 *   startFreq: RelativeTime,
 *   clockStep: RelativeTime,
 *   discountStep: bigint,
 *   startingRate: bigint,
 *   lowestRate: bigint,
 *   auctionStartDelay: RelativeTime,
 *   priceLockPeriod: RelativeTime,
 *   timerBrand: import('@agoric/time/src/types').TimerBrand,
 * }} opts
 */
export const makeGovernedTerms = (
  { storageNode: _storageNode, marshaller: _marshaller },
  {
    electorateInvitationAmount,
    priceAuthority,
    timer,
    startFreq,
    clockStep,
    lowestRate,
    startingRate,
    discountStep,
    auctionStartDelay,
    priceLockPeriod,
    timerBrand,
  },
) => {
  // XXX  use storageNode and Marshaller
  return harden({
    priceAuthority,
    timerService: timer,
    governedParams: makeAuctioneerParams({
      electorateInvitationAmount,
      startFreq,
      clockStep,
      startingRate,
      lowestRate,
      discountStep,
      auctionStartDelay,
      priceLockPeriod,
      timerBrand,
    }),
  });
};
harden(makeGovernedTerms);

/** @typedef {ReturnType<typeof makeAuctioneerParamManager>} AuctionParamManaager */
