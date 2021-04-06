// @ts-check
import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/callSpread/types';
import './types';
import { multiplyBy, makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { amountMath } from '@agoric/ertp';

function makeResult(latestInterestUpdate, interest, newDebt) {
  return { latestInterestUpdate, interest, newDebt };
}

export const SECONDS_PER_YEAR = 60n * 60n * 24n * 365n;

/** @type {MakeInterestCalculator} */
export function makeInterestCalculator(
  brand,
  annualRate,
  chargingPeriod,
  recordingPeriod,
) {
  const numeratorValue = BigInt(annualRate.numerator.value);
  const denominatorValue = BigInt(annualRate.denominator.value);
  const ratePerChargingPeriod = makeRatio(
    chargingPeriod * numeratorValue,
    annualRate.numerator.brand,
    SECONDS_PER_YEAR * denominatorValue,
  );
  // Calculate new debt for charging periods up to the present.
  /** @type {Calculate} */
  function calculate(debtStatus, currentTime) {
    const { newDebt, latestInterestUpdate } = debtStatus;
    let newRecent = latestInterestUpdate;
    let growingInterest = amountMath.makeEmpty(brand);
    let growingDebt = newDebt;
    while (newRecent + chargingPeriod <= currentTime) {
      newRecent += chargingPeriod;
      const newInterest = multiplyBy(growingDebt, ratePerChargingPeriod);
      growingInterest = amountMath.add(growingInterest, newInterest);
      growingDebt = amountMath.add(growingDebt, newInterest, brand);
    }
    return makeResult(newRecent, growingInterest, growingDebt);
  }

  // Calculate new debt for reporting periods up to the present. If some
  // charging periods have elapsed that don't constitute whole reporting
  // periods, the time is not updated past them and interest is not accumulated
  // for them.
  /** @type {Calculate} */
  function calculateReportingPeriod(debtStatus, currentTime) {
    const { latestInterestUpdate } = debtStatus;
    const overshoot = (currentTime - latestInterestUpdate) % recordingPeriod;
    return calculate(debtStatus, currentTime - overshoot);
  }

  return harden({
    calculate,
    calculateReportingPeriod,
  });
}
