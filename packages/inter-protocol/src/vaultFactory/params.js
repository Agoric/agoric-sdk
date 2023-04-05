import './types.js';

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  makeParamManagerSync,
  ParamTypes,
} from '@agoric/governance';
import { M } from '@agoric/store';
import { TimeMath } from '@agoric/time';
import { subtractRatios } from '@agoric/zoe/src/contractSupport/ratio.js';
import { amountPattern, ratioPattern } from '../contractSupport.js';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const DEBT_LIMIT_KEY = 'DebtLimit';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const LIQUIDATION_PADDING_KEY = 'LiquidationPadding';
export const LIQUIDATION_PENALTY_KEY = 'LiquidationPenalty';
export const INTEREST_RATE_KEY = 'InterestRate';
export const LOAN_FEE_KEY = 'LoanFee';
export const MIN_INITIAL_DEBT_KEY = 'MinInitialDebt';
export const SHORTFALL_INVITATION_KEY = 'ShortfallInvitation';
export const ENDORSED_UI_KEY = 'EndorsedUI';

/**
 * @param {Amount} electorateInvitationAmount
 * @param {Amount<'nat'>} minInitialDebt
 * @param {Amount} shortfallInvitationAmount
 * @param {string} endorsedUi
 * @param {InterestTiming} interestTiming
 */
const makeVaultDirectorParams = (
  electorateInvitationAmount,
  minInitialDebt,
  shortfallInvitationAmount,
  endorsedUi,
  interestTiming,
) => {
  return harden({
    [CONTRACT_ELECTORATE]: {
      type: ParamTypes.INVITATION,
      value: electorateInvitationAmount,
    },
    [MIN_INITIAL_DEBT_KEY]: {
      type: ParamTypes.AMOUNT,
      value: minInitialDebt,
    },
    [SHORTFALL_INVITATION_KEY]: {
      type: ParamTypes.INVITATION,
      value: shortfallInvitationAmount,
    },
    [ENDORSED_UI_KEY]: { type: ParamTypes.STRING, value: endorsedUi },
    [CHARGING_PERIOD_KEY]: {
      type: ParamTypes.NAT,
      value: TimeMath.relValue(interestTiming.chargingPeriod),
    },
    [RECORDING_PERIOD_KEY]: {
      type: ParamTypes.NAT,
      value: TimeMath.relValue(interestTiming.recordingPeriod),
    },
  });
};
harden(makeVaultDirectorParams);

/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager').ParamTypesMapFromRecord<ReturnType<typeof makeVaultDirectorParams>>} VaultDirectorParams */

/** @type {(liquidationMargin: Ratio) => Ratio} */
const zeroRatio = liquidationMargin =>
  subtractRatios(liquidationMargin, liquidationMargin);

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {VaultManagerParamValues} initial
 */
export const makeVaultParamManager = (
  publisherKit,
  {
    debtLimit,
    interestRate,
    liquidationMargin,
    liquidationPadding = zeroRatio(liquidationMargin),
    liquidationPenalty,
    loanFee,
  },
) =>
  makeParamManagerSync(publisherKit, {
    [DEBT_LIMIT_KEY]: [ParamTypes.AMOUNT, debtLimit],
    [INTEREST_RATE_KEY]: [ParamTypes.RATIO, interestRate],
    [LIQUIDATION_PADDING_KEY]: [ParamTypes.RATIO, liquidationPadding],
    [LIQUIDATION_MARGIN_KEY]: [ParamTypes.RATIO, liquidationMargin],
    [LIQUIDATION_PENALTY_KEY]: [ParamTypes.RATIO, liquidationPenalty],
    [LOAN_FEE_KEY]: [ParamTypes.RATIO, loanFee],
  });
/** @typedef {ReturnType<typeof makeVaultParamManager>} VaultParamManager */

export const vaultParamPattern = M.splitRecord(
  {
    liquidationMargin: ratioPattern,
    liquidationPenalty: ratioPattern,
    interestRate: ratioPattern,
    loanFee: ratioPattern,
    debtLimit: amountPattern,
  },
  {
    // optional for backwards compatibility, e.g. with loadgen
    liquidationPadding: ratioPattern,
  },
);

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ERef<ZoeService>} zoe
 * @param {GovernanceTerms<import('./params').VaultDirectorParams>['governedParams']} governedParams
 * @param electorateInvitation
 * @param shortfallInvitation
 */
export const makeVaultDirectorParamManager = async (
  publisherKit,
  zoe,
  governedParams,
  electorateInvitation,
  shortfallInvitation,
) => {
  return makeParamManager(
    publisherKit,
    {
      [MIN_INITIAL_DEBT_KEY]: [
        governedParams[MIN_INITIAL_DEBT_KEY].type,
        governedParams[MIN_INITIAL_DEBT_KEY].value,
      ],
      [CHARGING_PERIOD_KEY]: [
        governedParams[CHARGING_PERIOD_KEY].type,
        governedParams[CHARGING_PERIOD_KEY].value,
      ],
      [RECORDING_PERIOD_KEY]: [
        governedParams[RECORDING_PERIOD_KEY].type,
        governedParams[RECORDING_PERIOD_KEY].value,
      ],
      [ENDORSED_UI_KEY]: [
        governedParams[ENDORSED_UI_KEY].type,
        governedParams[ENDORSED_UI_KEY].value,
      ],
      // private invitations
      [CONTRACT_ELECTORATE]: [ParamTypes.INVITATION, electorateInvitation],
      [SHORTFALL_INVITATION_KEY]: [ParamTypes.INVITATION, shortfallInvitation],
    },
    zoe,
  );
};
harden(makeVaultDirectorParamManager);

/**
 * @param {{}} _ FIXME remove
 * @param {{
 *   auctioneerPublicFacet: ERef<AuctioneerPublicFacet>,
 *   electorateInvitationAmount: Amount,
 *   minInitialDebt: Amount<'nat'>,
 *   bootstrapPaymentValue: bigint,
 *   priceAuthority: ERef<PriceAuthority>,
 *   timer: ERef<import('@agoric/time/src/types').TimerService>,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   interestTiming: InterestTiming,
 *   shortfallInvitationAmount: Amount,
 *   endorsedUi?: string,
 * }} opts
 */
export const makeGovernedTerms = (
  _,
  {
    auctioneerPublicFacet,
    bootstrapPaymentValue,
    electorateInvitationAmount,
    interestTiming,
    minInitialDebt,
    priceAuthority,
    reservePublicFacet,
    timer,
    shortfallInvitationAmount,
    endorsedUi = 'NO ENDORSEMENT',
  },
) => {
  return harden({
    auctioneerPublicFacet,
    priceAuthority,
    reservePublicFacet,
    timerService: timer,
    governedParams: makeVaultDirectorParams(
      electorateInvitationAmount,
      minInitialDebt,
      shortfallInvitationAmount,
      endorsedUi,
      interestTiming,
    ),
    bootstrapPaymentValue,
  });
};
harden(makeGovernedTerms);
