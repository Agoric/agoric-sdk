// @ts-check

import { AmountMath } from '@agoric/ertp';
import { natSafeMath } from '../contractSupport/index.js';

const { multiply, ceilDivide } = natSafeMath;

/**
 * @param {MeteringConfig} meteringConfig
 * @param {Brand} feeBrand
 * @param {ChargeZoeFee} chargeZoeFee
 * @returns {ChargeForComputrons}
 */
const makeChargeForComputrons = (meteringConfig, feeBrand, chargeZoeFee) => {
  /** @type {ChargeForComputrons} */
  const chargeForComputrons = async feePurse => {
    // Round on the side of charging higher fees
    const feeValue = ceilDivide(
      multiply(meteringConfig.incrementBy, meteringConfig.price.feeNumerator),
      meteringConfig.price.computronDenominator,
    );
    const feeToCharge = AmountMath.make(feeBrand, feeValue);
    await chargeZoeFee(feePurse, feeToCharge);
    return meteringConfig.incrementBy;
  };
  harden(chargeForComputrons);
  return chargeForComputrons;
};

harden(makeChargeForComputrons);
export { makeChargeForComputrons };
