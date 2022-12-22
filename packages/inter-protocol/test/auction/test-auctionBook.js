import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { makeScalarBigMapStore } from '@agoric/vat-data';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import {
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeOffer } from '@agoric/zoe/test/unitTests/makeOffer.js';
import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';
import { eventLoopIteration } from '@agoric/notifier/tools/testSupports.js';

import { setup } from '../../../zoe/test/unitTests/setupBasicMints.js';
import { makeAuctionBook } from '../../src/auction/auctionBook.js';
import { AuctionState } from '../../src/auction/util.js';

const buildManualPriceAuthority = initialPrice =>
  makeManualPriceAuthority({
    actualBrandIn: initialPrice.denominator.brand,
    actualBrandOut: initialPrice.numerator.brand,
    timer: buildManualTimer(),
    initialPrice,
  });

test('states', async t => {
  const { moolaKit, moola, simoleanKit, simoleans } = setup();

  const { zcf } = await setupZCFTest();
  await zcf.saveIssuer(moolaKit.issuer, 'Moola');
  await zcf.saveIssuer(simoleanKit.issuer, 'Sim');
  const baggage = makeScalarBigMapStore('zcfBaggage', { durable: true });

  const initialPrice = makeRatioFromAmounts(moola(20n), simoleans(100n));
  const pa = buildManualPriceAuthority(initialPrice);
  const auct = await makeAuctionBook(
    baggage,
    zcf,
    moolaKit.brand,
    simoleanKit.brand,
    pa,
  );
  t.deepEqual(
    auct.getCurrentPrice(),
    makeRatioFromAmounts(
      AmountMath.makeEmpty(moolaKit.brand),
      AmountMath.make(simoleanKit.brand, 1n),
    ),
  );
  auct.setStartingRate(makeRatio(90n, moolaKit.brand, 100n));
});

const makeSeatWithAssets = async (zoe, zcf, giveAmount, giveKwd, issuerKit) => {
  const payment = issuerKit.mint.mintPayment(giveAmount);
  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    { give: { [giveKwd]: giveAmount } },
    { [giveKwd]: payment },
  );
  return zcfSeat;
};

test('acceptOffer fakeSeat', async t => {
  const { moolaKit, moola, simoleans, simoleanKit } = setup();

  const { zoe, zcf } = await setupZCFTest();
  await zcf.saveIssuer(moolaKit.issuer, 'Moola');
  await zcf.saveIssuer(simoleanKit.issuer, 'Sim');

  const payment = moolaKit.mint.mintPayment(moola(100n));

  const { zcfSeat } = await makeOffer(
    zoe,
    zcf,
    { give: { Bid: moola(100n) }, want: { Ask: simoleans(0n) } },
    { Bid: payment },
  );
  const baggage = makeScalarBigMapStore('zcfBaggage', { durable: true });
  const donorSeat = await makeSeatWithAssets(
    zoe,
    zcf,
    simoleans(500n),
    'Collateral',
    simoleanKit,
  );

  const initialPrice = makeRatioFromAmounts(moola(20n), simoleans(100n));
  const pa = buildManualPriceAuthority(initialPrice);

  const book = await makeAuctionBook(
    baggage,
    zcf,
    moolaKit.brand,
    simoleanKit.brand,
    pa,
  );
  pa.setPrice(makeRatioFromAmounts(moola(11n), simoleans(10n)));
  await eventLoopIteration();

  book.addAssets(AmountMath.make(simoleanKit.brand, 123n), donorSeat);
  book.lockOraclePriceForRound();
  book.setStartingRate(makeRatio(50n, moolaKit.brand, 100n));

  book.addOffer(
    harden({
      offerPrice: makeRatioFromAmounts(moola(10n), simoleans(100n)),
      want: simoleans(50n),
    }),
    zcfSeat,
    AuctionState.ACTIVE,
  );

  t.true(book.hasOrders());
});

test('getOffers to a price limit', async t => {
  const { moolaKit, moola, simoleanKit, simoleans } = setup();

  const { zoe, zcf } = await setupZCFTest();
  await zcf.saveIssuer(moolaKit.issuer, 'Moola');
  await zcf.saveIssuer(simoleanKit.issuer, 'Sim');

  const baggage = makeScalarBigMapStore('zcfBaggage', { durable: true });

  const initialPrice = makeRatioFromAmounts(moola(20n), simoleans(100n));
  const pa = buildManualPriceAuthority(initialPrice);

  const donorSeat = await makeSeatWithAssets(
    zoe,
    zcf,
    simoleans(500n),
    'Collateral',
    simoleanKit,
  );

  const book = await makeAuctionBook(
    baggage,
    zcf,
    moolaKit.brand,
    simoleanKit.brand,
    pa,
  );
  pa.setPrice(makeRatioFromAmounts(moola(11n), simoleans(10n)));
  await eventLoopIteration();

  book.addAssets(AmountMath.make(simoleanKit.brand, 123n), donorSeat);
  const zcfSeat = await makeSeatWithAssets(
    zoe,
    zcf,
    moola(100n),
    'Bid',
    moolaKit,
  );

  book.lockOraclePriceForRound();
  book.setStartingRate(makeRatio(50n, moolaKit.brand, 100n));

  book.addOffer(
    harden({
      offerDiscount: makeRatioFromAmounts(moola(10n), moola(100n)),
      want: simoleans(50n),
    }),
    zcfSeat,
    AuctionState.ACTIVE,
  );

  t.true(book.hasOrders());
});

test('getOffers w/discount', async t => {
  const { moolaKit, moola, simoleanKit, simoleans } = setup();

  const { zoe, zcf } = await setupZCFTest();
  await zcf.saveIssuer(moolaKit.issuer, 'Moola');
  await zcf.saveIssuer(simoleanKit.issuer, 'Sim');

  const baggage = makeScalarBigMapStore('zcfBaggage', { durable: true });

  const donorSeat = await makeSeatWithAssets(
    zoe,
    zcf,
    simoleans(500n),
    'Collateral',
    simoleanKit,
  );

  const initialPrice = makeRatioFromAmounts(moola(20n), simoleans(100n));
  const pa = buildManualPriceAuthority(initialPrice);

  const book = await makeAuctionBook(
    baggage,
    zcf,
    moolaKit.brand,
    simoleanKit.brand,
    pa,
  );

  pa.setPrice(makeRatioFromAmounts(moola(11n), simoleans(10n)));
  await eventLoopIteration();
  book.addAssets(AmountMath.make(simoleanKit.brand, 123n), donorSeat);

  book.lockOraclePriceForRound();
  book.setStartingRate(makeRatio(50n, moolaKit.brand, 100n));

  const zcfSeat = await makeSeatWithAssets(
    zoe,
    zcf,
    moola(100n),
    'Bid',
    moolaKit,
  );

  book.addOffer(
    harden({
      offerDiscount: makeRatioFromAmounts(moola(10n), moola(100n)),
      want: simoleans(50n),
    }),
    zcfSeat,
    AuctionState.ACTIVE,
  );

  t.true(book.hasOrders());
});
