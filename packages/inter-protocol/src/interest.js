// @jessie-check

import { Fail } from '@endo/errors';
import { AmountMath } from '@agoric/ertp';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import {
  makeRatio,
  multiplyRatios,
  quantize,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { TimeMath } from '@agoric/time';

/**
 * @import {Timestamp} from '@agoric/time'
 * @import {RelativeTime} from '@agoric/time'
 */

export const SECONDS_PER_YEAR = 60n * 60n * 24n * 365n;
const BASIS_POINTS = 10000;
// single digit APR is less than a basis point per day.
const LARGE_DENOMINATOR = BASIS_POINTS * BASIS_POINTS;

/** Number chosen from 6 digits for a basis point, doubled for multiplication. */
const COMPOUNDED_INTEREST_DENOMINATOR = 10n ** 20n;

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
  const chargingFrequency =
    Number(TimeMath.relValue(chargingPeriod)) / Number(SECONDS_PER_YEAR);
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
    while (
      TimeMath.compareAbs(
        TimeMath.addAbsRel(newRecent, chargingPeriod),
        currentTime,
      ) <= 0
    ) {
      newRecent = TimeMath.addAbsRel(newRecent, chargingPeriod);
      // The `ceil` implies that a vault with any debt will accrue at least one
      // unit.
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
    const overshoot = TimeMath.modRelRel(
      TimeMath.subtractAbsAbs(currentTime, latestInterestUpdate),
      recordingPeriod,
    );
    return calculate(
      debtStatus,
      TimeMath.subtractAbsRel(currentTime, overshoot),
    );
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
  const compounded = multiplyRatios(
    priorCompoundedInterest,
    makeRatio(newDebt, brand, priorDebt, brand),
  );
  return quantize(compounded, COMPOUNDED_INTEREST_DENOMINATOR);
};

/**
 * @template {AssetKind} K
 * @param {ZCFMint<K>} mint
 * @param {Amount<K>} debt
 */
const validatedBrand = (mint, debt) => {
  const { brand: debtBrand } = debt;
  const { brand: issuerBrand } = mint.getIssuerRecord();
  debtBrand === issuerBrand ||
    Fail`Debt and issuer brands differ: ${debtBrand} != ${issuerBrand}`;
  return issuerBrand;
};

/**
 * Charge interest accrued between `latestInterestUpdate` and `accruedUntil`.
 *
 * @param {{
 *   mint: ZCFMint<'nat'>;
 *   mintAndTransferWithFee: MintAndTransfer;
 *   poolIncrementSeat: ZCFSeat;
 *   seatAllocationKeyword: Keyword;
 * }} powers
 * @param {{
 *   interestRate: Ratio;
 *   chargingPeriod: RelativeTime;
 *   recordingPeriod: RelativeTime;
 * }} params
 * @param {{
 *   latestInterestUpdate: Timestamp;
 *   compoundedInterest: Ratio;
 *   totalDebt: Amount<'nat'>;
 * }} prior
 * @param {Timestamp} accruedUntil
 * @returns {{
 *   compoundedInterest: Ratio;
 *   latestInterestUpdate: Timestamp;
 *   totalDebt: Amount<'nat'>;
 * }}
 */
export const chargeInterest = (powers, params, prior, accruedUntil) => {
  const brand = validatedBrand(powers.mint, prior.totalDebt);

  const interestCalculator = makeInterestCalculator(
    params.interestRate,
    params.chargingPeriod,
    params.recordingPeriod,
  );

  // calculate delta of accrued debt
  const debtStatus = interestCalculator.calculateReportingPeriod(
    {
      latestInterestUpdate: prior.latestInterestUpdate,
      newDebt: prior.totalDebt.value,
      interest: 0n, // XXX this is always zero, doesn't need to be an option
    },
    accruedUntil,
  );
  const interestAccrued = debtStatus.interest;

  // done if none
  if (interestAccrued === 0n) {
    return {
      compoundedInterest: prior.compoundedInterest,
      latestInterestUpdate: debtStatus.latestInterestUpdate,
      totalDebt: prior.totalDebt,
    };
  }

  // NB: This method of inferring the compounded rate from the ratio of debts
  // accrued suffers slightly from the integer nature of debts. However in
  // testing with small numbers there's 5 digits of precision, and with large
  // numbers the ratios tend towards ample precision.
  // TODO adopt banker's rounding https://github.com/Agoric/agoric-sdk/issues/4573
  const compoundedInterest = calculateCompoundedInterest(
    prior.compoundedInterest,
    prior.totalDebt.value,
    debtStatus.newDebt,
  );

  // totalDebt += interestAccrued
  const totalDebt = AmountMath.add(
    prior.totalDebt,
    AmountMath.make(brand, interestAccrued),
  );

  // mint that much of brand for the reward pool
  const rewarded = AmountMath.make(brand, interestAccrued);
  powers.mintAndTransferWithFee(
    powers.poolIncrementSeat,
    rewarded,
    rewarded,
    [],
  );

  return {
    compoundedInterest,
    latestInterestUpdate: debtStatus.latestInterestUpdate,
    totalDebt,
  };
};
