// @jessie-check

import './types.js';

import {
  CONTRACT_ELECTORATE,
  makeParamManager,
  ParamTypes,
} from '@agoric/governance';
import { subtractRatios } from '@agoric/zoe/src/contractSupport/index.js';
import { M } from '@agoric/store';
import { TimeMath } from '@agoric/time';
import { provide, provideDurableMapStore } from '@agoric/vat-data';
import { makeTracer } from '@agoric/internal/src/index.js';

import { amountPattern, ratioPattern } from '../contractSupport.js';

export const CHARGING_PERIOD_KEY = 'ChargingPeriod';
export const RECORDING_PERIOD_KEY = 'RecordingPeriod';

export const DEBT_LIMIT_KEY = 'DebtLimit';
export const LIQUIDATION_MARGIN_KEY = 'LiquidationMargin';
export const LIQUIDATION_PADDING_KEY = 'LiquidationPadding';
export const LIQUIDATION_PENALTY_KEY = 'LiquidationPenalty';
export const INTEREST_RATE_KEY = 'InterestRate';
export const MINT_FEE_KEY = 'MintFee';
export const MIN_INITIAL_DEBT_KEY = 'MinInitialDebt';
export const SHORTFALL_INVITATION_KEY = 'ShortfallInvitation';
export const REFERENCED_UI_KEY = 'ReferencedUI';

export const vaultDirectorParamTypes = {
  [MIN_INITIAL_DEBT_KEY]: ParamTypes.AMOUNT,
  [CHARGING_PERIOD_KEY]: ParamTypes.NAT,
  [RECORDING_PERIOD_KEY]: ParamTypes.NAT,
  [REFERENCED_UI_KEY]: ParamTypes.STRING,
};
harden(vaultDirectorParamTypes);

const trace = makeTracer('VaultFactory Params');

/**
 * @param {Amount<'set'>} electorateInvitationAmount
 * @param {Amount<'nat'>} minInitialDebt
 * @param {Amount<'set'>} shortfallInvitationAmount
 * @param {string} referencedUi
 * @param {InterestTiming} interestTiming
 */
