// @ts-check

import { E } from '@agoric/eventual-send';
import { makeAsyncIterableFromNotifier as iterateNotifier } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp';
import { multiplyBy } from '../contractSupport/index.js';

/**
 * @param {Meter} meter
 * @param {ChargeZoeFee} chargeZoeFee
 * @param {ERef<FeePurse>} feePurse
 * @param {bigint} incrementBy
 * @param {Ratio} computronPrice
 */
const refillMeter = async (
  meter,
  chargeZoeFee,
  feePurse,
  incrementBy,
  computronPrice,
) => {
  // computronPrice is a ratio of fee brand to computrons (fake computron
  // brand)

  const computronBrand = computronPrice.denominator.brand;

  const feeToCharge = multiplyBy(
    AmountMath.make(computronBrand, incrementBy),
    computronPrice,
  );

  const meterNotifier = E(meter).getNotifier();

  for await (const value of iterateNotifier(meterNotifier)) {
    console.log('NOTIFIED', value);
    await chargeZoeFee(feePurse, feeToCharge);
    await E(meter).addRemaining(incrementBy); // will notify at the same threshold as before
  }
};
harden(refillMeter);
export { refillMeter };
