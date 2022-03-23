// @ts-check
import { Far } from '@endo/far';
import { AmountMath, AssetKind } from '@agoric/ertp';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { ceilMultiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';
import { makeNotifierKit } from '@agoric/notifier';
import { M, matches } from '@agoric/store';
import { makeTracer } from '../makeTracer.js';
import { addSubtract, assertOnlyKeys, transfer } from '../contractSupport.js';
import { calculateCurrentDebt, reverseInterest } from '../interest-math.js';
import { KW as AttKW } from './attestation.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('R1');

export const KW = /** @type { const } */ ({
  [AttKW.Attestation]: AttKW.Attestation,
  Debt: 'Debt',
});

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
   *
   * @param {Amount} currentDebt
   * @param {Amount} giveAmount
   * @param {Amount} wantAmount
   */
  const loanFee = (currentDebt, giveAmount, wantAmount) => {
    const fee = ceilMultiplyBy(wantAmount, manager.getLoanFee());
    const toMint = AmountMath.add(wantAmount, fee);
    const newDebt = addSubtract(currentDebt, toMint, giveAmount);
    return { newDebt, toMint, fee };
  };

  const init = () => {
    assertProposalShape(startSeat, {
      give: { [KW.Attestation]: null },
      want: { [KW.Debt]: null },
    });
    const {
      give: { [KW.Attestation]: attestationGiven },
      want: { [KW.Debt]: runWanted },
    } = startSeat.getProposal();

    const { maxDebt } = manager.maxDebtForLien(attestationGiven);
    assert(
      AmountMath.isGTE(maxDebt, runWanted),
      X`wanted ${runWanted}, more than max debt (${maxDebt}) for ${attestationGiven}`,
    );

    const { newDebt, fee, toMint } = loanFee(emptyDebt, emptyDebt, runWanted);
    assert(
      !AmountMath.isEmpty(fee),
      X`loan requested (${runWanted}) is too small; cannot accrue interest`,
    );
    assert(AmountMath.isEqual(newDebt, toMint), X`loan fee mismatch`);
    trace('init', { runWanted, fee, attestationGiven });

    const { zcfSeat: mintSeat } = zcf.makeEmptySeatKit();
    mint.mintGains(harden({ [KW.Debt]: runWanted }), mintSeat);
    startSeat.incrementBy(
      mintSeat.decrementBy(harden({ [KW.Debt]: runWanted })),
    );
    vaultSeat.incrementBy(
      startSeat.decrementBy(harden({ Attestation: attestationGiven })),
    );
    zcf.reallocate(startSeat, vaultSeat, mintSeat);
    startSeat.exit();
    return newDebt;
  };

  // NOTE: this record is mutable by design, anticipating
  // the durable objects API.
  const state = {
    open: true,
    vaultSeat,
    /** @type {NotifierRecord<VaultUIState> | { updater: undefined, notifier: * }} */
    ui: makeNotifierKit(),
    // Two values from the same moment
    interestSnapshot: manager.getCompoundedInterest(),
    debtSnapshot: emptyDebt,
  };

  const getCollateralAllocated = seat =>
    seat.getAmountAllocated(KW.Attestation, collateralBrand);
  const getRunAllocated = seat => seat.getAmountAllocated(KW.Debt, debtBrand);
  const getCollateralAmount = () => {
    // getCollateralAllocated would return final allocations
    return vaultSeat.hasExited()
      ? emptyCollateral
      : getCollateralAllocated(vaultSeat);
  };

  /** @param {boolean} newActive */
  const snapshotState = newActive => {
    const { debtSnapshot: run, interestSnapshot: interest } = state;
    /** @type {VaultUIState} */
    const result = harden({
      // TODO move manager state to a separate notifer https://github.com/Agoric/agoric-sdk/issues/4540
      interestRate: manager.getInterestRate(),
      liquidationRatio: manager.getMintingRatio(),
      debtSnapshot: { run, interest },
      locked: getCollateralAmount(),
      // newPhase param is so that makeTransferInvitation can finish without setting the vault's phase
      // TODO refactor https://github.com/Agoric/agoric-sdk/issues/4415
      vaultState: newActive ? 'active' : 'closed',
    });
    return result;
  };

  /** call this whenever anything changes! */
  const updateUiState = async () => {
    const { open: active, ui } = state;
    if (!ui.updater) {
      console.warn('updateUiState called after ui.updater removed');
      return;
    }
    const uiState = snapshotState(active);
    trace('updateUiState', uiState);

    if (active) {
      ui.updater.updateState(uiState);
    } else {
      ui.updater.finish(uiState);
      state.ui = { updater: undefined, notifier: state.ui.notifier };
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
   */
  const adjustBalancesHook = clientSeat => {
    assert(state.open);

    const proposal = clientSeat.getProposal();
    assertOnlyKeys(proposal, [KW.Attestation, KW.Debt]);

    const debt = getCurrentDebt();
    const collateral = getCollateralAllocated(vaultSeat);

    const giveColl = proposal.give[KW.Attestation] || emptyCollateral;
    const wantColl = proposal.want[KW.Attestation] || emptyCollateral;

    // new = after the transaction gets applied
    const newCollateral = addSubtract(collateral, giveColl, wantColl);
    // max debt supported by current Collateral as modified by proposal
    const { amountLiened, maxDebt: newMaxDebt } =
      manager.maxDebtForLien(newCollateral);

    const giveRUN = AmountMath.min(proposal.give[KW.Debt] || emptyDebt, debt);
    const wantRUN = proposal.want[KW.Debt] || emptyDebt;
    const giveRUNonly = matches(
      proposal,
      harden({ give: { [KW.Debt]: M.record() }, want: {}, exit: M.any() }),
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
    mint.mintGains(harden({ [KW.Debt]: toMint }), vaultSeat);

    transfer(clientSeat, vaultSeat, giveColl, wantColl, KW.Attestation);
    transfer(clientSeat, vaultSeat, giveRUN, wantRUN, KW.Debt);
    manager.reallocateWithFee(fee, vaultSeat, clientSeat);

    // parent needs to know about the change in debt
    updateDebtAccounting(debt, newDebt);

    mint.burnLosses(harden({ [KW.Debt]: giveRUN }), vaultSeat);

    const assertVaultHoldsNoRun = () => {
      assert(
        AmountMath.isEmpty(getRunAllocated(vaultSeat)),
        X`Vault should be empty of debt`,
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
    assert(state.open);
    assertProposalShape(seat, {
      give: { [KW.Debt]: null },
      want: { [KW.Attestation]: null },
    });

    const currentDebt = getCurrentDebt();
    const {
      give: { [KW.Debt]: runOffered },
    } = seat.getProposal();
    assert(
      AmountMath.isGTE(runOffered, currentDebt),
      X`Offer ${runOffered} is not sufficient to pay off debt ${currentDebt}`,
    );
    vaultSeat.incrementBy(seat.decrementBy(harden({ [KW.Debt]: currentDebt })));
    seat.incrementBy(
      vaultSeat.decrementBy(
        harden({ Attestation: vaultSeat.getAmountAllocated('Attestation') }),
      ),
    );

    zcf.reallocate(seat, vaultSeat);

    mint.burnLosses(harden({ [KW.Debt]: currentDebt }), vaultSeat);
    seat.exit();
    state.open = false;
    updateDebtSnapshot(emptyDebt);
    updateUiState();

    return 'Your RUNstake is closed; thank you for your business.';
  };

  const makeAdjustBalancesInvitation = () => {
    assert(state.open);
    return zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances');
  };
  const makeCloseInvitation = () => {
    assert(state.open);
    return zcf.makeInvitation(closeHook, 'CloseVault');
  };

  const vault = Far('RUNstake', {
    getNotifier: () => state.ui.notifier,
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
    vaultNotifier: state.ui.notifier,
    invitationMakers: Far('invitation makers', {
      AdjustBalances: () =>
        zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances'),
      CloseVault: () => zcf.makeInvitation(closeHook, 'CloseVault'),
    }),
    vault,
  });
};
