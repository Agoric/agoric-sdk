// @ts-check
import { Far } from '@endo/far';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { ceilMultiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeNotifierKit } from '@agoric/notifier';
import { M, matches } from '@agoric/store';
import { makeTracer } from '../makeTracer.js';
import { applyDelta, assertOnlyKeys, transfer } from '../contractSupport.js';
import { calculateCurrentDebt, reverseInterest } from '../interest-math.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('R1');

const LoanPhase = /** @type { const } */ ({
  ACTIVE: 'Active',
  CLOSED: 'Closed',
});

/**
 * @typedef {LoanPhase[keyof LoanPhase]} LoanPhaseValue
 * @type {{[K in LoanPhaseValue]: Array<LoanPhaseValue>}}
 */
const validTransitions = {
  [LoanPhase.ACTIVE]: [LoanPhase.CLOSED],
  [LoanPhase.CLOSED]: [],
};

/**
 * Make RUNstake kit, subject to runStake terms.
 *
 * @param {ZCF} zcf
 * @param {ZCFSeat} startSeat
 * @param {import('./runStakeManager.js').RunStakeManager} manager
 * @param { ZCFMint<'nat'> } mint
 * return value follows the wallet invitationMakers pattern
 * @throws {Error} if startSeat proposal is not consistent with governance parameters in manager
 */
