// @ts-check

import './types.js';

import { buildParamManager } from '@agoric/governance';
import {
  makeGovernedNat,
  makeGovernedRatio,
} from '@agoric/governance/src/paramMakers.js';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const INITIAL_MARGIN_KEY = 'InitialMargin';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';

export const governedParameterTerms = {
  vaultParams: [
    CHARGING_PERIOD_KEY,
    RECORDING_PERIOD_KEY,
    INITIAL_MARGIN_KEY,
    LIQUIDATION_MARGIN_KEY,
    INTEREST_RATE_KEY,
    LOAN_FEE_KEY,
  ],
};

/** @type {MakeVaultParamManager} */
export const makeVaultParamManager = (loanParams, rates) => {
  // @ts-ignore buildParamManager doesn't describe all the update methods
  return buildParamManager([
    makeGovernedNat(CHARGING_PERIOD_KEY, loanParams.chargingPeriod),
    makeGovernedNat(RECORDING_PERIOD_KEY, loanParams.recordingPeriod),
    makeGovernedRatio(INITIAL_MARGIN_KEY, rates.initialMargin),
    makeGovernedRatio(LIQUIDATION_MARGIN_KEY, rates.liquidationMargin),
    makeGovernedRatio(INTEREST_RATE_KEY, rates.interestRate),
    makeGovernedRatio(LOAN_FEE_KEY, rates.loanFee),
  ]);
};
