// @ts-check
import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/callSpread/types';
import './types';
import { multiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { amountMath } from '@agoric/ertp';

function makeResult(latestInterestUpdate, interest, newDebt) {
  return { latestInterestUpdate, interest, newDebt };
}

export function makeInterestCalculator(
  brand,
  rate,
  chargingPeriod,
  recordingPeriod,
) {
  // Calculate new debt for charging periods up to the present.
  function calculate(debtStatus, currentTime) {
    const { currentDebt, latestInterestUpdate } = debtStatus;
    let newRecent = latestInterestUpdate;
    let growingInterest = amountMath.makeEmpty(brand);
    let growingDebt = currentDebt;
    while (newRecent + chargingPeriod <= currentTime) {
      newRecent += chargingPeriod;
      const newInterest = multiplyBy(growingDebt, rate);
      growingInterest = amountMath.add(growingInterest, newInterest);
      growingDebt = amountMath.add(growingDebt, newInterest, brand);
    }
    return makeResult(newRecent, growingInterest, growingDebt);
  }

  // Calculate new debt for reporting periods up to the present. If some
  // charging periods have elapsed that don't constitute whole reporting
  // periods, the time is not updated past them and interest is not accumulated
  // for them.
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
