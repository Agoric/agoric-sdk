// @ts-check

import { AmountMath } from '@agoric/ertp';
import { natSafeMath } from '../contractSupport/index.js';

const { multiply, ceilDivide } = natSafeMath;

const makeChargeForComputrons = (meteringConfig, feeBrand, chargeZoeFee) => {
  const chargeForComputrons = async feePurse => {
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
