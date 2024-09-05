import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import {
  ratiosSame,
  makeRatioFromAmounts,
  quantize,
  subtractRatios,
} from '@agoric/zoe/src/contractSupport/index.js';
import { setup } from '@agoric/zoe/test/unitTests/setupBasicMints.js';
import { AmountMath } from '@agoric/ertp';
import {
  fromPriceOfferKey,
  toPriceOfferKey,
  toScaledRateOfferKey,
  fromScaledRateOfferKey,
} from '../../src/auction/sortedOffers.js';

// these used to be timestamps, but now they're bigInts
const DEC25 = 1671993996n;
const DEC26 = 1672080396n;

test('toKey price', t => {
  const { moola, simoleans } = setup();
  const priceA = makeRatioFromAmounts(moola(4001n), simoleans(100n));
  const priceB = makeRatioFromAmounts(moola(4000n), simoleans(100n));
  const priceC = makeRatioFromAmounts(moola(41n), simoleans(1000n));
  const priceD = makeRatioFromAmounts(moola(40n), simoleans(1000n));

  const keyA25 = toPriceOfferKey(priceA, DEC25);
  const keyB25 = toPriceOfferKey(priceB, DEC25);
  const keyC25 = toPriceOfferKey(priceC, DEC25);
  const keyD25 = toPriceOfferKey(priceD, DEC25);
  const keyA26 = toPriceOfferKey(priceA, DEC26);
  const keyB26 = toPriceOfferKey(priceB, DEC26);
  const keyC26 = toPriceOfferKey(priceC, DEC26);
  const keyD26 = toPriceOfferKey(priceD, DEC26);
  t.true(keyA25 > keyB25);
  t.true(keyA26 > keyA25);
  t.true(keyB25 > keyC25);
  t.true(keyB26 > keyB25);
  t.true(keyC25 > keyD25);
  t.true(keyC26 > keyC25);
  t.true(keyD26 > keyD25);
});

test('toKey discount', t => {
  const { moola } = setup();
  const discountA = makeRatioFromAmounts(moola(5n), moola(100n));
  const discountB = makeRatioFromAmounts(moola(55n), moola(1000n));
  const discountC = makeRatioFromAmounts(moola(6n), moola(100n));
  const discountD = makeRatioFromAmounts(moola(10n), moola(100n));

  const keyA25 = toScaledRateOfferKey(discountA, DEC25);
  const keyB25 = toScaledRateOfferKey(discountB, DEC25);
  const keyC25 = toScaledRateOfferKey(discountC, DEC25);
  const keyD25 = toScaledRateOfferKey(discountD, DEC25);
  const keyA26 = toScaledRateOfferKey(discountA, DEC26);
  const keyB26 = toScaledRateOfferKey(discountB, DEC26);
  const keyC26 = toScaledRateOfferKey(discountC, DEC26);
  const keyD26 = toScaledRateOfferKey(discountD, DEC26);
  t.true(keyB25 > keyA25);
  t.true(keyA26 > keyA25);
  t.true(keyC25 > keyB25);
  t.true(keyB26 > keyB25);
  t.true(keyD25 > keyC25);
  t.true(keyC26 > keyC25);
  t.true(keyD26 > keyD25);
});

const ratiosEqual = (t, left, right) => {
  t.true(AmountMath.isEmpty(subtractRatios(left, right).numerator));
};

test('fromKey Price', t => {
  const { moola, moolaKit, simoleans, simoleanKit } = setup();
  const { brand: moolaBrand } = moolaKit;
  const { brand: simBrand } = simoleanKit;
  const priceA = makeRatioFromAmounts(moola(4000n), simoleans(100n));
  const priceB = makeRatioFromAmounts(moola(40n), simoleans(1000n));

  const keyA25 = toPriceOfferKey(priceA, DEC25);
  const keyB25 = toPriceOfferKey(priceB, DEC25);

  const [priceAOut, timeA] = fromPriceOfferKey(keyA25, moolaBrand, simBrand, 9);
  const [priceBOut, timeB] = fromPriceOfferKey(keyB25, moolaBrand, simBrand, 9);
  const N = 10n ** 9n;
  t.true(
    ratiosSame(priceAOut, makeRatioFromAmounts(moola(40n * N), simoleans(N))),
  );
  ratiosEqual(t, priceBOut, makeRatioFromAmounts(moola(40n), simoleans(1000n)));
  t.is(timeA, DEC25);
  t.is(timeB, DEC25);
});

test('fromKey discount', t => {
  const { moola, moolaKit } = setup();
  const { brand: moolaBrand } = moolaKit;
  const fivePercent = makeRatioFromAmounts(moola(5n), moola(100n));
  const discountA = fivePercent;
  const fivePointFivePercent = makeRatioFromAmounts(moola(55n), moola(1000n));
  const discountB = fivePointFivePercent;

  const keyA25 = toScaledRateOfferKey(discountA, DEC25);
  const keyB25 = toScaledRateOfferKey(discountB, DEC25);

  const [discountAOut, timeA] = fromScaledRateOfferKey(keyA25, moolaBrand, 9);
  const [discountBOut, timeB] = fromScaledRateOfferKey(keyB25, moolaBrand, 9);
  ratiosEqual(t, discountAOut, fivePercent);
  ratiosEqual(
    t,
    quantize(discountBOut, 10000n),
    quantize(fivePointFivePercent, 10000n),
  );
  t.is(timeA, DEC25);
  t.is(timeB, DEC25);
});
