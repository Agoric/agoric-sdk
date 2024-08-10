// book of offers to buy liquidating vaults with prices in terms of
// discount/markup from the current oracle price.

import { AmountMath } from '@agoric/ertp';
import { M, mustMatch } from '@agoric/store';
import { makeScalarBigMapStore, prepareExoClass } from '@agoric/vat-data';

import {
  toBidScalingComparator,
  toPartialOfferKey,
  toPriceOfferKey,
  toScaledRateOfferKey,
} from './sortedOffers.js';

/** @import {Baggage} from '@agoric/vat-data' */

// multiple offers might be provided at the same time (since the time
// granularity is limited to blocks), so we increment a sequenceNumber with each
// offer for uniqueness.
let latestSequenceNumber = 0n;
const nextSequenceNumber = () => {
  latestSequenceNumber += 1n;
  return latestSequenceNumber;
};

/**
 * @typedef {{
 *   seat: ZCFSeat;
 *   wanted: Amount<'nat'>;
 *   seqNum: NatValue;
 *   received: Amount<'nat'>;
 * } & { exitAfterBuy: boolean } & (
 *     | { bidScaling: Pattern; price: undefined }
 *     | { bidScaling: undefined; price: Ratio }
 *   )} BidderRecord
 */

const ScaledBidBookStateShape = harden({
  bidScalingPattern: M.any(),
  collateralBrand: M.any(),
  records: M.any(),
});

/**
 * Prices in this book are expressed as percentage of the full oracle price
 * snapshot taken when the auction started. .4 is 60% off. 1.1 is 10% above
 * par.
 *
 * @param {Baggage} baggage
 */
export const prepareScaledBidBook = baggage =>
  prepareExoClass(
    baggage,
    'scaledBidBook',
    undefined,
    /**
     * @param {Pattern} bidScalingPattern
     * @param {Brand} collateralBrand
     */
    (bidScalingPattern, collateralBrand) => ({
      bidScalingPattern,
      collateralBrand,
      /** @type {MapStore<string, BidderRecord>} */
      records: makeScalarBigMapStore('scaledBidRecords', { durable: true }),
    }),
    {
      /**
       * @param {ZCFSeat} seat
       * @param {Ratio} bidScaling
       * @param {Amount<'nat'>} wanted
       * @param {boolean} exitAfterBuy
       */
      add(seat, bidScaling, wanted, exitAfterBuy) {
        const { bidScalingPattern, collateralBrand, records } = this.state;
        mustMatch(bidScaling, bidScalingPattern);

        const seqNum = nextSequenceNumber();
        const key = toScaledRateOfferKey(bidScaling, seqNum);
        const empty = AmountMath.makeEmpty(collateralBrand);
        /** @type {BidderRecord} */
        const bidderRecord = {
          bidScaling,
          price: undefined,
          received: empty,
          seat,
          seqNum,
          wanted,
          exitAfterBuy,
        };
        records.init(key, harden(bidderRecord));
        return key;
      },
      /** @param {Ratio} bidScaling */
      offersAbove(bidScaling) {
        const { records } = this.state;
        return [...records.entries(M.gte(toBidScalingComparator(bidScaling)))];
      },
      hasOrders() {
        const { records } = this.state;
        return records.getSize() > 0;
      },
      delete(key) {
        const { records } = this.state;
        records.delete(key);
      },
      updateReceived(key, sold) {
        const { records } = this.state;
        const oldRec = records.get(key);
        records.set(
          key,
          harden({
            ...oldRec,
            received: AmountMath.add(oldRec.received, sold),
          }),
        );
      },
      exitAllSeats() {
        const { records } = this.state;
        for (const [key, { seat }] of records.entries()) {
          if (!seat.hasExited()) {
            seat.exit();
            records.delete(key);
          }
        }
      },
    },
    {
      stateShape: ScaledBidBookStateShape,
    },
  );

const PriceBookStateShape = harden({
  priceRatioPattern: M.any(),
  collateralBrand: M.any(),
  records: M.any(),
});

/**
 * Prices in this book are actual prices expressed in terms of bid amount and
 * collateral amount.
 *
 * @param {Baggage} baggage
 */
export const preparePriceBook = baggage =>
  prepareExoClass(
    baggage,
    'priceBook',
    undefined,
    /**
     * @param {Pattern} priceRatioPattern
     * @param {Brand} collateralBrand
     */
    (priceRatioPattern, collateralBrand) => ({
      priceRatioPattern,
      collateralBrand,
      /** @type {MapStore<string, BidderRecord>} */
      records: makeScalarBigMapStore('scaledBidRecords', { durable: true }),
    }),
    {
      /**
       * @param {ZCFSeat} seat
       * @param {Ratio} price
       * @param {Amount<'nat'>} wanted
       * @param {boolean} exitAfterBuy
       */
      add(seat, price, wanted, exitAfterBuy) {
        const { priceRatioPattern, collateralBrand, records } = this.state;
        mustMatch(price, priceRatioPattern);

        const seqNum = nextSequenceNumber();
        const key = toPriceOfferKey(price, seqNum);
        const empty = AmountMath.makeEmpty(collateralBrand);
        /** @type {BidderRecord} */
        const bidderRecord = {
          bidScaling: undefined,
          price,
          received: empty,
          seat,
          seqNum,
          wanted,
          exitAfterBuy,
        };
        records.init(key, harden(bidderRecord));
        return key;
      },
      offersAbove(price) {
        const { records } = this.state;
        return [...records.entries(M.gte(toPartialOfferKey(price)))];
      },
      hasOrders() {
        const { records } = this.state;
        return records.getSize() > 0;
      },
      delete(key) {
        const { records } = this.state;
        records.delete(key);
      },
      updateReceived(key, sold) {
        const { records } = this.state;
        const oldRec = records.get(key);
        records.set(
          key,
          harden({
            ...oldRec,
            received: AmountMath.add(oldRec.received, sold),
          }),
        );
      },
      exitAllSeats() {
        const { records } = this.state;
        for (const [key, { seat }] of records.entries()) {
          if (!seat.hasExited()) {
            seat.exit();
            records.delete(key);
          }
        }
      },
    },
    {
      stateShape: PriceBookStateShape,
    },
  );
