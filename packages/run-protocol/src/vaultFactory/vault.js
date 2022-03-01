// @ts-check
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  calculateCurrentDebt,
  getAmountOut,
  makeRatioFromAmounts,
  reverseInterest,
  ceilMultiplyBy,
  floorMultiplyBy,
  floorDivideBy,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeNotifierKit } from '@agoric/notifier';

import { assert } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { makeTracer } from '../makeTracer.js';

const { details: X, quote: q } = assert;

const trace = makeTracer('Vault');

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending RUN to the borrower

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
 * @property {Amount<NatValue>} locked Amount of Collateral locked
 * @property {{run: Amount<NatValue>, interest: Ratio}} debtSnapshot Debt of 'run' at the point the compounded interest was 'interest'
 * @property {Ratio} interestRate Annual interest rate charge
 * @property {Ratio} liquidationRatio
 * @property {OuterPhase} vaultState
 */

/**
 *
 * @param {InnerVault | null} inner
 */
const makeOuterKit = inner => {
  /** @type {NotifierRecord<VaultUIState>} */
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  /** @returns true iff this outer vault is backed by an inner vault */
  const assertOwned = v => {
    // console.log('OUTER', v, 'INNER', inner);
    assert(inner, X`Using ${v} after transfer`);
    return inner;
  };
  const vault = Far('vault', {
    getNotifier: () => notifier,
    makeAdjustBalancesInvitation: () =>
      assertOwned(vault).makeAdjustBalancesInvitation(),
    makeCloseInvitation: () => assertOwned(vault).makeCloseInvitation(),
    makeTransferInvitation: () => {
      const tmpInner = assertOwned(vault);
      inner = null;
      return tmpInner.makeTransferInvitation();
    },
    // for status/debugging
    getCollateralAmount: () => assertOwned(vault).getCollateralAmount(),
    getCurrentDebt: () => assertOwned(vault).getCurrentDebt(),
    getNormalizedDebt: () => assertOwned(vault).getNormalizedDebt(),
  });
  return { vault, uiUpdater };
};

/**
 * @typedef {Object} InnerVaultManagerBase
 * @property {(oldDebt: Amount, newDebt: Amount) => void} applyDebtDelta
 * @property {() => Brand} getCollateralBrand
 * @property {ReallocateWithFee} reallocateWithFee
 * @property {() => Ratio} getCompoundedInterest - coefficient on existing debt to calculate new debt
 * @property {(oldDebt: Amount, oldCollateral: Amount, vaultId: VaultId) => void} updateVaultPriority
 */

/**
 * @param {ContractFacet} zcf
 * @param {InnerVaultManagerBase & GetVaultParams} manager
 * @param {Notifier<import('./vaultManager').AssetState>} assetNotifier
 * @param {VaultId} idInManager
 * @param {ZCFMint} runMint
 * @param {ERef<PriceAuthority>} priceAuthority
 */
