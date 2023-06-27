// book of offers to buy liquidating vaults with prices in terms of
// discount/markup from the current oracle price.

import { AmountMath } from '@agoric/ertp';
import { M, mustMatch } from '@agoric/store';
import {
  makeScalarBigMapStore,
  prepareExoClass,
  provide,
} from '@agoric/vat-data';

import {
  toBidScalingComparator,
  toPartialOfferKey,
  toPriceOfferKey,
  toScaledRateOfferKey,
} from './sortedOffers.js';

/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/** @type {(baggage: Baggage) => bigint} */
const nextSequenceNumber = baggage => {
  let latestSequenceNumber = provide(baggage, 'sequenceNumber', () => 1000n);
  latestSequenceNumber += 1n;
  baggage.set('sequenceNumber', latestSequenceNumber);
  return latestSequenceNumber;
};

/**
 * @typedef {{
 *   seat: ZCFSeat;
 *   wanted: Amount<'nat'>;
 *   seqNum: NatValue;
 *   received: Amount<'nat'>;
 *   timestamp: Timestamp;
 * } & { exitAfterBuy: boolean } & (
 *     | { bidScaling: Pattern; price: undefined }
 *     | { bidScaling: undefined; price: Ratio }
 *   )} BidderRecord
 */

const ScaledBidBookStateShape = harden({
  bidScalingPattern: M.any(),
  collateralBrand: M.any(),
  records: M.any(),
  makeBidNode: M.any(),
});

/**
 * Prices in this book are expressed as percentage of the full oracle price
 * snapshot taken when the auction started. .4 is 60% off. 1.1 is 10% above
 * par.
 *
 * @param {Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const prepareScaledBidBook = (baggage, makeRecorderKit) => {
  // multiple offers might be provided at the same timestamp (since timestamp
  // granularity is limited to blocks), so we increment a sequenceNumber with
  // each offer for uniqueness.

  const bidDataKits = baggage.get('bidDataKits');

  return prepareExoClass(
    baggage,
    'scaledBidBook',
    undefined,
    /**
     * @param {Pattern} bidScalingPattern
     * @param {Brand} collateralBrand
     * @param {(BigInteger) => Promise<StorageNode>} makeBidNode
     */
    (bidScalingPattern, collateralBrand, makeBidNode) => ({
      bidScalingPattern,
      collateralBrand,
      /** @type {MapStore<string, BidderRecord>} */
      records: makeScalarBigMapStore('scaledBidRecords', { durable: true }),
      makeBidNode,
    }),
    {
      /**
       * @param {ZCFSeat} seat
       * @param {Ratio} bidScaling
       * @param {Amount<'nat'>} wanted
       * @param {boolean} exitAfterBuy
       * @param {Timestamp} timestamp
       */
      add(seat, bidScaling, wanted, exitAfterBuy, timestamp) {
        const { bidScalingPattern, collateralBrand, records, makeBidNode } =
          this.state;
        mustMatch(bidScaling, bidScalingPattern);

        const seqNum = nextSequenceNumber(baggage);
        const key = toScaledRateOfferKey(bidScaling, seqNum);

        // @ts-expect-error makeRecorderKit accepts ERef<Node>
        const bidDataKit = makeRecorderKit(makeBidNode(seqNum), M.any());
        bidDataKits.init(key, bidDataKit);

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
          timestamp,
        };
        records.init(key, harden(bidderRecord));
        bidDataKits.init(seqNum);
        return key;
      },
      /** @param {Ratio} bidScaling */
      offersAbove(bidScaling) {
        const { records } = this.state;
        return [...records.entries(M.gte(toBidScalingComparator(bidScaling)))];
      },
      publishOffer(record) {
        const key = toScaledRateOfferKey(record.bidScaling, record.seqNum);

        bidDataKits.get(key).recorder.write(
          harden({
            bidScaling: record.bidScaling,
            wanted: record.wanted,
            exitAfterBuy: record.exitAfterBuy,
            timestamp: record.timestamp,
            balance: record.seat.getCurrentAllocation().Bid,
            sequence: record.seqNum,
          }),
        );
      },
      publishOffers() {
        const { records } = this.state;

        for (const r of records.values()) {
          this.self.publishOffer(r);
        }
      },
      hasOrders() {
        const { records } = this.state;
        return records.getSize() > 0;
      },
      delete(key) {
        const { records } = this.state;
        bidDataKits.delete(key);
        records.delete(key);
      },
      updateReceived(key, sold) {
        const { records } = this.state;
        const oldRec = records.get(key);
        const newRecord = harden({
          ...oldRec,
          received: AmountMath.add(oldRec.received, sold),
        });
        records.set(key, newRecord);
        this.self.publishOffer(newRecord);
      },
      exitAllSeats() {
        const { records } = this.state;
        for (const [key, { seat }] of records.entries()) {
          if (!seat.hasExited()) {
            seat.exit();
            bidDataKits.delete(key);
            records.delete(key);
          }
        }
      },
    },
    {
      stateShape: ScaledBidBookStateShape,
    },
  );
};

