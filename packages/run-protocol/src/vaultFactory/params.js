/* eslint-disable no-useless-rename */
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
export const LIQUIDATION_INSTALL_KEY = 'LiquidationInstall';
export const LIQUIDATION_TERMS_KEY = 'LiquidationTerms';
export const MIN_INITIAL_DEBT_KEY = 'MinInitialDebt';

/**
 * @param {Amount} electorateInvitationAmount
 * @param {Installation} liquidationInstall
 * @param {object} liquidationTerms
 * @param {Amount} minInitialDebt
 */
const makeVaultDirectorParams = (
  electorateInvitationAmount,
  liquidationInstall,
  liquidationTerms,
  minInitialDebt,
) => {
  return harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
    [LIQUIDATION_INSTALL_KEY]: {
      type: ParamTypes.INSTALLATION,
      value: liquidationInstall,
    },
    [LIQUIDATION_TERMS_KEY]: {
      type: ParamTypes.UNKNOWN,
      value: liquidationTerms,
    },
    [MIN_INITIAL_DEBT_KEY]: {
      type: ParamTypes.AMOUNT,
      value: minInitialDebt,
    },
  });
};

/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager').ParamTypesMapFromRecords<ReturnType<typeof makeVaultDirectorParams>>} VaultDirectorParams */

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
 * @param {Installation} liquidationInstall
 * @param {object} liquidationTerms
 * @param {Amount} minInitialDebt
 */
const makeVaultDirectorParamManager = async (
  zoe,
  electorateInvitation,
  liquidationInstall,
  liquidationTerms,
  minInitialDebt,
) => {
  return makeParamManager(
    {
      [CONTRACT_ELECTORATE]: [ParamTypes.INVITATION, electorateInvitation],
      [LIQUIDATION_INSTALL_KEY]: [ParamTypes.INSTALLATION, liquidationInstall],
      [LIQUIDATION_TERMS_KEY]: [ParamTypes.UNKNOWN, liquidationTerms],
      [MIN_INITIAL_DEBT_KEY]: [ParamTypes.AMOUNT, minInitialDebt],
    },
    zoe,
  );
};

/**
 * @param {object} opts
 * @param {ERef<PriceAuthority>} opts.priceAuthority
 * @param {LoanTiming} opts.loanTiming
 * @param {Installation} opts.liquidationInstall
 * @param {ERef<TimerService>} opts.timer
 * @param {Amount} opts.invitationAmount
 * @param {VaultManagerParamValues} opts.vaultManagerParams
 * @param {XYKAMMPublicFacet} opts.ammPublicFacet
 * @param {object} opts.liquidationTerms
 * @param {Amount} opts.minInitialDebt
 * @param {bigint} opts.bootstrapPaymentValue
 */
const makeGovernedTerms = ({
  priceAuthority,
  loanTiming,
  liquidationInstall,
  timer,
  invitationAmount,
  vaultManagerParams,
  ammPublicFacet,
  liquidationTerms,
  minInitialDebt,
  bootstrapPaymentValue,
}) => {
  const loanTimingParams = makeParamManagerSync({
    [CHARGING_PERIOD_KEY]: ['nat', loanTiming.chargingPeriod],
    [RECORDING_PERIOD_KEY]: ['nat', loanTiming.recordingPeriod],
  }).getParams();

  const loanParams = makeVaultParamManager(vaultManagerParams).getParams();

  return harden({
    ammPublicFacet,
    priceAuthority,
    loanParams,
    loanTimingParams,
    timerService: timer,
    governedParams: makeVaultDirectorParams(
      invitationAmount,
      liquidationInstall,
      liquidationTerms,
      minInitialDebt,
    ),
    bootstrapPaymentValue,
  });
};

harden(makeVaultParamManager);
harden(makeVaultDirectorParamManager);
harden(makeGovernedTerms);

export {
  makeVaultDirectorParamManager,
  makeVaultParamManager,
  makeGovernedTerms,
};
