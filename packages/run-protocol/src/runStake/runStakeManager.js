// @ts-check
// @jessie-check
import { AmountMath } from '@agoric/ertp';
import { floorMultiplyBy } from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { fit, getCopyBagEntries, M } from '@agoric/store';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { E } from '@endo/far';
import { makeTracer } from '../makeTracer.js';
import { chargeInterest } from '../interest.js';
import { KW } from './runStakeKit.js';
import { checkDebtLimit } from '../contractSupport.js';

const { details: X } = assert;

const trace = makeTracer('RM'); // TODO: how to turn this off?

/**
 * @typedef {{
 * compoundedInterest: Ratio,
 * latestInterestUpdate: NatValue,
 * totalDebt: Amount<'nat'>,
 * }} AssetState
 * @typedef {AssetState & {
 * assetNotifier: Notifier<AssetState>,
 * assetUpdater: IterationObserver<AssetState>,
 * chargingPeriod: bigint,
 * periodNotifier: Promise<Notifier<bigint>>,
 * poolIncrementSeat: ZCFSeat,
 * recordingPeriod: bigint,
 * startTimeStamp: bigint,
 * }} ImmutableState
 * @typedef {{
 * }} MutableState
 * @typedef {ImmutableState & MutableState} State
 */

/**
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {{ debt: Brand<'nat'>, Attestation: Brand<'copyBag'>, Stake: Brand<'nat'> }} brands
 * @param {{
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getMintingRatio: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} paramManager
 * @param {MintAndReallocate} mintAndReallocateWithFee
 * @param {BurnDebt} burnDebt
 * @param {Object} timing
 * @param {ERef<TimerService>} timing.timerService
 * @param {bigint} timing.chargingPeriod
 * @param {bigint} timing.recordingPeriod
 * @param {bigint} timing.startTimeStamp
 *
 * @returns {State}
 */
const initState = (
  zcf,
  debtMint,
  brands,
  paramManager,
  mintAndReallocateWithFee,
  burnDebt,
  { chargingPeriod, recordingPeriod, startTimeStamp, timerService },
) => {
  const totalDebt = AmountMath.makeEmpty(brands.debt, 'nat');
  const compoundedInterest = makeRatio(100n, brands.debt); // starts at 1.0, no interest
  const latestInterestUpdate = startTimeStamp;

  const { updater: assetUpdater, notifier: assetNotifier } = makeNotifierKit(
    harden({
      compoundedInterest,
      interestRate: paramManager.getInterestRate(),
      latestInterestUpdate,
      totalDebt,
    }),
  );

  // ??? does this promise need to be a presence?
  const periodNotifier = E(timerService).makeNotifier(0n, recordingPeriod);
  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

  return {
    assetNotifier,
    assetUpdater,
    chargingPeriod,
    compoundedInterest,
    latestInterestUpdate,
    periodNotifier,
    poolIncrementSeat,
    recordingPeriod,
    startTimeStamp,
    totalDebt,
  };
};

/**
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {{ debt: Brand<'nat'>, Attestation: Brand<'copyBag'>, Stake: Brand<'nat'> }} brands
 * @param {{
 *  getDebtLimit: () => Amount<'nat'>,
 *  getInterestRate: () => Ratio,
 *  getMintingRatio: () => Ratio,
 *  getLoanFee: () => Ratio,
 * }} paramManager
 * @param {MintAndReallocate} mintAndReallocateWithFee
 * @param {BurnDebt} burnDebt
 * @param {Object} timing
 * @param {ERef<TimerService>} timing.timerService
 * @param {bigint} timing.chargingPeriod
 * @param {bigint} timing.recordingPeriod
 * @param {bigint} timing.startTimeStamp
 *
 * @typedef {ReturnType<typeof makeRunStakeManager>} RunStakeManager
 */
export const makeRunStakeManager = (
  zcf,
  debtMint,
  brands,
  paramManager,
  mintAndReallocateWithFee,
  burnDebt,
  timing,
) => {
  /** @param { Amount<'copyBag'>} attestationGiven */
  const maxDebtForLien = attestationGiven => {
    const mintingRatio = paramManager.getMintingRatio();
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
    fit(attestationGiven.value, M.bagOf([M.string(), M.bigint()]));
    const [[_addr, valueLiened]] = getCopyBagEntries(attestationGiven.value);
    const amountLiened = AmountMath.make(brands.Stake, valueLiened);
    const maxDebt = floorMultiplyBy(amountLiened, mintingRatio);
    return { maxDebt, amountLiened };
  };

  const state = initState(
    zcf,
    debtMint,
    brands,
    paramManager,
    mintAndReallocateWithFee,
    burnDebt,
    timing,
  );

  /**
   *
   * @param {bigint} updateTime
   * @param {ZCFSeat} poolIncrementSeat
   */
  const chargeAllVaults = async (updateTime, poolIncrementSeat) => {
    trace('chargeAllVaults', { updateTime });
    const interestRate = paramManager.getInterestRate();

    const changes = chargeInterest(
      {
        mint: debtMint,
        mintAndReallocateWithFee,
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
    Object.assign(state, changes);

    const payload = harden({
      compoundedInterest: state.compoundedInterest,
      interestRate,
      latestInterestUpdate: state.latestInterestUpdate,
      totalDebt: state.totalDebt,
    });
    const { assetUpdater } = state;
    assetUpdater.updateState(payload);

    trace('chargeAllVaults complete', payload);
  };

  const { poolIncrementSeat } = state;
  const timeObserver = {
    updateState: updateTime =>
      chargeAllVaults(updateTime, poolIncrementSeat).catch(e =>
        console.error('🚨 runStakeManager failed to charge interest', e),
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
  };

  const { periodNotifier } = state;
  observeNotifier(periodNotifier, timeObserver);

  /**
   * Update total debt of this manager given the change in debt on a vault
   *
   * @param {Amount<'nat'>} oldDebtOnVault
   * @param {Amount<'nat'>} newDebtOnVault
   */
  // TODO: Add limits for amounts between vault and vault manager
  // https://github.com/Agoric/agoric-sdk/issues/4599
  const applyDebtDelta = (oldDebtOnVault, newDebtOnVault) => {
    // This does not use AmountMath because it could be validly negative
    const delta = newDebtOnVault.value - oldDebtOnVault.value;
    trace(`updating total debt ${state.totalDebt} by ${delta}`);
    if (delta === 0n) {
      // nothing to do
      return;
    }

    // totalDebt += delta (Amount type ensures natural value)
    state.totalDebt = AmountMath.make(
      brands.debt,
      state.totalDebt.value + delta,
    );
  };

  /**
   * @type {MintAndReallocate}
   */
  const mintAndReallocate = (toMint, fee, seat, ...otherSeats) => {
    checkDebtLimit(paramManager.getDebtLimit(), state.totalDebt, toMint);
    mintAndReallocateWithFee(toMint, fee, seat, ...otherSeats);
    state.totalDebt = AmountMath.add(state.totalDebt, toMint);
  };

  return harden({
    getMintingRatio: paramManager.getMintingRatio,
    getInterestRate: paramManager.getInterestRate,
    getLoanFee: paramManager.getLoanFee,
    maxDebtForLien,
    mintAndReallocate,
    burnDebt,

    getDebtBrand: () => brands.debt,
    getCollateralBrand: () => brands.Attestation,
    applyDebtDelta,

    getCompoundedInterest: () => state.compoundedInterest,
    getAssetNotifier: () => state.assetNotifier,
  });
};