const PriceBookStateShape = harden({
  priceRatioPattern: M.any(),
  collateralBrand: M.any(),
  records: M.any(),
  makeBidNode: M.any(),
});

/**
 * Prices in this book are actual prices expressed in terms of bid amount and
 * collateral amount.
 *
 * @param {Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const preparePriceBook = (baggage, makeRecorderKit) => {
  const bidDataKits = baggage.get('bidDataKits');

  return prepareExoClass(
    baggage,
    'priceBook',
    undefined,
    /**
     * @param {Pattern} priceRatioPattern
     * @param {Brand} collateralBrand
     * @param {(BigInteger) => Promise<StorageNode>} makeBidNode
     */
    (priceRatioPattern, collateralBrand, makeBidNode) => ({
      priceRatioPattern,
      collateralBrand,
      /** @type {MapStore<string, BidderRecord>} */
      records: makeScalarBigMapStore('scaledBidRecords', { durable: true }),
      makeBidNode,
    }),
    {
      /**
       * @param {ZCFSeat} seat
       * @param {Ratio} price
       * @param {Amount<'nat'>} wanted
       * @param {boolean} exitAfterBuy
       * @param {Timestamp} timestamp
       */
      add(seat, price, wanted, exitAfterBuy, timestamp) {
        const { priceRatioPattern, collateralBrand, records, makeBidNode } =
          this.state;
        mustMatch(price, priceRatioPattern);

        const seqNum = nextSequenceNumber(baggage);
        const key = toPriceOfferKey(price, seqNum);

        // @ts-expect-error makeRecorderKit accepts ERef<Node>
        const bidDataKit = makeRecorderKit(makeBidNode(seqNum), M.any());
        bidDataKits.init(key, bidDataKit);

        const empty = AmountMath.makeEmpty(collateralBrand);
        records.init(
          key,
          harden({
            bidScaling: undefined,
            price,
            received: empty,
            seat,
            seqNum,
            wanted,
            exitAfterBuy,
            timestamp,
          }),
        );

        bidDataKits.init(seqNum);
        return key;
      },
      offersAbove(price) {
        const { records } = this.state;
        return [...records.entries(M.gte(toPartialOfferKey(price)))];
      },
      publishOffer(record) {
        const key = toPriceOfferKey(record.price, record.seqNum);

        bidDataKits.get(key).recorder.write(
          harden({
            price: record.price,
            wanted: record.wanted,
            exitAfterBuy: record.exitAfterBuy,
            timestamp: record.timestamp,
            balance: record.seat.getCurrentAllocation().Bid,
            sequence: record.seqNum,
          }),
        );
      },
      publishOffers() {
        const { records } = this.state;
        for (const r of records.values()) {
          this.self.publishOffer(r);
        }
      },
      hasOrders() {
        const { records } = this.state;
        return records.getSize() > 0;
      },
      delete(key) {
        const { records } = this.state;
        bidDataKits.delete(key);
        records.delete(key);
      },
      updateReceived(key, sold) {
        const { records } = this.state;
        const oldRec = records.get(key);
        const newRecord = harden({
          ...oldRec,
          received: AmountMath.add(oldRec.received, sold),
        });
        records.set(key, newRecord);
        this.self.publishOffer(newRecord);
      },
      exitAllSeats() {
        const { records } = this.state;
        for (const [key, { seat }] of records.entries()) {
          if (!seat.hasExited()) {
            seat.exit();
            bidDataKits.delete(key);
            records.delete(key);
          }
        }
      },
    },
    {
      stateShape: PriceBookStateShape,
    },
  );
};
