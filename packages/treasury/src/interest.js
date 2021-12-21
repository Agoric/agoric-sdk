// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/callSpread/types.js';
import './types.js';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';

const makeResult = (latestInterestUpdate, interest, newDebt) => ({
  latestInterestUpdate,
  interest,
  newDebt,
});

export const SECONDS_PER_YEAR = 60n * 60n * 24n * 365n;
const BASIS_POINTS = 10000;
// single digit APR is less than a basis point per day.
const LARGE_DENOMINATOR = BASIS_POINTS * BASIS_POINTS;

/** @type {MakeInterestCalculator} */
export const makeInterestCalculator = (
  brand,
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

  // Calculate new debt for charging periods up to the present.
  /** @type {Calculate} */
  const calculate = (debtStatus, currentTime) => {
    const { newDebt, latestInterestUpdate } = debtStatus;
    let newRecent = latestInterestUpdate;
    let growingInterest = debtStatus.interest;
    let growingDebt = newDebt;
    while (newRecent + chargingPeriod <= currentTime) {
      newRecent += chargingPeriod;
      const newInterest = ceilMultiplyBy(growingDebt, ratePerChargingPeriod);
      growingInterest = AmountMath.add(growingInterest, newInterest);
      growingDebt = AmountMath.add(growingDebt, newInterest, brand);
    }
    return makeResult(newRecent, growingInterest, growingDebt);
  };

  // Calculate new debt for reporting periods up to the present. If some
  // charging periods have elapsed that don't constitute whole reporting
  // periods, the time is not updated past them and interest is not accumulated
  // for them.
  /** @type {Calculate} */
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
