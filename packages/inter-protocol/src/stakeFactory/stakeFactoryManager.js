// @ts-check
// @jessie-check
import { AmountMath } from '@agoric/ertp';
import { makePublishKit, observeNotifier } from '@agoric/notifier';
import { fit, getCopyBagEntries, M } from '@agoric/store';
import { defineKindMulti } from '@agoric/vat-data';
import { floorMultiplyBy } from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { E } from '@endo/far';
import { checkDebtLimit } from '../contractSupport.js';
import { chargeInterest } from '../interest.js';
import { makeTracer } from '../makeTracer.js';
import { ManagerKW as KW } from './constants.js';

const { details: X } = assert;

const trace = makeTracer('RSM', false);

/**
 * @typedef {{
 *   getDebtLimit: () => Amount<'nat'>,
 *   getInterestRate: () => Ratio,
 *   getMintingRatio: () => Ratio,
 *   getLoanFee: () => Ratio,
 * }} ParamManager
 * @typedef {{
 *   compoundedInterest: Ratio,
 *   latestInterestUpdate: Timestamp,
 *   totalDebt: Amount<'nat'>,
 * }} AssetState
 * @typedef {Readonly<{
 *   assetPublisher: Publisher<AssetState>,
 *   assetSubscriber: Subscriber<AssetState>,
 *   brands: { debt: Brand<'nat'>, Attestation: Brand<'copyBag'>, Stake: Brand<'nat'> },
 *   mintPowers: { burnDebt: BurnDebt, getGovernedParams: () => ParamManager, mintAndReallocate: MintAndReallocate },
 *   chargingPeriod: RelativeTime,
 *   debtMint: ZCFMint<'nat'>,
 *   poolIncrementSeat: ZCFSeat,
 *   recordingPeriod: RelativeTime,
 *   startTimeStamp: Timestamp,
 *   timerService: ERef<TimerService>,
 *   zcf: ZCF,
 * }>} ImmutableState
 * @typedef {AssetState & {
 * }} MutableState
 * @typedef {ImmutableState & MutableState} State
 * @typedef {Readonly<{
 *   state: State,
 *   facets: import('@agoric/vat-data/src/types').KindFacets<typeof behavior>,
 * }>} MethodContext
 */

/**
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {{ debt: Brand<'nat'>, Attestation: Brand<'copyBag'>, Stake: Brand<'nat'> }} brands
 * @param {{ burnDebt: BurnDebt, getGovernedParams: () => ParamManager, mintAndReallocate: MintAndReallocate }} mintPowers
 * @param {object} timing
 * @param {ERef<TimerService>} timing.timerService
 * @param {RelativeTime} timing.chargingPeriod
 * @param {RelativeTime} timing.recordingPeriod
 * @param {Timestamp} timing.startTimeStamp
 *
 * @returns {State}
 */
const initState = (
  zcf,
  debtMint,
  brands,
  mintPowers,
  { chargingPeriod, recordingPeriod, startTimeStamp, timerService },
) => {
  const totalDebt = AmountMath.makeEmpty(brands.debt, 'nat');
  const compoundedInterest = makeRatio(100n, brands.debt); // starts at 1.0, no interest
  const latestInterestUpdate = startTimeStamp;

  const { publisher: assetPublisher, subscriber: assetSubscriber } =
    makePublishKit();
  assetPublisher.publish(
    harden({
      compoundedInterest,
      interestRate: mintPowers.getGovernedParams().getInterestRate(),
      latestInterestUpdate,
      totalDebt,
    }),
  );

  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

  return {
    assetSubscriber,
    assetPublisher,
    brands,
    chargingPeriod,
    compoundedInterest,
    debtMint,
    latestInterestUpdate,
    mintPowers,
    poolIncrementSeat,
    recordingPeriod,
    startTimeStamp,
    timerService,
    totalDebt,
    zcf,
  };
};

/**
 *
 * @param {MethodContext} context
 */
const finish = ({ state, facets }) => {
  const { recordingPeriod, timerService, zcf } = state;
  const { helper } = facets;

  const periodNotifier = E(timerService).makeNotifier(0n, recordingPeriod);

  void observeNotifier(periodNotifier, {
    updateState: updateTime =>
      helper
        .chargeAllVaults(updateTime)
        .catch(e =>
          console.error('🚨 stakeFactoryManager failed to charge interest', e),
        ),
    fail: reason => {
      zcf.shutdownWithFailure(
        assert.error(X`Unable to continue without a timer: ${reason}`),
      );
    },
    finish: done => {
      zcf.shutdownWithFailure(
        assert.error(X`Unable to continue without a timer: ${done}`),
      );
    },
  });
};

