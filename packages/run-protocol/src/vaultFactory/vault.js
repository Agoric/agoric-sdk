// @ts-check
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  getAmountOut,
  makeRatioFromAmounts,
  ceilMultiplyBy,
  floorMultiplyBy,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';

import { assert } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeTracer } from '../makeTracer.js';
import { calculateCurrentDebt, reverseInterest } from '../interest-math.js';
import { makeVaultKit } from './vaultKit.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('IV');

/**
 * @file This has most of the logic for a Vault, to borrow RUN against collateral.
 *
 * The logic here is for InnerVault which is the majority of logic of vaults but
 * the user view is the `vault` value contained in VaultKit.
 */

/**
 * Constants for vault phase.
 *
 * ACTIVE       - vault is in use and can be changed
 * LIQUIDATING  - vault is being liquidated by the vault manager, and cannot be changed by the user
 * TRANSFER     - vault is able to be transferred (payments and debits frozen until it has a new owner)
 * CLOSED       - vault was closed by the user and all assets have been paid out
 * LIQUIDATED   - vault was closed by the manager, with remaining assets paid to owner
 */
export const VaultPhase = /** @type {const} */ ({
  ACTIVE: 'active',
  LIQUIDATING: 'liquidating',
  CLOSED: 'closed',
  LIQUIDATED: 'liquidated',
  TRANSFER: 'transfer',
});

/**
 * @typedef {VaultPhase[keyof Omit<typeof VaultPhase, 'TRANSFER'>]} InnerPhase
 * @type {{[K in InnerPhase]: Array<InnerPhase>}}
 */
const validTransitions = {
  [VaultPhase.ACTIVE]: [VaultPhase.LIQUIDATING, VaultPhase.CLOSED],
  [VaultPhase.LIQUIDATING]: [VaultPhase.LIQUIDATED],
  [VaultPhase.LIQUIDATED]: [VaultPhase.CLOSED],
  [VaultPhase.CLOSED]: [],
};

/**
 * @typedef {VaultPhase[keyof typeof VaultPhase]} OuterPhase
 *
 * @typedef {Object} VaultUIState
 * @property {Amount<'nat'>} locked Amount of Collateral locked
 * @property {{run: Amount<'nat'>, interest: Ratio}} debtSnapshot Debt of 'run' at the point the compounded interest was 'interest'
 * @property {Ratio} interestRate Annual interest rate charge
 * @property {Ratio} liquidationRatio
 * @property {OuterPhase} vaultState
 */

/**
 * @typedef {Object} InnerVaultManagerBase
 * @property {(oldDebt: Amount, newDebt: Amount) => void} applyDebtDelta
 * @property {() => Brand} getCollateralBrand
 * @property {ReallocateWithFee} reallocateWithFee
 * @property {() => Ratio} getCompoundedInterest - coefficient on existing debt to calculate new debt
 * @property {(oldDebt: Amount, oldCollateral: Amount, vaultId: VaultId) => void} updateVaultPriority
 */

/**
 * @typedef {Readonly<{
 * assetNotifier: Notifier<import('./vaultManager').AssetState>,
 * idInManager: VaultId,
 * manager: InnerVaultManagerBase & GetVaultParams,
 * priceAuthority: ERef<PriceAuthority>,
 * mint: ZCFMint,
 * vaultSeat: ZCFSeat,
 * zcf: ContractFacet,
 * }>} ImmutableState
 */

/**
 * Snapshot is of the debt and compounded interest when the principal was last changed.
 *
 * @typedef {{
 * interestSnapshot: Ratio,
 * outerUpdater: IterationObserver<VaultUIState> | null,
 * phase: InnerPhase,
 * debtSnapshot: Amount<'nat'>,
 * }} MutableState
 */

/**
 * @param {ContractFacet} zcf
 * @param {InnerVaultManagerBase & GetVaultParams} manager
 * @param {Notifier<import('./vaultManager').AssetState>} assetNotifier
 * @param {VaultId} idInManager
 * @param {ZCFMint} mint
 * @param {ERef<PriceAuthority>} priceAuthority
 */
