// @jessie-check

import './types.js';

import {
  CONTRACT_ELECTORATE,
  makeParamManagerSync,
  ParamTypes,
} from '@agoric/governance';
import {
  makeRecorderTopic,
  subtractRatios,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/index.js';
import { M, makeScalarMapStore } from '@agoric/store';
import { TimeMath } from '@agoric/time';
import { prepareExo, provideDurableMapStore } from '@agoric/vat-data';
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

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').RecorderKit<any>} recorderKit
 * @param {VaultManagerParamValues} initial
 * @param {any} paramMakerKit
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
  return makeParamManagerSync(
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
 * @typedef {object} VaultParamManagerPair
 * @property {VaultParamManager} powerful notice that only vaultDirector's
 *   creatorFacet gets access to the unrestricted object.
 * @property {any} readOnly
 */

/**
 * @param {import('@agoric/vat-data').Baggage} baggage
 * @param {import('@agoric/zoe/src/contractSupport/recorder.js').MakeRecorderKit} makeRecorderKit
 */
export const provideVaultParamManagers = (baggage, makeRecorderKit) => {
  /** @type {MapStore<Brand, VaultParamManagerPair>} */
  const managers = makeScalarMapStore();
  let paramManagerCount = 0;

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
   *     makers: any;
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
    { govStorageNode, initialParamValues, makers, directorAccessors },
  ) => {
    paramManagerCount += 1;

    const gRecorderKit = makeRecorderKit(govStorageNode);
    const topic = makeRecorderTopic('vaultManager Governance', gRecorderKit);
    const manager = makeVaultParamManager(
      baggage,
      gRecorderKit,
      initialParamValues,
      makers,
    );

    const readOnly = prepareExo(
      baggage,
      `vault-${paramManagerCount} paramManager`,
      M.interface('vault paramManager', {
        ...directorAccessors.guards,
        ...manager.accessors().guards,
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
      {
        ...manager.accessors().behavior,
        ...directorAccessors.behavior,
        getPublicTopics: () => harden({ governance: topic }),
      },
    );

    managers.init(brand, { powerful: manager, readOnly });
    return manager;
  };

  // To convert to durable paramManagers, we will extract the values in baggage,
  // and use them to build durable PMs then delete the values so we don't
  // try to do it again.  This will NOT restore the most recent values; The EC
  // will have to restore the values they want before enabling trading.
  // [...managerArgs.entries()].map(([brand, args]) => makeManager(brand, args));
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
     * @param {any} makers
     * @param {{
     *   behavior: Record<string, Function>;
     *   guards: Record<string, Pattern>;
     * }} directorAccessors
     */
    addParamManager(
      brand,
      storageNode,
      govStorageNode,
      initialParamValues,
      makers,
      directorAccessors,
    ) {
      const args = harden({
        storageNode,
        govStorageNode,
        initialParamValues,
        makers,
        directorAccessors,
      });
      return makeManager(brand, args);
    },
    /** @param {Brand} brand */
    get(brand) {
      return managers.get(brand).powerful;
    },

    /** @param {Brand} brand */
    getParamReader(brand) {
      return managers.get(brand).readOnly;
    },
  };
};
harden(provideVaultParamManagers);
