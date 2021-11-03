// @ts-check

import './types.js';

import { buildParamManager, ParamType } from '@agoric/governance';

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
    {
      name: CHARGING_PERIOD_KEY,
      value: loanParams.chargingPeriod,
      type: ParamType.NAT,
    },
    {
      name: RECORDING_PERIOD_KEY,
      value: loanParams.recordingPeriod,
      type: ParamType.NAT,
    },
    {
      name: INITIAL_MARGIN_KEY,
      value: rates.initialMargin,
      type: ParamType.RATIO,
    },
    {
      name: LIQUIDATION_MARGIN_KEY,
      value: rates.liquidationMargin,
      type: ParamType.RATIO,
    },
    {
      name: INTEREST_RATE_KEY,
      value: rates.interestRate,
      type: ParamType.RATIO,
    },
    {
      name: LOAN_FEE_KEY,
      value: rates.loanFee,
      type: ParamType.RATIO,
    },
  ]);
};