export const makeInnerVault = (
  zcf,
  manager,
  assetNotifier,
  idInManager,
  mint,
  priceAuthority,
) => {
  // CONSTANTS
  const collateralBrand = manager.getCollateralBrand();
  /** @type {{brand: Brand<'nat'>}} */
  const { brand: debtBrand } = mint.getIssuerRecord();

  /**
   * State object to support virtualization when available
   *
   * @type {ImmutableState & MutableState}
   */
  const state = {
    assetNotifier,
    idInManager,
    manager,
    outerUpdater: null,
    phase: VaultPhase.ACTIVE,
    priceAuthority,
    mint,
    zcf,

    // vaultSeat will hold the collateral until the loan is retired. The
    // payout from it will be handed to the user: if the vault dies early
    // (because the vaultFactory vat died), they'll get all their
    // collateral back. If that happens, the issuer for the RUN will be dead,
    // so their loan will be worthless.
    vaultSeat: zcf.makeEmptySeatKit().zcfSeat,

    // Two values from the same moment
    interestSnapshot: manager.getCompoundedInterest(),
    debtSnapshot: AmountMath.makeEmpty(debtBrand),
  };

  // #region Phase logic
  /**
   * @param {InnerPhase} newPhase
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

  const assertActive = () => {
    const { phase } = state;
    assert(phase === VaultPhase.ACTIVE);
  };

  const assertCloseable = () => {
    const { phase } = state;
    assert(
      phase === VaultPhase.ACTIVE || phase === VaultPhase.LIQUIDATED,
      X`to be closed a vault must be active or liquidated, not ${phase}`,
    );
  };
  // #endregion

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
   * @param {Amount} oldCollateral - actual collateral
   * @param {Amount} newDebt - actual principal and all accrued interest
   */
  const updateDebtAccounting = (oldDebt, oldCollateral, newDebt) => {
    updateDebtSnapshot(newDebt);
    // update vault manager which tracks total debt
    manager.applyDebtDelta(oldDebt, newDebt);
    // update position of this vault in liquidation priority queue
    manager.updateVaultPriority(oldDebt, oldCollateral, idInManager);
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
   * The normalization puts all debts on a common time-independent scale since
   * the launch of this vault manager. This allows the manager to order vaults
   * by their debt-to-collateral ratios without having to mutate the debts as
   * the interest accrues.
   *
   * @see getActualDebAmount
   * @returns {Amount<'nat'>} as if the vault was open at the launch of this manager, before any interest accrued
   */
  const getNormalizedDebt = () => {
    return reverseInterest(state.debtSnapshot, state.interestSnapshot);
  };

  const getCollateralAllocated = seat =>
    seat.getAmountAllocated('Collateral', collateralBrand);
  const getRunAllocated = seat => seat.getAmountAllocated('RUN', debtBrand);

  const assertVaultHoldsNoRun = () => {
    const { vaultSeat } = state;
    assert(
      AmountMath.isEmpty(getRunAllocated(vaultSeat)),
      X`Vault should be empty of RUN`,
    );
  };

  const maxDebtFor = async collateralAmount => {
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      debtBrand,
    );
    // floorDivide because we want the debt ceiling lower
    return floorDivideBy(
      getAmountOut(quoteAmount),
      manager.getLiquidationMargin(),
    );
  };

  const assertSufficientCollateral = async (
    collateralAmount,
    proposedRunDebt,
  ) => {
    const maxRun = await maxDebtFor(collateralAmount);
    assert(
      AmountMath.isGTE(maxRun, proposedRunDebt, debtBrand),
      X`Requested ${q(proposedRunDebt)} exceeds max ${q(maxRun)}`,
    );
  };

  /**
   *
   * @returns {Amount<'nat'>}
   */
  const getCollateralAmount = () => {
    const { vaultSeat } = state;
    // getCollateralAllocated would return final allocations
    return vaultSeat.hasExited()
      ? AmountMath.makeEmpty(collateralBrand)
      : getCollateralAllocated(vaultSeat);
  };

  /**
   *
   * @param {OuterPhase} newPhase
   */
  const snapshotState = newPhase => {
    const { debtSnapshot: run, interestSnapshot: interest } = state;
    /** @type {VaultUIState} */
    return harden({
      // TODO move manager state to a separate notifer https://github.com/Agoric/agoric-sdk/issues/4540
      interestRate: manager.getInterestRate(),
      liquidationRatio: manager.getLiquidationMargin(),
      // XXX 'run' is implied by the brand in the amount
      debtSnapshot: { run, interest },
      locked: getCollateralAmount(),
      // newPhase param is so that makeTransferInvitation can finish without setting the vault's phase
      // TODO refactor https://github.com/Agoric/agoric-sdk/issues/4415
      vaultState: newPhase,
    });
  };

  // call this whenever anything changes!
  const updateUiState = () => {
    const { outerUpdater } = state;
    if (!outerUpdater) {
      console.warn('updateUiState called after outerUpdater removed');
      return;
    }
    const { phase } = state;
    const uiState = snapshotState(phase);
    trace('updateUiState', uiState);

    switch (phase) {
      case VaultPhase.ACTIVE:
      case VaultPhase.LIQUIDATING:
        outerUpdater.updateState(uiState);
        break;
      case VaultPhase.CLOSED:
      case VaultPhase.LIQUIDATED:
        outerUpdater.finish(uiState);
        state.outerUpdater = null;
        break;
      default:
        throw Error(`unreachable vault phase: ${phase}`);
    }
  };

  /**
   * Call must check for and remember shortfall
   *
   * @param {Amount} newDebt
   */
  const liquidated = newDebt => {
    updateDebtSnapshot(newDebt);

    assignPhase(VaultPhase.LIQUIDATED);
    updateUiState();
  };

  const liquidating = () => {
    assignPhase(VaultPhase.LIQUIDATING);
    updateUiState();
  };

  /** @type {OfferHandler} */
  const closeHook = async seat => {
    assertCloseable();
    const { phase, vaultSeat } = state;
    if (phase === VaultPhase.ACTIVE) {
      assertProposalShape(seat, {
        give: { RUN: null },
        want: { Collateral: null },
      });

      // you're paying off the debt, you get everything back. If you were
      // underwater, we should have liquidated some collateral earlier: we
      // missed our chance.
      const currentDebt = getCurrentDebt();
      const {
        give: { RUN: runOffered },
      } = seat.getProposal();

      // you must pay off the entire remainder but if you offer too much, we won't
      // take more than you owe
      assert(
        AmountMath.isGTE(runOffered, currentDebt),
        X`Offer ${runOffered} is not sufficient to pay off debt ${currentDebt}`,
      );

      // Return any overpayment
      seat.incrementBy(
        vaultSeat.decrementBy(
          harden({ Collateral: getCollateralAllocated(vaultSeat) }),
        ),
      );
      zcf.reallocate(seat, vaultSeat);
      mint.burnLosses(harden({ RUN: currentDebt }), seat);
    } else if (phase === VaultPhase.LIQUIDATED) {
      // Simply reallocate vault assets to the offer seat.
      // Don't take anything from the offer, even if vault is underwater.
      seat.incrementBy(vaultSeat.decrementBy(vaultSeat.getCurrentAllocation()));
      zcf.reallocate(seat, vaultSeat);
    } else {
      throw new Error('only active and liquidated vaults can be closed');
    }

    seat.exit();
    assignPhase(VaultPhase.CLOSED);
    updateDebtSnapshot(AmountMath.makeEmpty(debtBrand));
    updateUiState();

    assertVaultHoldsNoRun();
    vaultSeat.exit();

    return 'your loan is closed, thank you for your business';
  };

  const makeCloseInvitation = () => {
    assertCloseable();
    return zcf.makeInvitation(closeHook, 'CloseVault');
  };

  // The proposal is not allowed to include any keys other than these,
  // usually 'Collateral' and 'RUN'.
  const assertOnlyKeys = (proposal, keys) => {
    const onlyKeys = clause =>
      Object.getOwnPropertyNames(clause).every(c => keys.includes(c));

    assert(
      onlyKeys(proposal.give),
      X`extraneous terms in give: ${proposal.give}`,
    );
    assert(
      onlyKeys(proposal.want),
      X`extraneous terms in want: ${proposal.want}`,
    );
  };

  // Calculate the target level for Collateral for the vaultSeat and
  // clientSeat implied by the proposal. If the proposal wants Collateral,
  // transfer that amount from vault to client. If the proposal gives
  // Collateral, transfer the opposite direction. Otherwise, return the current level.
  const targetCollateralLevels = seat => {
    const { vaultSeat } = state;
    const proposal = seat.getProposal();
    const startVaultAmount = getCollateralAllocated(vaultSeat);
    const startClientAmount = getCollateralAllocated(seat);
    if (proposal.want.Collateral) {
      return {
        vault: AmountMath.subtract(startVaultAmount, proposal.want.Collateral),
        client: AmountMath.add(startClientAmount, proposal.want.Collateral),
      };
    } else if (proposal.give.Collateral) {
      return {
        vault: AmountMath.add(startVaultAmount, proposal.give.Collateral),
        client: AmountMath.subtract(
          startClientAmount,
          proposal.give.Collateral,
        ),
      };
    } else {
      return {
        vault: startVaultAmount,
        client: startClientAmount,
      };
    }
  };

  const transferCollateral = seat => {
    const { vaultSeat } = state;
    const proposal = seat.getProposal();
    if (proposal.want.Collateral) {
      seat.incrementBy(
        vaultSeat.decrementBy(harden({ Collateral: proposal.want.Collateral })),
      );
    } else if (proposal.give.Collateral) {
      vaultSeat.incrementBy(
        seat.decrementBy(harden({ Collateral: proposal.give.Collateral })),
      );
    }
  };

  /**
   * Calculate the target RUN level for the vaultSeat and clientSeat implied
   * by the proposal. If the proposal wants collateral, transfer that amount
   * from vault to client. If the proposal gives collateral, transfer the
   * opposite direction. Otherwise, return the current level.
   *
   * Since we don't allow the debt to go negative, we will reduce the amount we
   * accept when the proposal says to give more RUN than are owed.
   *
   * @param {ZCFSeat} seat
   * @returns {{vault: Amount, client: Amount}}
   */
  const targetRunLevels = seat => {
    const clientAllocation = getRunAllocated(seat);
    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      return {
        vault: AmountMath.makeEmpty(debtBrand),
        client: AmountMath.add(clientAllocation, proposal.want.RUN),
      };
    } else if (proposal.give.RUN) {
      // We don't allow debt to be negative, so we'll refund overpayments
      // TODO this is the same as in `transferRun`
      const currentDebt = getCurrentDebt();
      const acceptedRun = AmountMath.isGTE(proposal.give.RUN, currentDebt)
        ? currentDebt
        : proposal.give.RUN;

      return {
        vault: acceptedRun,
        client: AmountMath.subtract(clientAllocation, acceptedRun),
      };
    } else {
      return {
        vault: AmountMath.makeEmpty(debtBrand),
        client: clientAllocation,
      };
    }
  };

  const transferRun = seat => {
    const { vaultSeat } = state;
    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      seat.incrementBy(
        vaultSeat.decrementBy(harden({ RUN: proposal.want.RUN })),
      );
    } else if (proposal.give.RUN) {
      // We don't allow debt to be negative, so we'll refund overpayments
      const currentDebt = getCurrentDebt();
      const acceptedRun = AmountMath.min(proposal.give.RUN, currentDebt);
      vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: acceptedRun })));
    }
  };

  /**
   * Calculate the fee, the amount to mint and the resulting debt
   *
   * @param {ProposalRecord} proposal
   * @param {{vault: Amount, client: Amount}} debtAfter
   */
  const loanFee = (proposal, debtAfter) => {
    let newDebt;
    const currentDebt = getCurrentDebt();
    let toMint = AmountMath.makeEmpty(debtBrand);
    let fee = AmountMath.makeEmpty(debtBrand);
    if (proposal.want.RUN) {
      fee = ceilMultiplyBy(proposal.want.RUN, manager.getLoanFee());
      toMint = AmountMath.add(proposal.want.RUN, fee);
      newDebt = AmountMath.add(currentDebt, toMint);
    } else if (proposal.give.RUN) {
      newDebt = AmountMath.subtract(currentDebt, debtAfter.vault);
    } else {
      newDebt = currentDebt;
    }
    return { newDebt, toMint, fee };
  };

  /**
   * Adjust principal and collateral (atomically for offer safety)
   *
   * @param {ZCFSeat} clientSeat
   */
  const adjustBalancesHook = async clientSeat => {
    const oldUpdater = state.outerUpdater;
    const proposal = clientSeat.getProposal();
    const oldDebt = getCurrentDebt();
    const oldCollateral = getCollateralAmount();

    assertOnlyKeys(proposal, ['Collateral', 'RUN']);

    const targetCollateralAmount = targetCollateralLevels(clientSeat).vault;
    // max debt supported by current Collateral as modified by proposal
    const maxDebtForOriginalTarget = await maxDebtFor(targetCollateralAmount);
    assert(
      oldUpdater === state.outerUpdater,
      X`Transfer during vault adjustment`,
    );
    assertActive();

    const priceOfCollateralInRun = makeRatioFromAmounts(
      maxDebtForOriginalTarget,
      targetCollateralAmount,
    );

    // After the AWAIT, we retrieve the vault's allocations again.
    const collateralAfter = targetCollateralLevels(clientSeat);
    const debtAfter = targetRunLevels(clientSeat);

    // Calculate the fee, the amount to mint and the resulting debt. We'll
    // verify that the target debt doesn't violate the collateralization ratio,
    // then mint, reallocate, and burn.
    const { fee, toMint, newDebt } = loanFee(proposal, debtAfter);

    // Get new balances after calling the priceAuthority, so we can compare
    // to the debt limit based on the new values.
    const vaultCollateral =
      collateralAfter.vault || AmountMath.makeEmpty(collateralBrand);

    trace('adjustBalancesHook', {
      targetCollateralAmount,
      vaultCollateral,
      fee,
      toMint,
      newDebt,
    });

    // If the collateral decreased, we pro-rate maxDebt
    if (AmountMath.isGTE(targetCollateralAmount, vaultCollateral)) {
      // We can pro-rate maxDebt because the quote is either linear (price is
      // unchanging) or super-linear (also called "convex". meaning it's an AMM.
      // When the volume sold falls, the proceeds fall less than linearly, so
      // this is a conservative choice.) floorMultiply because the debt ceiling
      // should constrain more.
      const maxDebtAfter = floorMultiplyBy(
        vaultCollateral,
        priceOfCollateralInRun,
      );
      assert(
        AmountMath.isGTE(maxDebtAfter, newDebt),
        X`The requested debt ${q(
          newDebt,
        )} is more than the collateralization ratio allows: ${q(maxDebtAfter)}`,
      );

      // When the re-checked collateral was larger than the original amount, we
      // should restart, unless the new debt is less than the original target
      // (in which case, we're fine to proceed with the reallocate)
    } else if (!AmountMath.isGTE(maxDebtForOriginalTarget, newDebt)) {
      return adjustBalancesHook(clientSeat);
    }

    // mint to vaultSeat, then reallocate to reward and client, then burn from
    // vaultSeat. Would using a separate seat clarify the accounting?
    // TODO what if there isn't anything to mint?
    const { vaultSeat } = state;
    mint.mintGains(harden({ RUN: toMint }), vaultSeat);
    transferCollateral(clientSeat);
    transferRun(clientSeat);
    manager.reallocateWithFee(fee, vaultSeat, clientSeat);

    // parent needs to know about the change in debt
    updateDebtAccounting(oldDebt, oldCollateral, newDebt);

    mint.burnLosses(harden({ RUN: debtAfter.vault }), vaultSeat);

    assertVaultHoldsNoRun();

    updateUiState();
    clientSeat.exit();

    return 'We have adjusted your balances, thank you for your business';
  };

  const makeAdjustBalancesInvitation = () => {
    assertActive();
    return zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances');
  };

  /**
   * @param {ZCFSeat} seat
   * @param {InnerVault} innerVault
   */
  const initVaultKit = async (seat, innerVault) => {
    assert(
      AmountMath.isEmpty(state.debtSnapshot),
      X`vault must be empty initially`,
    );
    const oldDebt = getCurrentDebt();
    const oldCollateral = getCollateralAmount();
    trace('initVaultKit start: collateral', { oldDebt, oldCollateral });

    // get the payout to provide access to the collateral if the
    // contract abandons
    const {
      give: { Collateral: collateralAmount },
      want: { RUN: wantedRun },
    } = seat.getProposal();

    // todo trigger process() check right away, in case the price dropped while we ran

    const fee = ceilMultiplyBy(wantedRun, manager.getLoanFee());
    if (AmountMath.isEmpty(fee)) {
      throw seat.fail(
        Error('loan requested is too small; cannot accrue interest'),
      );
    }
    trace(idInManager, 'initVault', { wantedRun, fee }, getCollateralAmount());

    const stagedDebt = AmountMath.add(wantedRun, fee);
    await assertSufficientCollateral(collateralAmount, stagedDebt);

    const { vaultSeat } = state;
    mint.mintGains(harden({ RUN: stagedDebt }), vaultSeat);

    seat.incrementBy(vaultSeat.decrementBy(harden({ RUN: wantedRun })));
    vaultSeat.incrementBy(
      seat.decrementBy(harden({ Collateral: collateralAmount })),
    );
    manager.reallocateWithFee(fee, vaultSeat, seat);

    updateDebtAccounting(oldDebt, oldCollateral, stagedDebt);

    const vaultKit = makeVaultKit(innerVault, state.assetNotifier);
    state.outerUpdater = vaultKit.vaultUpdater;
    updateUiState();

    return vaultKit;
  };

  /**
   *
   * @param {ZCFSeat} seat
   * @returns {VaultKit}
   */
  const makeTransferInvitationHook = seat => {
    assertCloseable();
    seat.exit();
    // eslint-disable-next-line no-use-before-define
    const vaultKit = makeVaultKit(innerVault, state.assetNotifier);
    state.outerUpdater = vaultKit.vaultUpdater;
    updateUiState();

    return vaultKit;
  };

  const innerVault = Far('innerVault', {
    getVaultSeat: () => state.vaultSeat,

    initVaultKit: seat => initVaultKit(seat, innerVault),
    liquidating,
    liquidated,

    makeAdjustBalancesInvitation,
    makeCloseInvitation,
    makeTransferInvitation: () => {
      const { outerUpdater } = state;
      if (outerUpdater) {
        outerUpdater.finish(snapshotState(VaultPhase.TRANSFER));
        state.outerUpdater = null;
      }
      return zcf.makeInvitation(makeTransferInvitationHook, 'TransferVault');
    },

    // for status/debugging
    getCollateralAmount,
    getCurrentDebt,
    getNormalizedDebt,
  });

  return innerVault;
};

/** @typedef {ReturnType<typeof makeInnerVault>} InnerVault */
