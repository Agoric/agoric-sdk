// @ts-check

import './types.js';

import {
  makeGovernedInvitation,
  makeParamManagerBuilder,
  CONTRACT_ELECTORATE,
  makeParamManagerSync,
  makeParamManager,
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
 */
const makeElectorateParamManager = async (zoe, electorateInvitation) => {
  return makeParamManager(
    {
      [CONTRACT_ELECTORATE]: {
        type: 'invitation',
        value: electorateInvitation,
      },
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
  const timingParamMgr = makeParamManagerSync({
    [CHARGING_PERIOD_KEY]: { type: 'nat', value: loanTiming.chargingPeriod },
    [RECORDING_PERIOD_KEY]: { type: 'nat', value: loanTiming.recordingPeriod },
  });

  // FIXME support branded ratios
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