export const makeRunStakeKit = (zcf, startSeat, manager, mint) => {
  // CONSTANTS
  const collateralBrand = manager.getCollateralBrand();
  /** @type {{brand: Brand<'nat'>}} */
  const { brand: debtBrand } = mint.getIssuerRecord();

  const emptyCollateral = AmountMath.makeEmpty(
    collateralBrand,
    AssetKind.COPY_BAG,
  );
  const emptyDebt = AmountMath.makeEmpty(debtBrand);

  const { zcfSeat: vaultSeat } = zcf.makeEmptySeatKit();

  /**
   * Calculate the fee, the amount to mint and the resulting debt.
   * The give and the want together reflect a delta, where the
   *
   * @param {Amount} currentDebt
   * @param {Amount} giveAmount
   * @param {Amount} wantAmount
   */
  const loanFee = (currentDebt, giveAmount, wantAmount) => {
    const fee = ceilMultiplyBy(wantAmount, manager.getLoanFee());
    const toMint = AmountMath.add(wantAmount, fee);
    const newDebt = applyDelta(currentDebt, toMint, giveAmount);
    return { newDebt, toMint, fee };
  };

  const init = () => {
    assertProposalShape(startSeat, {
      give: { Attestation: null },
      want: { RUN: null },
    });
    const {
      give: { Attestation: attestationGiven },
      want: { RUN: runWanted },
    } = startSeat.getProposal();

    const { maxDebt } = manager.maxDebtForLien(attestationGiven);
    assert(
      AmountMath.isGTE(maxDebt, runWanted),
      X`wanted ${runWanted}, more than max debt (${maxDebt}) for ${attestationGiven}`,
    );

    // return checkBorrow(attAmt, runWanted);

    const { newDebt, fee, toMint } = loanFee(emptyDebt, emptyDebt, runWanted);
    assert(
      !AmountMath.isEmpty(fee),
      X`loan requested (${runWanted}) is too small; cannot accrue interest`,
    );
    assert(AmountMath.isEqual(newDebt, toMint), X`loan fee mismatch`);
    trace('init', { runWanted, fee, attestationGiven });

    const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();
    mint.mintGains(harden({ RUN: runWanted }), mintSeat);
    startSeat.incrementBy(mintSeat.decrementBy(harden({ RUN: runWanted })));
    vaultSeat.incrementBy(
      startSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );
    zcf.reallocate(startSeat, vaultSeat, mintSeat);
    startSeat.exit();
    return newDebt;
  };

  // NOTE: this record is mutable by design, anticipating
  // the durable objects API.
  /** @type {VaultState} */
  const state = {
    phase: LoanPhase.ACTIVE,
    vaultSeat,
    // Two values from the same moment
    interestSnapshot: manager.getCompoundedInterest(),
    debtSnapshot: emptyDebt,
  };

  const assertActive = () => {
    const { phase } = state;
    assert.equal(phase, LoanPhase.ACTIVE);
  };

  /**
   * @param {LoanPhaseValue} newPhase
   */
  const assignPhase = newPhase => {
    const { phase } = state;
    const validNewPhases = validTransitions[phase];
    assert(
      validNewPhases.includes(newPhase),
      `Vault cannot transition from ${phase} to ${newPhase}`,
    );
    state.phase = newPhase;
  };

  /** @type {NotifierRecord<ReturnType<typeof snapshotState>>} */
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  /** @param {LoanPhaseValue} newPhase */
  const snapshotState = newPhase => {
    const { debtSnapshot: amount, interestSnapshot: interestFactor } = state;
    /** @type {VaultUIState} */
    return harden({
      debtSnapshot: { amount, interestFactor },
      vaultState: newPhase,
    });
  };

  /** call this whenever anything changes! */
  const updateUiState = async () => {
    const { phase } = state;
    const uiState = snapshotState(phase);
    trace('updateUiState', uiState);

    switch (state.phase) {
      case LoanPhase.ACTIVE:
        uiUpdater.updateState(uiState);
        break;
      case LoanPhase.CLOSED:
        uiUpdater.finish(uiState);
        break;
      default:
        assert.fail(`unknown phase: ${state.phase}`);
    }
  };

  /**
   * The actual current debt, including accrued interest.
   *
   * This looks like a simple getter but it does a lot of the heavy lifting for
   * interest accrual. Rather than updating all records when interest accrues,
   * the vault manager updates just its rolling compounded interest. Here we
   * calculate what the current debt is given what's recorded in this vault and
   * what interest has compounded since this vault record was written.
   *
   * @see getNormalizedDebt
   * @returns {Amount<'nat'>}
   */
  const getCurrentDebt = () => {
    return calculateCurrentDebt(
      state.debtSnapshot,
      state.interestSnapshot,
      manager.getCompoundedInterest(),
    );
  };

  /**
   * Called whenever the debt is paid or created through a transaction,
   * but not for interest accrual.
   *
   * @param {Amount} newDebt - principal and all accrued interest
   */
  const updateDebtSnapshot = newDebt => {
    // update local state
    state.debtSnapshot = newDebt;
    state.interestSnapshot = manager.getCompoundedInterest();
  };

  /**
   * Update the debt balance and propagate upwards to
   * maintain aggregate debt and liquidation order.
   *
   * @param {Amount} oldDebt - prior principal and all accrued interest
   * @param {Amount} newDebt - actual principal and all accrued interest
   */
  const updateDebtAccounting = (oldDebt, newDebt) => {
    updateDebtSnapshot(newDebt);
    // update vault manager which tracks total debt
    manager.applyDebtDelta(oldDebt, newDebt);
  };

  /**
   * Adjust principal and collateral (atomically for offer safety)
   *
   * @param {ZCFSeat} clientSeat
   *
   * @typedef {{
   *   phase: LoanPhaseValue,
   *   vaultSeat: ZCFSeat,
   *   interestSnapshot: Ratio,
   *   debtSnapshot: Amount<'nat'>,
   * }} VaultState
   *
   * @returns {unknown}
   */
  const adjustBalancesHook = clientSeat => {
    assertActive();

    const proposal = clientSeat.getProposal();
    assertOnlyKeys(proposal, ['Attestation', 'RUN']);

    const debt = getCurrentDebt();
    const collateral = manager.getCollateralAllocated(vaultSeat);

    const giveColl = proposal.give.Attestation || emptyCollateral;
    const wantColl = proposal.want.Attestation || emptyCollateral;

    // new = after the transaction gets applied
    const newCollateral = applyDelta(collateral, giveColl, wantColl);
    // max debt supported by current Collateral as modified by proposal
    const { amountLiened, maxDebt: newMaxDebt } =
      manager.maxDebtForLien(newCollateral);

    const giveRUN = AmountMath.min(proposal.give.RUN || emptyDebt, debt);
    const wantRUN = proposal.want.RUN || emptyDebt;
    const giveRUNonly = matches(
      proposal,
      harden({ give: { RUN: M.record() }, want: {}, exit: M.any() }),
    );

    // Calculate the fee, the amount to mint and the resulting debt. We'll
    // verify that the target debt doesn't violate the collateralization ratio,
    // then mint, reallocate, and burn.
    const { newDebt, fee, toMint } = loanFee(debt, giveRUN, wantRUN);
    assert(
      giveRUNonly || AmountMath.isGTE(newMaxDebt, newDebt),
      `cannot borrow ${q(newDebt)} against ${q(amountLiened)}; max is ${q(
        newMaxDebt,
      )}`,
    );

    trace('adjustBalancesHook', {
      targetCollateralAmount: newCollateral,
      vaultCollateral: newCollateral,
      fee,
      toMint,
      newDebt,
    });

    // mint to vaultSeat, then reallocate to reward and client, then burn from
    // vaultSeat.
    mint.mintGains(harden({ RUN: toMint }), vaultSeat);

    transfer(clientSeat, vaultSeat, giveColl, wantColl, 'Attestation');
    transfer(clientSeat, vaultSeat, giveRUN, wantRUN, 'RUN');
    manager.reallocateWithFee(fee, vaultSeat, clientSeat);

    // parent needs to know about the change in debt
    updateDebtAccounting(debt, newDebt);

    mint.burnLosses(harden({ RUN: giveRUN }), vaultSeat);

    const assertVaultHoldsNoRun = () => {
      assert(
        AmountMath.isEmpty(manager.getRunAllocated(vaultSeat)),
        X`Vault should be empty of RUN`,
      );
    };
    assertVaultHoldsNoRun();

    updateUiState();
    clientSeat.exit();

    return 'We have adjusted your balances; thank you for your business.';
  };

  /**
   * Given sufficient RUN payoff, refund the attestation.
   *
   * @type {OfferHandler}
   */
  const closeHook = seat => {
    assertActive();
    assertProposalShape(seat, {
      give: { RUN: null },
      want: { Attestation: null },
    });

    const currentDebt = getCurrentDebt();
    const {
      give: { RUN: runOffered },
    } = seat.getProposal();
    assert(
      AmountMath.isGTE(runOffered, currentDebt),
      X`Offer ${runOffered} is not sufficient to pay off debt ${currentDebt}`,
    );
    vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: currentDebt })));
    seat.incrementBy(
      vaultSeat.decrementBy(
        harden({ Attestation: vaultSeat.getAmountAllocated('Attestation') }),
      ),
    );

    zcf.reallocate(seat, vaultSeat);

    mint.burnLosses(harden({ RUN: currentDebt }), vaultSeat);
    seat.exit();
    assignPhase(LoanPhase.CLOSED);
    updateDebtSnapshot(emptyDebt);
    updateUiState();

    return 'Your RUNstake is closed; thank you for your business.';
  };

  const makeAdjustBalancesInvitation = () => {
    assertActive();
    return zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances');
  };
  const makeCloseInvitation = () => {
    assertActive();
    return zcf.makeInvitation(closeHook, 'CloseVault');
  };

  const vault = Far('RUNstake', {
    getNotifier: () => notifier,
    makeAdjustBalancesInvitation,
    makeCloseInvitation,
    getCurrentDebt,
    getNormalizedDebt: () =>
      reverseInterest(state.debtSnapshot, state.interestSnapshot),
  });

  updateDebtAccounting(emptyDebt, init());
  updateUiState();

  return harden({
    assetNotifier: manager.getAssetNotifier(),
    vaultNotifier: notifier,
    invitationMakers: Far('invitation makers', {
      AdjustBalances: () =>
        zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances'),
      CloseVault: () => zcf.makeInvitation(closeHook, 'CloseVault'),
    }),
    vault,
  });
};