const makeVaultDirectorParams = (
  electorateInvitationAmount,
  minInitialDebt,
  shortfallInvitationAmount,
  referencedUi,
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
    [REFERENCED_UI_KEY]: { type: ParamTypes.STRING, value: referencedUi },
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

/**
 * @typedef {import('@agoric/governance/src/contractGovernance/paramManager').ParamTypesMapFromRecord<
 *     ReturnType<typeof makeVaultDirectorParams>
 *   >} VaultDirectorParams
 */

/** @type {(liquidationMargin: Ratio) => Ratio} */
const zeroRatio = liquidationMargin =>
  subtractRatios(liquidationMargin, liquidationMargin);

/** @typedef {import('@agoric/governance/src/contractGovernance/paramManager.js').ParamGovernanceExoMakers} ParamGovernanceExoMakers */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {VaultManagerParamValues} initial
 * @param {ParamGovernanceExoMakers} paramMakerKit
 */
export const makeVaultParamManager = (
  baggage,
  recorderKit,
  {
    debtLimit,
    interestRate,
    liquidationMargin,
    liquidationPadding = zeroRatio(liquidationMargin),
    liquidationPenalty,
    mintFee,
  },
  paramMakerKit,
) => {
  return makeParamManager(
    recorderKit,
    baggage,
    {
      [DEBT_LIMIT_KEY]: [ParamTypes.AMOUNT, debtLimit],
      [INTEREST_RATE_KEY]: [ParamTypes.RATIO, interestRate],
      [LIQUIDATION_PADDING_KEY]: [ParamTypes.RATIO, liquidationPadding],
      [LIQUIDATION_MARGIN_KEY]: [ParamTypes.RATIO, liquidationMargin],
      [LIQUIDATION_PENALTY_KEY]: [ParamTypes.RATIO, liquidationPenalty],
      [MINT_FEE_KEY]: [ParamTypes.RATIO, mintFee],
    },
    paramMakerKit,
  );
};
/** @typedef {ReturnType<typeof makeVaultParamManager>} VaultParamManager */

export const vaultParamPattern = M.splitRecord(
  {
    liquidationMargin: ratioPattern,
    liquidationPenalty: ratioPattern,
    interestRate: ratioPattern,
    mintFee: ratioPattern,
    debtLimit: amountPattern,
  },
  {
    // optional for backwards compatibility, e.g. with loadgen
    liquidationPadding: ratioPattern,
  },
);

/**
 * @param {{
 *   auctioneerPublicFacet: ERef<AuctioneerPublicFacet>;
 *   electorateInvitationAmount: Amount<'set'>;
 *   minInitialDebt: Amount<'nat'>;
 *   bootstrapPaymentValue: bigint;
 *   priceAuthority: ERef<PriceAuthority>;
 *   timer: ERef<import('@agoric/time/src/types').TimerService>;
 *   reservePublicFacet: AssetReservePublicFacet;
 *   interestTiming: InterestTiming;
 *   shortfallInvitationAmount: Amount<'set'>;
 *   referencedUi?: string;
 * }} opts
 */
export const makeGovernedTerms = ({
  auctioneerPublicFacet,
  bootstrapPaymentValue,
  electorateInvitationAmount,
  interestTiming,
  minInitialDebt,
  priceAuthority,
  reservePublicFacet,
  timer,
  shortfallInvitationAmount,
  referencedUi = 'NO REFERENCE',
}) => {
  return harden({
    auctioneerPublicFacet,
    priceAuthority,
    reservePublicFacet,
    timerService: timer,
    governedParams: makeVaultDirectorParams(
      electorateInvitationAmount,
      minInitialDebt,
      shortfallInvitationAmount,
      referencedUi,
      interestTiming,
    ),
    bootstrapPaymentValue,
  });
};
harden(makeGovernedTerms);

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const provideVaultParamManagers = (baggage, makeRecorderKit) => {
  /** @type {MapStore<Brand, VaultParamManager>} */
  const managers = provideDurableMapStore(baggage, 'vaultsParamManagers');
  provide(baggage, 'paramManagerCount', () => 0);

  // the param managers weren't originally durable, so we stored the initial
  // values of the parameters. Now that we have durable PMs, we'll be extracting
  // the initial values from this store, and can drop the store later.
  /**
   * @type {MapStore<
   *   Brand,
   *   {
   *     storageNode: StorageNode;
   *     govStorageNode: StorageNode;
   *     initialParamValues: VaultManagerParamValues;
   *     makers: ParamGovernanceExoMakers;
   *     directorAccessors: {
   *       behavior: Record<string, Function>;
   *       guards: Record<string, import('@endo/patterns').Pattern>;
   *     };
   *   }
   * >}
   */
  const managerArgs = provideDurableMapStore(
    baggage,
    'vault param manager parts',
  );

  const makeManager = (
    brand,
    { govStorageNode, initialParamValues, makers },
  ) => {
    const paramManagerCount = baggage.get('paramManagerCount') + 1;
    baggage.set('paramManagerCount', paramManagerCount);

    const manager = provide(
      baggage,
      `vaultManager-${paramManagerCount} paramManager`,
      () =>
        makeVaultParamManager(
          baggage,
          makeRecorderKit(govStorageNode),
          initialParamValues,
          makers,
        ),
    );

    managers.init(brand, manager);
    return manager;
  };

  // To convert to durable paramManagers, we will extract the values in baggage,
  // and use them to build durable PMs then delete the values so we don't
  // try to do it again.  This will NOT restore the most recent values; The EC
  // will have to restore the values they want before enabling trading.
  trace('extracting paramManagers from baggage', managerArgs.keys());
  for (const [brand, args] of managerArgs.entries()) {
    makeManager(brand, args);
    managerArgs.delete(brand);
  }

  return {
    /**
     * @param {Brand} brand
     * @param {StorageNode} storageNode
     * @param {StorageNode} govStorageNode
     * @param {VaultManagerParamValues} initialParamValues
     * @param {ParamGovernanceExoMakers} makers
     */
    addParamManager(
      brand,
      storageNode,
      govStorageNode,
      initialParamValues,
      makers,
    ) {
      const args = harden({
        storageNode,
        govStorageNode,
        initialParamValues,
        makers,
      });
      return makeManager(brand, args);
    },
    /** @param {Brand} brand */
    get(brand) {
      return managers.get(brand);
    },

    /**
     * @param {Brand} brand
     * @returns {import('./vaultManager.js').GovernedParamGetters}
     */
    getParamReader(brand) {
      // @ts-expect-error override.
      return managers.get(brand).getters();
    },
  };
};
harden(provideVaultParamManagers);