export const makeInnerVault = (
  zcf,
  manager,
  assetNotifier,
  idInManager, // will go in state
  runMint,
  priceAuthority,
) => {
  // CONSTANTS
  const collateralBrand = manager.getCollateralBrand();
  const { brand: runBrand } = runMint.getIssuerRecord();

  // STATE

  // #region Phase state
  /** @type {InnerPhase} */
  let phase = VaultPhase.ACTIVE;

  /**
   * @param {InnerPhase} newPhase
   */
  const assignPhase = newPhase => {
    const validNewPhases = validTransitions[phase];
    if (!validNewPhases.includes(newPhase))
      throw new Error(`Vault cannot transition from ${phase} to ${newPhase}`);
    phase = newPhase;
  };

  const assertActive = () => {
    assert(phase === VaultPhase.ACTIVE);
  };

  const assertCloseable = () => {
    assert(
      phase === VaultPhase.ACTIVE || phase === VaultPhase.LIQUIDATED,
      X`to be closed a vault must be active or liquidated, not ${phase}`,
    );
  };
  // #endregion

  let outerUpdater;

  // vaultSeat will hold the collateral until the loan is retired. The
  // payout from it will be handed to the user: if the vault dies early
  // (because the vaultFactory vat died), they'll get all their
  // collateral back. If that happens, the issuer for the RUN will be dead,
  // so their loan will be worthless.
  const { zcfSeat: vaultSeat } = zcf.makeEmptySeatKit();

  /**
   * Snapshot of the debt and compounded interest when the principal was last changed
   *
   * @type {{run: Amount<NatValue>, interest: Ratio}}
   */
  let debtSnapshot = {
    run: AmountMath.makeEmpty(runBrand, 'nat'),
    interest: manager.getCompoundedInterest(),
  };

  /**
   * Called whenever the debt is paid or created through a transaction,
   * but not for interest accrual.
   *
   * @param {Amount} newDebt - principal and all accrued interest
   */
  const updateDebtSnapshot = newDebt => {
    // update local state
    // @ts-expect-error newDebt is actually Amount<NatValue>
    debtSnapshot = { run: newDebt, interest: manager.getCompoundedInterest() };
  };

  /**
   * @param {Amount} oldDebt - prior principal and all accrued interest
   * @param {Amount} oldCollateral - actual collateral
   * @param {Amount} newDebt - actual principal and all accrued interest
   */
  const refreshLoanTracking = (oldDebt, oldCollateral, newDebt) => {
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
   * @returns {Amount<NatValue>}
   */
  const getCurrentDebt = () => {
    return calculateCurrentDebt(
      debtSnapshot.run,
      debtSnapshot.interest,
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
   * @returns {Amount<NatValue>} as if the vault was open at the launch of this manager, before any interest accrued
   */
  const getNormalizedDebt = () => {
    assert(debtSnapshot);
    return reverseInterest(debtSnapshot.run, debtSnapshot.interest);
  };

  const getCollateralAllocated = seat =>
    seat.getAmountAllocated('Collateral', collateralBrand);
  const getRunAllocated = seat => seat.getAmountAllocated('RUN', runBrand);

  const assertVaultHoldsNoRun = () => {
    assert(
      AmountMath.isEmpty(getRunAllocated(vaultSeat)),
      X`Vault should be empty of RUN`,
    );
  };

  const maxDebtFor = async collateralAmount => {
    const quoteAmount = await E(priceAuthority).quoteGiven(
      collateralAmount,
      runBrand,
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
      AmountMath.isGTE(maxRun, proposedRunDebt, runBrand),
      X`Requested ${q(proposedRunDebt)} exceeds max ${q(maxRun)}`,
    );
  };

  /**
   *
   * @returns {Amount<NatValue>}
   */
  const getCollateralAmount = () => {
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
    /** @type {VaultUIState} */
    return harden({
      // TODO move manager state to a separate notifer https://github.com/Agoric/agoric-sdk/issues/4540
      interestRate: manager.getInterestRate(),
      liquidationRatio: manager.getLiquidationMargin(),
      debtSnapshot,
      locked: getCollateralAmount(),
      // newPhase param is so that makeTransferInvitation can finish without setting the vault's phase
      // TODO refactor https://github.com/Agoric/agoric-sdk/issues/4415
      vaultState: newPhase,
    });
  };

  // call this whenever anything changes!
  const updateUiState = () => {
    if (!outerUpdater) {
      console.warn('updateUiState called after outerUpdater removed');
      return;
    }
    /** @type {VaultUIState} */
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
        outerUpdater = null;
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
      runMint.burnLosses(harden({ RUN: currentDebt }), seat);
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
    updateDebtSnapshot(AmountMath.makeEmpty(runBrand));
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
        vault: AmountMath.makeEmpty(runBrand),
        client: AmountMath.add(clientAllocation, proposal.want.RUN),
      };
    } else if (proposal.give.RUN) {
      // We don't allow runDebt to be negative, so we'll refund overpayments
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
        vault: AmountMath.makeEmpty(runBrand),
        client: clientAllocation,
      };
    }
  };

  const transferRun = seat => {
    const proposal = seat.getProposal();
    if (proposal.want.RUN) {
      seat.incrementBy(
        vaultSeat.decrementBy(harden({ RUN: proposal.want.RUN })),
      );
    } else if (proposal.give.RUN) {
      // We don't allow runDebt to be negative, so we'll refund overpayments
      const currentDebt = getCurrentDebt();
      const acceptedRun = AmountMath.isGTE(proposal.give.RUN, currentDebt)
        ? currentDebt
        : proposal.give.RUN;

      vaultSeat.incrementBy(seat.decrementBy(harden({ RUN: acceptedRun })));
    }
  };

  /**
   * Calculate the fee, the amount to mint and the resulting debt
   *
   * @param {ProposalRecord} proposal
   * @param {{vault: Amount, client: Amount}} runAfter
   */
  const loanFee = (proposal, runAfter) => {
    let newDebt;
    const currentDebt = getCurrentDebt();
    let toMint = AmountMath.makeEmpty(runBrand);
    let fee = AmountMath.makeEmpty(runBrand);
    if (proposal.want.RUN) {
      fee = ceilMultiplyBy(proposal.want.RUN, manager.getLoanFee());
      toMint = AmountMath.add(proposal.want.RUN, fee);
      newDebt = AmountMath.add(currentDebt, toMint);
    } else if (proposal.give.RUN) {
      newDebt = AmountMath.subtract(currentDebt, runAfter.vault);
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
    // the updater will change if we start a transfer
    const oldUpdater = outerUpdater;
    const proposal = clientSeat.getProposal();
    const oldDebt = getCurrentDebt();
    const oldCollateral = getCollateralAmount();

    assertOnlyKeys(proposal, ['Collateral', 'RUN']);

    const targetCollateralAmount = targetCollateralLevels(clientSeat).vault;
    // max debt supported by current Collateral as modified by proposal
    const maxDebtForOriginalTarget = await maxDebtFor(targetCollateralAmount);
    assert(oldUpdater === outerUpdater, X`Transfer during vault adjustment`);
    assertActive();

    const priceOfCollateralInRun = makeRatioFromAmounts(
      maxDebtForOriginalTarget,
      targetCollateralAmount,
    );

    // After the AWAIT, we retrieve the vault's allocations again.
    const collateralAfter = targetCollateralLevels(clientSeat);
    const runAfter = targetRunLevels(clientSeat);

    // Calculate the fee, the amount to mint and the resulting debt. We'll
    // verify that the target debt doesn't violate the collateralization ratio,
    // then mint, reallocate, and burn.
    const { fee, toMint, newDebt } = loanFee(proposal, runAfter);

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
      // unchanging) or super-linear (meaning it's an AMM. When the volume sold
      // falls, the proceeds fall less than linearly, so this is a conservative
      // choice.) floorMultiply because the debt ceiling should constrain more.
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
    runMint.mintGains(harden({ RUN: toMint }), vaultSeat);
    transferCollateral(clientSeat);
    transferRun(clientSeat);
    manager.reallocateWithFee(fee, vaultSeat, clientSeat);

    // parent needs to know about the change in debt
    refreshLoanTracking(oldDebt, oldCollateral, newDebt);

    runMint.burnLosses(harden({ RUN: runAfter.vault }), vaultSeat);

    assertVaultHoldsNoRun();

    updateUiState();
    clientSeat.exit();

    return 'We have adjusted your balances, thank you for your business';
  };

  const makeAdjustBalancesInvitation = () => {
    assertActive();
    return zcf.makeInvitation(adjustBalancesHook, 'AdjustBalances');
  };

  const setupOuter = inner => {
    const { vault, uiUpdater: updater } = makeOuterKit(inner);
    outerUpdater = updater;
    updateUiState();
    return harden({
      assetNotifier,
      vaultNotifier: vault.getNotifier(),
      invitationMakers: Far('invitation makers', {
        AdjustBalances: vault.makeAdjustBalancesInvitation,
        CloseVault: vault.makeCloseInvitation,
        TransferVault: vault.makeTransferInvitation,
      }),
      vault,
    });
  };

  /**
   * @param {ZCFSeat} seat
   * @param {InnerVault} innerVault
   */
  const initVaultKit = async (seat, innerVault) => {
    assert(
      AmountMath.isEmpty(debtSnapshot.run),
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

    runMint.mintGains(harden({ RUN: stagedDebt }), vaultSeat);

    seat.incrementBy(vaultSeat.decrementBy(harden({ RUN: wantedRun })));
    vaultSeat.incrementBy(
      seat.decrementBy(harden({ Collateral: collateralAmount })),
    );
    manager.reallocateWithFee(fee, vaultSeat, seat);

    refreshLoanTracking(oldDebt, oldCollateral, stagedDebt);

    return setupOuter(innerVault);
  };

  const makeTransferInvitationHook = seat => {
    assertCloseable();
    seat.exit();
    // eslint-disable-next-line no-use-before-define
    return setupOuter(innerVault);
  };

  const innerVault = Far('innerVault', {
    getVaultSeat: () => vaultSeat,

    initVaultKit: seat => initVaultKit(seat, innerVault),
    liquidating,
    liquidated,

    makeAdjustBalancesInvitation,
    makeCloseInvitation,
    makeTransferInvitation: () => {
      if (outerUpdater) {
        outerUpdater.finish(snapshotState(VaultPhase.TRANSFER));
        outerUpdater = null;
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
/** @typedef {Awaited<ReturnType<InnerVault['initVaultKit']>>} VaultKit */
/** @typedef {VaultKit['vault']} Vault */
