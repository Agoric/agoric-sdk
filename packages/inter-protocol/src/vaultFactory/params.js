import './types.js';

import {
  CONTRACT_ELECTORATE,
  makeParamManagerSync,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { makeStoredPublisherKit } from '@agoric/notifier';
import { M } from '@agoric/store';
import { TimeMath } from '@agoric/swingset-vat/src/vats/timer/timeMath.js';
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
export const SHORTFALL_INVITATION_KEY = 'ShortfallInvitation';
export const UI_VERSION_HASH_KEY = 'UiVersionHash';

/**
 * @param {Amount} electorateInvitationAmount
 * @param {Installation} liquidationInstall
 * @param {import('./liquidation.js').LiquidationTerms} liquidationTerms
 * @param {Amount} minInitialDebt
 * @param {Amount} shortfallInvitationAmount
 * @param {string} uiVersionHash
 */
const makeVaultDirectorParams = (
  electorateInvitationAmount,
  liquidationInstall,
  liquidationTerms,
  minInitialDebt,
  shortfallInvitationAmount,
  uiVersionHash = 'UNDECIDED',
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
    [SHORTFALL_INVITATION_KEY]: {
      type: ParamTypes.INVITATION,
      value: shortfallInvitationAmount,
    },
    [UI_VERSION_HASH_KEY]: { type: ParamTypes.STRING, value: uiVersionHash },
  });
};
harden(makeVaultDirectorParams);

/** @typedef {import('@agoric/governance/src/contractGovernance/typedParamManager').ParamTypesMapFromRecord<ReturnType<typeof makeVaultDirectorParams>>} VaultDirectorParams */

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {VaultManagerParamValues} initial
 */
export const makeVaultParamManager = (publisherKit, initial) =>
  makeParamManagerSync(publisherKit, {
    [DEBT_LIMIT_KEY]: [ParamTypes.AMOUNT, initial.debtLimit],
    [LIQUIDATION_MARGIN_KEY]: [ParamTypes.RATIO, initial.liquidationMargin],
    [LIQUIDATION_PENALTY_KEY]: [ParamTypes.RATIO, initial.liquidationPenalty],
    [INTEREST_RATE_KEY]: [ParamTypes.RATIO, initial.interestRate],
    [LOAN_FEE_KEY]: [ParamTypes.RATIO, initial.loanFee],
  });
/** @typedef {ReturnType<typeof makeVaultParamManager>} VaultParamManager */

export const vaultParamPattern = M.splitRecord({
  liquidationMargin: ratioPattern,
  liquidationPenalty: ratioPattern,
  interestRate: ratioPattern,
  loanFee: ratioPattern,
  debtLimit: amountPattern,
});

/**
 * @param {import('@agoric/notifier').StoredPublisherKit<GovernanceSubscriptionState>} publisherKit
 * @param {ERef<ZoeService>} zoe
 * @param {Invitation} electorateInvitation
 * @param {Installation} liquidationInstall
 * @param {object} liquidationTerms
 * @param {Amount} minInitialDebt
 * @param {Invitation} shortfallInvitation
 * @param {string} [uiVersionHash]
 */
export const makeVaultDirectorParamManager = async (
  publisherKit,
  zoe,
  electorateInvitation,
  liquidationInstall,
  liquidationTerms,
  minInitialDebt,
  shortfallInvitation,
  uiVersionHash = 'UNDECIDED',
) => {
  return makeParamManager(
    publisherKit,
    {
      [CONTRACT_ELECTORATE]: [ParamTypes.INVITATION, electorateInvitation],
      [LIQUIDATION_INSTALL_KEY]: [ParamTypes.INSTALLATION, liquidationInstall],
      [LIQUIDATION_TERMS_KEY]: [ParamTypes.UNKNOWN, liquidationTerms],
      [MIN_INITIAL_DEBT_KEY]: [ParamTypes.AMOUNT, minInitialDebt],
      [SHORTFALL_INVITATION_KEY]: [ParamTypes.INVITATION, shortfallInvitation],
      [UI_VERSION_HASH_KEY]: [ParamTypes.STRING, uiVersionHash],
    },
    zoe,
  );
};
harden(makeVaultDirectorParamManager);

/**
 * @param {{storageNode: ERef<StorageNode>, marshaller: ERef<Marshaller>}} caps
 * @param {{
 *   electorateInvitationAmount: Amount,
 *   minInitialDebt: Amount,
 *   bootstrapPaymentValue: bigint,
 *   priceAuthority: ERef<PriceAuthority>,
 *   timer: ERef<TimerService>,
 *   reservePublicFacet: AssetReservePublicFacet,
 *   liquidationInstall: Installation,
 *   loanTiming: LoanTiming,
 *   liquidationTerms: import('./liquidation.js').LiquidationTerms,
 *   ammPublicFacet: XYKAMMPublicFacet,
 *   shortfallInvitationAmount: Amount,
 *   uiVersionHash?: string,
 * }} opts
 */
export const makeGovernedTerms = (
  { storageNode, marshaller },
  {
    ammPublicFacet,
    bootstrapPaymentValue,
    electorateInvitationAmount,
    liquidationInstall,
    liquidationTerms,
    loanTiming,
    minInitialDebt,
    priceAuthority,
    reservePublicFacet,
    timer,
    shortfallInvitationAmount,
    uiVersionHash = 'UNDECIDED',
  },
) => {
  const loanTimingParams = makeParamManagerSync(
    makeStoredPublisherKit(storageNode, marshaller, 'timingParams'),
    {
      [CHARGING_PERIOD_KEY]: [
        'nat',
        TimeMath.relValue(loanTiming.chargingPeriod),
      ],
      [RECORDING_PERIOD_KEY]: [
        'nat',
        TimeMath.relValue(loanTiming.recordingPeriod),
      ],
    },
  ).getParams();

  return harden({
    ammPublicFacet,
    priceAuthority,
    loanTimingParams,
    reservePublicFacet,
    timerService: timer,
    governedParams: makeVaultDirectorParams(
      electorateInvitationAmount,
      liquidationInstall,
      liquidationTerms,
      minInitialDebt,
      shortfallInvitationAmount,
      uiVersionHash,
    ),
    bootstrapPaymentValue,
  });
};
harden(makeGovernedTerms);
