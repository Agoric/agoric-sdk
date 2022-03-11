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

export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';

/**
 * @param {Amount} electorateInvitationAmount
 */
const makeElectorateParams = electorateInvitationAmount => {
  return harden({
    [CONTRACT_ELECTORATE]: makeGovernedInvitation(electorateInvitationAmount),
  });
};

/**
 * @param {LoanTiming} initialValues
 * @returns {ParamManagerFull & {
 *   updateChargingPeriod: (period: bigint) => void,
 *   updateRecordingPeriod: (period: bigint) => void,
 * }}
 */
const makeLoanTimingManager = initialValues => {
  // @ts-expect-error until makeParamManagerBuilder can be generic */
  return makeParamManagerBuilder()
    .addNat(CHARGING_PERIOD_KEY, initialValues.chargingPeriod)
    .addNat(RECORDING_PERIOD_KEY, initialValues.recordingPeriod)
    .build();
};

/**
 * @param {Rates} rates
 * @returns {VaultParamManager}
 */
const makeVaultParamManager = rates => {
  // @ts-expect-error until makeParamManagerBuilder can be generic */
  return makeParamManagerBuilder()
    .addBrandedRatio(LIQUIDATION_MARGIN_KEY, rates.liquidationMargin)
    .addBrandedRatio(INTEREST_RATE_KEY, rates.interestRate)
    .addBrandedRatio(LOAN_FEE_KEY, rates.loanFee)
    .build();
};

/**
 * @param {ERef<ZoeService>} zoe
 * @param {Invitation} electorateInvitation
 * @returns {Promise<{
 *   getParams: GetGovernedVaultParams,
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
 * @param {LoanTiming} loanTiming
 * @param {Installation} liquidationInstall
 * @param {ERef<TimerService>} timerService
 * @param {Amount} invitationAmount
 * @param {Rates} rates
 * @param {XYKAMMPublicFacet} ammPublicFacet
 * @param {bigint=} bootstrapPaymentValue
 */
const makeGovernedTerms = (
  priceAuthority,
  loanTiming,
  liquidationInstall,
  timerService,
  invitationAmount,
  rates,
  ammPublicFacet,
  bootstrapPaymentValue = 0n,
) => {
  const timingParamMgr = makeLoanTimingManager(loanTiming);

  const rateParamMgr = makeVaultParamManager(rates);

  return harden({
    ammPublicFacet,
    priceAuthority,
    loanParams: rateParamMgr.getParams(),
    loanTimingParams: timingParamMgr.getParams(),
    timerService,
    liquidationInstall,
    main: makeElectorateParams(invitationAmount),
    bootstrapPaymentValue,
  });
};

harden(makeVaultParamManager);
harden(makeElectorateParamManager);
harden(makeGovernedTerms);

export { makeElectorateParamManager, makeVaultParamManager, makeGovernedTerms };