const helper = {
  /**
   * @param {MethodContext} context
   * @param {Timestamp} updateTime
   */
  chargeAllVaults: async ({ state }, updateTime) => {
    const { debtMint, mintPowers, poolIncrementSeat } = state;
    trace('chargeAllVaults', { updateTime });
    const interestRate = mintPowers.getGovernedParams().getInterestRate();

    const changes = chargeInterest(
      {
        mint: debtMint,
        mintAndReallocateWithFee: mintPowers.mintAndReallocate,
        poolIncrementSeat,
        seatAllocationKeyword: KW.Debt,
      },
      {
        interestRate,
        chargingPeriod: state.chargingPeriod,
        recordingPeriod: state.recordingPeriod,
      },
      {
        latestInterestUpdate: state.latestInterestUpdate,
        compoundedInterest: state.compoundedInterest,
        totalDebt: state.totalDebt,
      },
      updateTime,
    );
    state.compoundedInterest = changes.compoundedInterest;
    state.latestInterestUpdate = changes.latestInterestUpdate;
    state.totalDebt = changes.totalDebt;

    const payload = harden({
      compoundedInterest: state.compoundedInterest,
      interestRate,
      latestInterestUpdate: state.latestInterestUpdate,
      totalDebt: state.totalDebt,
    });
    const { assetPublisher: assetUpdater } = state;
    assetUpdater.publish(payload);

    trace('chargeAllVaults complete', payload);
  },
};

const manager = {
  /**
   * @param {MethodContext} context
   * @param { Amount<'copyBag'>} attestationGiven
   * */
  maxDebtForLien: ({ state }, attestationGiven) => {
    const { brands, mintPowers } = state;
    const mintingRatio = mintPowers.getGovernedParams().getMintingRatio();
    assert.equal(
      mintingRatio.numerator.brand,
      brands.debt,
      X`${mintingRatio} not in Debt / Stake`,
    );
    assert.equal(
      mintingRatio.denominator.brand,
      brands.Stake,
      X`${mintingRatio} not in Debt / Stake`,
    );
    assert.equal(
      attestationGiven.brand,
      brands.Attestation,
      X`Invalid Attestation ${attestationGiven}. Expected brand ${brands.Attestation}`,
    );
    fit(
      attestationGiven.value,
      M.bagOf([M.string(), M.bigint()]),
      'attestationGiven',
    );
    const [[_addr, valueLiened]] = getCopyBagEntries(attestationGiven.value);
    const amountLiened = AmountMath.make(brands.Stake, valueLiened);
    const maxDebt = floorMultiplyBy(amountLiened, mintingRatio);
    return { maxDebt, amountLiened };
  },

  /**
   * Update total debt of this manager given the change in debt on a vault
   *
   * @param {MethodContext} context
   * @param {Amount<'nat'>} oldDebtOnVault
   * @param {Amount<'nat'>} newDebtOnVault
   */
  // TODO: Add limits for amounts between vault and vault manager
  // https://github.com/Agoric/agoric-sdk/issues/4599
  applyDebtDelta: ({ state }, oldDebtOnVault, newDebtOnVault) => {
    // This does not use AmountMath because it could be validly negative
    const delta = newDebtOnVault.value - oldDebtOnVault.value;
    trace(`updating total debt ${state.totalDebt} by ${delta}`);
    if (delta === 0n) {
      // nothing to do
      return;
    }

    const { brands } = state;
    // totalDebt += delta (Amount type ensures natural value)
    state.totalDebt = AmountMath.make(
      brands.debt,
      state.totalDebt.value + delta,
    );
  },

  /**
   * @param {MethodContext} context
   * @param {Amount} toMint
   * @param {Amount} fee
   * @param {ZCFSeat} seat
   * @param {...ZCFSeat} otherSeats
   * @returns {void}
   */
  mintAndReallocate: ({ state }, toMint, fee, seat, ...otherSeats) => {
    const { mintPowers } = state;
    checkDebtLimit(
      mintPowers.getGovernedParams().getDebtLimit(),
      state.totalDebt,
      toMint,
    );
    mintPowers.mintAndReallocate(toMint, fee, seat, ...otherSeats);
    state.totalDebt = AmountMath.add(state.totalDebt, toMint);
  },

  /** @param {MethodContext} context */
  getMintingRatio: ({ state }) =>
    state.mintPowers.getGovernedParams().getMintingRatio(),
  /** @param {MethodContext} context */
  getInterestRate: ({ state }) =>
    state.mintPowers.getGovernedParams().getInterestRate(),
  /** @param {MethodContext} context */
  getLoanFee: ({ state }) => state.mintPowers.getGovernedParams().getLoanFee(),
  /**
   * @param {MethodContext} context
   * @param {Amount} toBurn
   * @param {ZCFSeat} seat
   */
  burnDebt: ({ state }, toBurn, seat) =>
    state.mintPowers.burnDebt(toBurn, seat),

  /** @param {MethodContext} context */
  getDebtBrand: ({ state }) => state.brands.debt,
  /** @param {MethodContext} context */
  getCollateralBrand: ({ state }) => state.brands.Attestation,

  /** @param {MethodContext} context */
  getCompoundedInterest: ({ state }) => state.compoundedInterest,
  /** @param {MethodContext} context */
  getAssetSubscriber: ({ state }) => state.assetSubscriber,
};

const behavior = { helper, manager };

export const makeStakeFactoryManager = defineKindMulti(
  'StakeFactoryManager',
  initState,
  behavior,
  { finish },
);
/**
 * @typedef {ReturnType<typeof makeStakeFactoryManager>['manager']} StakeFactoryManager
 */
