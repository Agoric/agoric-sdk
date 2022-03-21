// @ts-check
import { AmountMath } from '@agoric/ertp';
import {
  assertProposalShape,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { fit, getCopyBagEntries, M } from '@agoric/store';
import { makeNotifierKit, observeNotifier } from '@agoric/notifier';
import { E } from '@endo/far';
import { makeTracer } from '../makeTracer.js';
import { chargeInterest } from '../interest.js';

const { details: X } = assert;

const trace = makeTracer('RM'); // TODO: how to turn this off?

/**
 * @param {ZCF} zcf
 * @param {ZCFMint<'nat'>} debtMint
 * @param {{ debt: Brand<'nat'>, Attestation: Brand<'copyBag'>, Stake: Brand<'nat'> }} brands
 * @param {*} paramManager
 * @param {ReallocateWithFee} reallocateWithFee
 * @param {Object} timing
 * @param {ERef<TimerService>} timing.timerService
 * @param {bigint} timing.chargingPeriod
 * @param {bigint} timing.recordingPeriod
 * @param {bigint} timing.startTimeStamp
 */
export const makeRunStakeManager = (
  zcf,
  debtMint,
  brands,
  paramManager,
  reallocateWithFee,
  { timerService, chargingPeriod, recordingPeriod, startTimeStamp },
) => {
  /** @param { Amount<'copyBag'>} attestationGiven */
  const maxDebtForLien = attestationGiven => {
    const mintingRatio = paramManager.getMintingRatio();
    assert.equal(
      mintingRatio.numerator.brand,
      brands.debt,
      X`${mintingRatio} not in RUN / Stake`,
    );
    assert.equal(
      mintingRatio.denominator.brand,
      brands.Stake,
      X`${mintingRatio} not in RUN / Stake`,
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

  /**
   * TODO: fold checkBorrow into runStakeKit with checkOpenProposal
   *
   * @param {Amount<'copyBag'>} attestationGiven
   * @param {Amount<'nat'>} runWanted
   */
  const checkBorrow = (attestationGiven, runWanted) => {
    const { maxDebt, amountLiened } = maxDebtForLien(attestationGiven);
    assert(
      AmountMath.isGTE(maxDebt, runWanted),
      X`${attestationGiven} not enough to borrow ${runWanted}`,
    );

    return { runWanted, attestationGiven, amountLiened };
  };

  const getRunAllocated = seat => seat.getAmountAllocated('RUN', brands.debt);

  let totalDebt = AmountMath.makeEmpty(brands.debt, 'nat');
  let compoundedInterest = makeRatio(100n, brands.debt); // starts at 1.0, no interest
  let latestInterestUpdate = startTimeStamp;
  const { updater: assetUpdater, notifier: assetNotifer } = makeNotifierKit(
    harden({
      compoundedInterest,
      interestRate: paramManager.getInterestRate(),
      latestInterestUpdate,
      totalDebt,
    }),
  );

  /**
   *
   * @param {bigint} updateTime
   * @param {ZCFSeat} poolIncrementSeat
   */
  const chargeAllVaults = async (updateTime, poolIncrementSeat) => {
    trace('chargeAllVaults', { updateTime });
    const interestRate = paramManager.getInterestRate();

    // Update local state with the results of charging interest
    ({ compoundedInterest, latestInterestUpdate, totalDebt } = chargeInterest(
      {
        mint: debtMint,
        reallocateWithFee,
        poolIncrementSeat,
        seatAllocationKeyword: 'RUN',
      },
      {
        interestRate,
        chargingPeriod,
        recordingPeriod,
      },
      { latestInterestUpdate, compoundedInterest, totalDebt },
      updateTime,
    ));

    const payload = harden({
      compoundedInterest,
      interestRate,
      latestInterestUpdate,
      totalDebt,
    });
    assetUpdater.updateState(payload);

    trace('chargeAllVaults complete', payload);
  };

  const periodNotifier = E(timerService).makeNotifier(0n, recordingPeriod);
  const { zcfSeat: poolIncrementSeat } = zcf.makeEmptySeatKit();

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
    trace(`updating total debt ${totalDebt} by ${delta}`);
    if (delta === 0n) {
      // nothing to do
      return;
    }

    // totalDebt += delta (Amount type ensures natural value)
    totalDebt = AmountMath.make(brands.debt, totalDebt.value + delta);
  };

  return harden({
    getCurrentTerms: () => ({
      mintingRatio: paramManager.getMintingRatio(),
      interestRate: paramManager.getInterestRate(),
      loanFee: paramManager.getLoanFee(),
    }),
    getLoanFee: paramManager.getLoanFee,
    maxDebtForLien,
    checkBorrow,
    reallocateWithFee,

    getCollateralBrand: () => brands.Attestation,
    getCollateralAllocated: seat =>
      seat.getAmountAllocated('Attestation', brands.Attestation),
    getRunAllocated,
    applyDebtDelta,

    // TODO: move checkOpenProposal code to runStakeKit
    /** @param { ZCFSeat } seat */
    checkOpenProposal: seat => {
      assertProposalShape(seat, {
        give: { Attestation: null },
        want: { RUN: null },
      });
      const {
        give: { Attestation: attAmt },
        want: { RUN: runWanted },
      } = seat.getProposal();

      return checkBorrow(attAmt, runWanted);
    },

    getCompoundedInterest: () => compoundedInterest,
    getAssetNotifier: () => assetNotifer,
  });
};
