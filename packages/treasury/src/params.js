// @ts-check

import './types.js';

import { buildParamManager, ParamType } from '@agoric/governance';

export const POOL_FEE_KEY = 'PoolFee';
export const PROTOCOL_FEE_KEY = 'ProtocolFee';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const INITIAL_MARGIN_KEY = 'InitialMargin';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';

export const governedParameterTerms = {
  loanParams: [POOL_FEE_KEY, PROTOCOL_FEE_KEY],
  poolParams: [
    CHARGING_PERIOD_KEY,
    RECORDING_PERIOD_KEY,
    INITIAL_MARGIN_KEY,
    LIQUIDATION_MARGIN_KEY,
    INTEREST_RATE_KEY,
    LOAN_FEE_KEY,
  ],
};

/** @type {{ FEE: 'fee', POOL: 'pool' }} */
export const ParamKey = {
  FEE: 'fee',
  POOL: 'pool',
};

/** @type {MakeFeeParamManager} */
export const makeFeeParamManager = ammFees => {
  // @ts-ignore buildParamManager doesn't describe all the update methods
  return buildParamManager([
    {
      name: POOL_FEE_KEY,
      value: ammFees.poolFee,
      type: ParamType.NAT,
    },
    {
      name: PROTOCOL_FEE_KEY,
      value: ammFees.protocolFee,
      type: ParamType.NAT,
    },
  ]);
};

/** @type {MakePoolParamManager} */
export const makePoolParamManager = (loanParams, rates) => {
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
