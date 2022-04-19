// @ts-check

import './types.js';

import {
  CONTRACT_ELECTORATE,
  makeParamManagerSync,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { M } from '@agoric/store';
import { amountPattern, ratioPattern } from '../contractSupport.js';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const DEBT_LIMIT_KEY = 'DebtLimit';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const LIQUIDATION_PENALTY_KEY = 'LiquidationPenalty';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';

/**
 * @param {Amount} electorateInvitationAmount
 */
const makeElectorateParams = electorateInvitationAmount => {
  return harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
  });
};

/**
 * @param {VaultManagerParamValues} initial
 */
const makeVaultParamManager = initial =>
  makeParamManagerSync({
    [DEBT_LIMIT_KEY]: [ParamTypes.AMOUNT, initial.debtLimit],
    [LIQUIDATION_MARGIN_KEY]: [ParamTypes.RATIO, initial.liquidationMargin],
    [LIQUIDATION_PENALTY_KEY]: [ParamTypes.RATIO, initial.liquidationPenalty],
    [INTEREST_RATE_KEY]: [ParamTypes.RATIO, initial.interestRate],
    [LOAN_FEE_KEY]: [ParamTypes.RATIO, initial.loanFee],
  });
/** @typedef {ReturnType<typeof makeVaultParamManager>} VaultParamManager */

export const vaultParamPattern = M.split(
  {
    liquidationMargin: ratioPattern,
    liquidationPenalty: ratioPattern,
    interestRate: ratioPattern,
    loanFee: ratioPattern,
    debtLimit: amountPattern,
  },
  M.any(),
);

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Invitation} electorateInvitation
 */
const makeElectorateParamManager = async (zoe, electorateInvitation) => {
  return makeParamManager(
    {
      [CONTRACT_ELECTORATE]: ['invitation', electorateInvitation],
    },
    zoe,
  );
};

/**
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {LoanTiming} loanTiming
 * @param {Installation} liquidationInstall
 * @param {ERef<TimerService>} timerService
 * @param {Amount} invitationAmount
 * @param {VaultManagerParamValues} vaultManagerParams
 * @param {XYKAMMPublicFacet} ammPublicFacet
 * @param {bigint=} bootstrapPaymentValue
 */
const makeGovernedTerms = (
  priceAuthority,
  loanTiming,
  liquidationInstall,
  timerService,
  invitationAmount,
  vaultManagerParams,
  ammPublicFacet,
  bootstrapPaymentValue = 0n,
) => {
  const timingParamMgr = makeParamManagerSync({
    [CHARGING_PERIOD_KEY]: ['nat', loanTiming.chargingPeriod],
    [RECORDING_PERIOD_KEY]: ['nat', loanTiming.recordingPeriod],
  });

  const vmParamMgr = makeVaultParamManager(vaultManagerParams);

  return harden({
    ammPublicFacet,
    priceAuthority,
    loanParams: vmParamMgr.getParams(),
    loanTimingParams: timingParamMgr.getParams(),
    timerService,
    liquidationInstall,
    governedParams: makeElectorateParams(invitationAmount),
    bootstrapPaymentValue,
  });
};

harden(makeVaultParamManager);
harden(makeElectorateParamManager);
harden(makeGovernedTerms);

export { makeElectorateParamManager, makeVaultParamManager, makeGovernedTerms };
