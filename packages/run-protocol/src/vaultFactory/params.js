// @ts-check

import './types.js';

import {
  makeGovernedNat,
  makeGovernedInvitation,
  makeGovernedRatio,
  makeParamManagerBuilder,
  CONTRACT_ELECTORATE,
} from '@agoric/governance';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const INITIAL_MARGIN_KEY = 'InitialMargin';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';

/**
 * @param {Amount} electorateInvitationAmount
 * @returns {Record<string,ParamShortDescription>}
 */
const makeElectorateParams = electorateInvitationAmount => {
  return harden({
    [CONTRACT_ELECTORATE]: makeGovernedInvitation(electorateInvitationAmount),
  });
};

/**
 * @typedef {Object} LoanParams
 * @property {RelativeTime} chargingPeriod
 * @property {RelativeTime} recordingPeriod
 */

/**
 * @param {LoanParams} loanParams
 * @param {Rates} rates
 * @returns {Record<string,ParamShortDescription>}
 */
const makeLoanParams = (loanParams, rates) => {
  return harden({
    [CHARGING_PERIOD_KEY]: makeGovernedNat(loanParams.chargingPeriod),
    [RECORDING_PERIOD_KEY]: makeGovernedNat(loanParams.recordingPeriod),
    [INITIAL_MARGIN_KEY]: makeGovernedRatio(rates.initialMargin),
    [LIQUIDATION_MARGIN_KEY]: makeGovernedRatio(rates.liquidationMargin),
    [INTEREST_RATE_KEY]: makeGovernedRatio(rates.interestRate),
    [LOAN_FEE_KEY]: makeGovernedRatio(rates.loanFee),
  });
};

/**
 * @param {LoanParams} loanParams
 * @param {Rates} rates
 * @returns {VaultParamManager}
 */
const makeVaultParamManager = (loanParams, rates) => {
  // @ts-expect-error casting to VaultParamManager
  return makeParamManagerBuilder()
    .addNat(CHARGING_PERIOD_KEY, loanParams.chargingPeriod)
    .addNat(RECORDING_PERIOD_KEY, loanParams.recordingPeriod)
    .addBrandedRatio(INITIAL_MARGIN_KEY, rates.initialMargin)
    .addBrandedRatio(LIQUIDATION_MARGIN_KEY, rates.liquidationMargin)
    .addBrandedRatio(INTEREST_RATE_KEY, rates.interestRate)
    .addBrandedRatio(LOAN_FEE_KEY, rates.loanFee)
    .build();
};

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Invitation} electorateInvitation
 * @returns {Promise<{
 *   getParams: GetParams,
 *   getInvitationAmount: (name: string) => Amount,
 *   getInternalParamValue: (name: string) => Invitation,
 *   updateElectorate: (invitation: Invitation) => void,
 * }>}
 */
const makeElectorateParamManager = async (zoe, electorateInvitation) => {
  // @ts-expect-error casting to ElectorateParamManager
  return makeParamManagerBuilder(zoe)
    .addInvitation(CONTRACT_ELECTORATE, electorateInvitation)
    .then(builder => builder.build());
};

/**
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {LoanParams} loanParams
 * @param {Installation} liquidationInstall
 * @param {ERef<TimerService>} timerService
 * @param {Amount} invitationAmount
 * @param {Rates} rates
 * @param {XYKAMMPublicFacet} ammPublicFacet
 * @param {bigint=} bootstrapPaymentValue
 * @returns {{
 *   ammPublicFacet: XYKAMMPublicFacet,
 *   priceAuthority: ERef<PriceAuthority>,
 *   loanParams: Record<Keyword,ParamShortDescription>,
 *   timerService: ERef<TimerService>,
 *   liquidationInstall: Installation,
 *   main: Record<Keyword,ParamShortDescription>,
 *   bootstrapPaymentValue: bigint,
 * }}
 */
const makeGovernedTerms = (
  priceAuthority,
  loanParams,
  liquidationInstall,
  timerService,
  invitationAmount,
  rates,
  ammPublicFacet,
  bootstrapPaymentValue = 0n,
) => {
  const vaultParamMgr = makeVaultParamManager(loanParams, rates);

  return harden({
    ammPublicFacet,
    priceAuthority,
    loanParams: vaultParamMgr.getParams(),
    timerService,
    liquidationInstall,
    main: makeElectorateParams(invitationAmount),
    bootstrapPaymentValue,
  });
};

harden(makeVaultParamManager);
harden(makeElectorateParamManager);
harden(makeGovernedTerms);
harden(makeLoanParams);
harden(makeElectorateParams);

export {
  makeElectorateParamManager,
  makeVaultParamManager,
  makeGovernedTerms,
  makeLoanParams,
  makeElectorateParams,
};
