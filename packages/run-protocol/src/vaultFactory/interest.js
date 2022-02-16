// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/callSpread/types.js';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import {
  makeRatio,
  multiplyRatios,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import './types.js';

export const SECONDS_PER_YEAR = 60n * 60n * 24n * 365n;
const BASIS_POINTS = 10000;
// single digit APR is less than a basis point per day.
const LARGE_DENOMINATOR = BASIS_POINTS * BASIS_POINTS;

/**
 * @param {Ratio} annualRate
 * @param {RelativeTime} chargingPeriod
 * @param {RelativeTime} recordingPeriod
 * @returns {CalculatorKit}
 */
export const makeInterestCalculator = (
  annualRate,
  chargingPeriod,
  recordingPeriod,
) => {
  // see https://en.wikipedia.org/wiki/Compound_interest#Compounding_basis
  const numeratorValue = Number(annualRate.numerator.value);
  const denominatorValue = Number(annualRate.denominator.value);

  const rawAnnualRate = numeratorValue / denominatorValue;
  const chargingFrequency = Number(chargingPeriod) / Number(SECONDS_PER_YEAR);
  const periodicRate = (1 + rawAnnualRate) ** chargingFrequency - 1;

  const ratePerChargingPeriod = makeRatio(
    BigInt(Math.floor(periodicRate * LARGE_DENOMINATOR)),
    annualRate.numerator.brand,
    BigInt(LARGE_DENOMINATOR),
  );

  /**
   * Calculate new debt for charging periods up to the present.
   *
   * @type {Calculate}
   */
  const calculate = (debtStatus, currentTime) => {
    const { newDebt, latestInterestUpdate } = debtStatus;
    let newRecent = latestInterestUpdate;
    let growingInterest = debtStatus.interest;
    let growingDebt = newDebt;
    while (newRecent + chargingPeriod <= currentTime) {
      newRecent += chargingPeriod;
      // The `ceil` implies that a vault with any debt will accrue at least one µRUN.
      const newInterest = natSafeMath.ceilDivide(
        growingDebt * ratePerChargingPeriod.numerator.value,
        ratePerChargingPeriod.denominator.value,
      );
      growingInterest += newInterest;
      growingDebt += newInterest;
    }
    return {
      latestInterestUpdate: newRecent,
      interest: growingInterest,
      newDebt: growingDebt,
    };
  };

  /**
   * Calculate new debt for reporting periods up to the present. If some
   * charging periods have elapsed that don't constitute whole reporting
   * periods, the time is not updated past them and interest is not accumulated
   * for them.
   *
   * @type {Calculate}
   */
  const calculateReportingPeriod = (debtStatus, currentTime) => {
    const { latestInterestUpdate } = debtStatus;
    const overshoot = (currentTime - latestInterestUpdate) % recordingPeriod;
    return calculate(debtStatus, currentTime - overshoot);
  };

  return harden({
    calculate,
    calculateReportingPeriod,
  });
};

/**
 * compoundedInterest *= (new debt) / (prior total debt)
 *
 * @param {Ratio} priorCompoundedInterest
 * @param {NatValue} priorDebt
 * @param {NatValue} newDebt
 */
export const calculateCompoundedInterest = (
  priorCompoundedInterest,
  priorDebt,
  newDebt,
) => {
  const brand = priorCompoundedInterest.numerator.brand;
  if (priorDebt === 0n) {
    throw new Error('No interest on zero debt');
  }
  return multiplyRatios(
    priorCompoundedInterest,
    makeRatio(newDebt, brand, priorDebt, brand),
  );
};
