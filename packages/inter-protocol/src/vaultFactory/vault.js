import { AmountMath, AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { StorageNodeShape } from '@agoric/notifier/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import {
  assertProposalShape,
  atomicTransfer,
  floorMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/index.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { addSubtract, allEmpty, assertOnlyKeys } from '../contractSupport.js';
import { calculateCurrentDebt, reverseInterest } from '../interest-math.js';
import { UnguardedHelperI } from '../typeGuards.js';
import { prepareVaultKit } from './vaultKit.js';

import '@agoric/zoe/exported.js';
import { calculateLoanCosts } from './math.js';

const { quote: q, Fail } = assert;

const trace = makeTracer('IV', false);

/** @typedef {import('./storeUtils.js').NormalizedDebt} NormalizedDebt */

/**
 * @file This has most of the logic for a Vault, to borrow Minted against collateral.
 *
 * The logic here is for Vault which is the majority of logic of vaults but
 * the user view is the `vault` value contained in VaultKit.
 *
 * A note on naming convention:
 * - `Pre` is used as a postfix for any mutable value retrieved *before* an
 *    `await`, to flag values that must used very carefully after the `await`
 * - `new` is a prefix for values that describe the result of executing a
 *   transaction; e.g., `debt` is the value before the txn, and `newDebt`
 *   will be value if the txn completes.
 * - the absence of one of these implies the opposite, so `newDebt` is the
 *   future value fo `debt`, as computed based on values after any `await`
 */

/**
 * Constants for vault phase.
 *
 * ACTIVE       - vault is in use and can be changed
 * LIQUIDATING  - vault is being liquidated by the vault manager, and cannot be changed by the user.
 *                If liquidation fails, vaults may remain in this state. An upgrade to the contract
 *                might be able to recover them.
 * TRANSFER     - vault is able to be transferred (payments and debits frozen until it has a new owner)
 * CLOSED       - vault was closed by the user and all assets have been paid out
 * LIQUIDATED   - vault was closed by the manager, with remaining assets paid to owner
 */
export const Phase = /** @type {const} */ ({
  ACTIVE: 'active',
  LIQUIDATING: 'liquidating',
  CLOSED: 'closed',
  LIQUIDATED: 'liquidated',
  TRANSFER: 'transfer',
});

/**
 * @typedef {Phase[keyof Omit<typeof Phase, 'TRANSFER'>]} VaultPhase
 * @type {{[K in VaultPhase]: Array<VaultPhase>}}
 */
const validTransitions = {
  [Phase.ACTIVE]: [Phase.LIQUIDATING, Phase.CLOSED],
  [Phase.LIQUIDATING]: [Phase.LIQUIDATED],
  [Phase.LIQUIDATED]: [Phase.CLOSED],
  [Phase.CLOSED]: [],
};

/**
 * @typedef {Phase[keyof typeof Phase]} HolderPhase
 *
 * @typedef {object} VaultNotification
 * @property {Amount<'nat'>} locked Amount of Collateral locked
 * @property {{debt: Amount<'nat'>, interest: Ratio}} debtSnapshot 'debt' at the point the compounded interest was 'interest'
 * @property {HolderPhase} vaultState
 */

// XXX masks typedef from types.js, but using that causes circular def problems
/**
 * @typedef {object} VaultManager
 * @property {() => Subscriber<import('./vaultManager').AssetState>} getAssetSubscriber
 * @property {(collateralAmount: Amount) => ERef<Amount<'nat'>>} maxDebtFor
 * @property {() => Brand} getCollateralBrand
 * @property {(base: string) => string} scopeDescription
 * @property {() => Brand<'nat'>} getDebtBrand
 * @property {MintAndTransfer} mintAndTransfer
 * @property {(amount: Amount, seat: ZCFSeat) => void} burnAndRecord
 * @property {() => Ratio} getCompoundedInterest
 * @property {(oldDebt: import('./storeUtils.js').NormalizedDebt, oldCollateral: Amount<'nat'>, vaultId: VaultId, vaultPhase: VaultPhase, vault: Vault) => void} handleBalanceChange
 * @property {() => import('./vaultManager.js').GovernedParamGetters} getGovernedParams
 */

/**
 * @typedef {Readonly<{
 * idInManager: VaultId,
 * manager: VaultManager,
 * storageNode: StorageNode,
 * vaultSeat: ZCFSeat,
 * }>} ImmutableState
 */

/**
 * Snapshot is of the debt and compounded interest when the principal was last changed.
 *
 * @typedef {{
 *   interestSnapshot: Ratio,
 *   phase: VaultPhase,
 *   debtSnapshot: Amount<'nat'>,
 *   outerUpdater: Publisher<VaultNotification> | null,
 * }} MutableState
 */

/**
 * Check whether we can proceed with an `adjustBalances`.
 *
 * @param {Amount<'nat'>} newCollateralPre
 * @param {Amount<'nat'>} maxDebtPre
 * @param {Amount<'nat'>} newCollateral
 * @param {Amount<'nat'>} newDebt
 * @returns {boolean}
 */
const allocationsChangedSinceQuote = (
  newCollateralPre,
  maxDebtPre,
  newCollateral,
  newDebt,
) => {
  trace('allocationsChangedSinceQuote', {
    newCollateralPre,
    maxDebtPre,
    newCollateral,
    newDebt,
  });
  if (AmountMath.isGTE(newCollateralPre, newCollateral)) {
    // The collateral did not go up. If the collateral decreased, we pro-rate maxDebt.
    // We can pro-rate maxDebt because the quote is either linear (price is
    // unchanging) or super-linear (also called "convex").
    const debtPerCollateral = makeRatioFromAmounts(
      maxDebtPre,
      newCollateralPre,
    );
    // `floorMultiply` because the debt ceiling should be tight
    const maxDebtAfter = floorMultiplyBy(newCollateral, debtPerCollateral);
    AmountMath.isGTE(maxDebtAfter, newDebt) ||
      Fail`The requested debt ${q(
        newDebt,
      )} is more than the collateralization ratio allows: ${q(maxDebtAfter)}`;
    // The `collateralAfter` can still cover the `newDebt`, so don't restart.
    return false;
  }
  // The collateral went up. Restart if the debt *also* went up because
  // the price quote might not apply at the higher numbers.
  return !AmountMath.isGTE(maxDebtPre, newDebt);
};

export const VaultI = M.interface('Vault', {
  getCollateralAmount: M.call().returns(AmountShape),
  getCurrentDebt: M.call().returns(AmountShape),
  getNormalizedDebt: M.call().returns(AmountShape),
  getVaultSeat: M.call().returns(SeatShape),
  initVaultKit: M.call(SeatShape, StorageNodeShape).returns(M.promise()),
  liquidated: M.call().returns(undefined),
  liquidating: M.call().returns(undefined),
  makeAdjustBalancesInvitation: M.call().returns(M.promise()),
  makeCloseInvitation: M.call().returns(M.promise()),
  makeTransferInvitation: M.call().returns(M.promise()),
});

/**
 * @param {import('@agoric/ertp').Baggage} baggage
 * @param {ERef<Marshaller>} marshaller
 * @param {ZCF} zcf
 */
export const prepareVault = (baggage, marshaller, zcf) => {
  const makeVaultKit = prepareVaultKit(baggage, marshaller);

  const maker = prepareExoClassKit(
    baggage,
    'Vault',
    {
      helper: UnguardedHelperI,
      self: VaultI,
    },
    /**
     * @param {VaultManager} manager
     * @param {VaultId} idInManager
     * @param {StorageNode} storageNode
     * @returns {ImmutableState & MutableState}
     */
    (manager, idInManager, storageNode) => {
      return harden({
        idInManager,
        manager,
        outerUpdater: null,
        phase: Phase.ACTIVE,

        storageNode,

        // vaultSeat will hold the collateral until the loan is retired. The
        // payout from it will be handed to the user: if the vault dies early
        // (because the vaultFactory vat died), they'll get all their
        // collateral back. If that happens, the issuer for the Minted will be dead,
        // so their loan will be worthless.
        vaultSeat: zcf.makeEmptySeatKit().zcfSeat,

        // Two values from the same moment
        interestSnapshot: manager.getCompoundedInterest(),
        debtSnapshot: AmountMath.makeEmpty(manager.getDebtBrand()),
      });
    },
    {
      helper: {
        // #region Computed constants
        collateralBrand() {
          return this.state.manager.getCollateralBrand();
        },
        debtBrand() {
          return this.state.manager.getDebtBrand();
        },

        emptyCollateral() {
          return AmountMath.makeEmpty(this.facets.helper.collateralBrand());
        },
        emptyDebt() {
          return AmountMath.makeEmpty(this.facets.helper.debtBrand());
        },
        /**
         * @typedef {{ give: { Collateral: Amount<'nat'>, Minted: Amount<'nat'> }, want: { Collateral: Amount<'nat'>, Minted: Amount<'nat'> } }} FullProposal
         */
        /**
         * @param {ProposalRecord} partial
         * @returns {FullProposal}
         */
        fullProposal(partial) {
          assertOnlyKeys(partial, ['Collateral', 'Minted']);
          return {
            give: {
              Collateral:
                partial.give?.Collateral ||
                this.facets.helper.emptyCollateral(),
              Minted: partial.give?.Minted || this.facets.helper.emptyDebt(),
            },
            want: {
              Collateral:
                partial.want?.Collateral ||
                this.facets.helper.emptyCollateral(),
              Minted: partial.want?.Minted || this.facets.helper.emptyDebt(),
            },
          };
        },
        // #endregion

        // #region Phase logic
        /**
         * @param {VaultPhase} newPhase
         */
        assignPhase(newPhase) {
          const { state } = this;

          const { phase } = state;
          const validNewPhases = validTransitions[phase];
          validNewPhases.includes(newPhase) ||
            Fail`Vault cannot transition from ${q(phase)} to ${q(newPhase)}`;
          state.phase = newPhase;
        },

        assertActive() {
          const { phase } = this.state;
          phase === Phase.ACTIVE || Fail`vault not active`;
        },

        assertCloseable() {
          const { phase } = this.state;
          phase === Phase.ACTIVE ||
            phase === Phase.LIQUIDATED ||
            Fail`to be closed a vault must be active or liquidated, not ${phase}`;
        },
        // #endregion

        /**
         * Called whenever the debt is paid or created through a transaction,
         * but not for interest accrual.
         *
         * @param {Amount<'nat'>} newDebt - principal and all accrued interest
         */
        updateDebtSnapshot(newDebt) {
          const { state } = this;

          // update local state
          state.debtSnapshot = newDebt;
          state.interestSnapshot = state.manager.getCompoundedInterest();
        },

        /**
         * Update the debt balance and propagate upwards to
         * maintain aggregate debt and liquidation order.
         *
         * @param {NormalizedDebt} oldDebtNormalized - prior principal and all accrued interest, normalized to the launch of the vaultManager
         * @param {Amount<'nat'>} oldCollateral - actual collateral
         * @param {Amount<'nat'>} newDebtActual - actual principal and all accrued interest
         */
        updateDebtAccounting(oldDebtNormalized, oldCollateral, newDebtActual) {
          const { state, facets } = this;
          const { helper } = facets;
          helper.updateDebtSnapshot(newDebtActual);
          // notify manager so it can notify and clean up as appropriate
          state.manager.handleBalanceChange(
            oldDebtNormalized,
            oldCollateral,
            state.idInManager,
            state.phase,
            facets.self,
          );
        },

        /**
         *
         * @param {ZCFSeat} seat
         */
        getCollateralAllocated(seat) {
          return seat.getAmountAllocated(
            'Collateral',
            this.facets.helper.collateralBrand(),
          );
        },
        getMintedAllocated(seat) {
          return seat.getAmountAllocated(
            'Minted',
            this.facets.helper.debtBrand(),
          );
        },

        assertVaultHoldsNoMinted() {
          const { state, facets } = this;
          const { vaultSeat } = state;
          AmountMath.isEmpty(facets.helper.getMintedAllocated(vaultSeat)) ||
            Fail`Vault should be empty of Minted`;
        },

        /**
         *
         * @param {Amount<'nat'>} collateralAmount
         * @param {Amount<'nat'>} proposedDebt
         */
        async assertSufficientCollateral(collateralAmount, proposedDebt) {
          const { state, facets } = this;
          const maxDebt = await state.manager.maxDebtFor(collateralAmount);
          AmountMath.isGTE(maxDebt, proposedDebt, facets.helper.debtBrand()) ||
            Fail`Proposed debt ${q(proposedDebt)} exceeds max ${q(
              maxDebt,
            )} for ${q(collateralAmount)} collateral`;
        },

        /**
         *
         * @param {HolderPhase} newPhase
         */
        getStateSnapshot(newPhase) {
          const { state, facets } = this;

          const { debtSnapshot: debt, interestSnapshot: interest } = state;
          /** @type {VaultNotification} */
          return harden({
            debtSnapshot: { debt, interest },
            locked: facets.self.getCollateralAmount(),
            // newPhase param is so that makeTransferInvitation can finish without setting the vault's phase
            // TODO refactor https://github.com/Agoric/agoric-sdk/issues/4415
            vaultState: newPhase,
          });
        },

        /**
         * call this whenever anything changes!
         */
        updateUiState() {
          const { state, facets } = this;
          const { outerUpdater } = state;
          if (!outerUpdater) {
            // It's not an error to change to liquidating during transfer
            return;
          }
          const { phase } = state;
          const uiState = facets.helper.getStateSnapshot(phase);
          trace('updateUiState', state.idInManager, uiState);

          switch (phase) {
            case Phase.ACTIVE:
            case Phase.LIQUIDATING:
            case Phase.LIQUIDATED:
              outerUpdater.publish(uiState);
              break;
            case Phase.CLOSED:
              outerUpdater.finish(uiState);
              state.outerUpdater = null;
              break;
            default:
              throw Error(`unreachable vault phase: ${phase}`);
          }
        },

        /**
         * @param {ZCFSeat} seat
         */
        async closeHook(seat) {
          const { state, facets } = this;

          const { self, helper } = facets;
          helper.assertCloseable();
          const { phase, vaultSeat } = state;

          // Held as keys for cleanup in the manager
          const oldDebtNormalized = self.getNormalizedDebt();
          const oldCollateral = self.getCollateralAmount();

          if (phase === Phase.ACTIVE) {
            assertProposalShape(seat, {
              give: { Minted: null },
            });

            // you're paying off the debt, you get everything back.
            const debt = self.getCurrentDebt();
            const {
              give: { Minted: given },
            } = seat.getProposal();

            // you must pay off the entire remainder but if you offer too much, we won't
            // take more than you owe
            AmountMath.isGTE(given, debt) ||
              Fail`Offer ${given} is not sufficient to pay off debt ${debt}`;

            // Return any overpayment
            atomicTransfer(
              zcf,
              vaultSeat,
              seat,
              vaultSeat.getCurrentAllocation(),
            );

            state.manager.burnAndRecord(debt, seat);
          } else if (phase === Phase.LIQUIDATED) {
            // Simply reallocate vault assets to the offer seat.
            // Don't take anything from the offer, even if vault is underwater.
            // TODO verify that returning Minted here doesn't mess up debt limits

            atomicTransfer(
              zcf,
              vaultSeat,
              seat,
              vaultSeat.getCurrentAllocation(),
            );
          } else {
            throw new Error('only active and liquidated vaults can be closed');
          }

          seat.exit();
          helper.assignPhase(Phase.CLOSED);
          helper.updateDebtSnapshot(helper.emptyDebt());
          helper.updateUiState();

          helper.assertVaultHoldsNoMinted();
          vaultSeat.exit();

          state.manager.handleBalanceChange(
            oldDebtNormalized,
            oldCollateral,
            state.idInManager,
            state.phase,
            facets.self,
          );

          return 'your loan is closed, thank you for your business';
        },

        /**
         * Calculate the fee, the amount to mint and the resulting debt.
         * The give and the want together reflect a delta, where typically
         * one is zero because they come from the gave/want of an offer
         * proposal. If the `want` is zero, the `fee` will also be zero,
         * so the simple math works.
         *
         * @param {Amount<'nat'>} currentDebt
         * @param {Amount<'nat'>} giveAmount
         * @param {Amount<'nat'>} wantAmount
         */
        loanFee(currentDebt, giveAmount, wantAmount) {
          const { state } = this;

          return calculateLoanCosts(
            currentDebt,
            giveAmount,
            wantAmount,
            state.manager.getGovernedParams().getLoanFee(),
          );
        },

        /**
         * Adjust principal and collateral (atomically for offer safety)
         *
         * @param {ZCFSeat} clientSeat
         * @returns {Promise<string>} success message
         */
        async adjustBalancesHook(clientSeat) {
          const { state, facets } = this;

          const { self, helper } = facets;
          const { outerUpdater: updaterPre } = state;
          const { vaultSeat } = state;
          const fp = helper.fullProposal(clientSeat.getProposal());

          if (
            allEmpty([
              fp.give.Collateral,
              fp.give.Minted,
              fp.want.Collateral,
              fp.want.Minted,
            ])
          ) {
            clientSeat.exit();
            return 'no transaction, as requested';
          }

          // Calculate the fee, the amount to mint and the resulting debt. We'll
          // verify that the target debt doesn't violate the collateralization ratio,
          // then mint, reallocate, and burn.
          const { newDebt, fee, surplus, toMint } = helper.loanFee(
            self.getCurrentDebt(),
            fp.give.Minted,
            fp.want.Minted,
          );

          const normalizedDebtPre = self.getNormalizedDebt();
          const collateralPre = helper.getCollateralAllocated(vaultSeat);
          const hasWants = !allEmpty([fp.want.Collateral, fp.want.Minted]);

          if (!hasWants) {
            // allow deposits regardless of max debt allowed
            return helper.commitBalanceAdjustment(
              clientSeat,
              fp,
              {
                newDebt,
                fee,
                surplus,
                toMint,
              },
              { normalizedDebtPre, collateralPre },
            );
          }

          const newCollateralPre = addSubtract(
            collateralPre,
            fp.give.Collateral,
            fp.want.Collateral,
          );
          // max debt supported by the vault Collateral implied by the proposal
          const maxDebtPre = await state.manager.maxDebtFor(newCollateralPre);
          updaterPre === state.outerUpdater ||
            Fail`Transfer during vault adjustment`;
          helper.assertActive();

          trace('adjustBalancesHook after quote', state.idInManager, {
            newCollateralPre,
            fee,
            toMint,
            maxDebtPre,
            newDebt,
          });

          // While awaiting maxDebtFor, the allocations may have changed.
          // After the `await`, we retrieve the vault's allocations again,
          // so we can compare to the debt limit based on the new values.
          const collateral = helper.getCollateralAllocated(vaultSeat);
          const newCollateral = addSubtract(
            collateral,
            fp.give.Collateral,
            fp.want.Collateral,
          );
          if (
            allocationsChangedSinceQuote(
              newCollateralPre,
              maxDebtPre,
              newCollateral,
              newDebt,
            )
          ) {
            return helper.adjustBalancesHook(clientSeat);
          }

          return helper.commitBalanceAdjustment(
            clientSeat,
            fp,
            {
              newDebt,
              fee,
              surplus,
              toMint,
            },
            { normalizedDebtPre, collateralPre },
          );
        },

        /**
         *
         * @param {ZCFSeat} clientSeat
         * @param {FullProposal} fp
         * @param {ReturnType<typeof calculateLoanCosts>} costs
         * @param {object} accounting
         * @param {NormalizedDebt} accounting.normalizedDebtPre
         * @param {Amount<'nat'>} accounting.collateralPre
         * @returns {Promise<string>} success message
         */
        async commitBalanceAdjustment(
          clientSeat,
          fp,
          { newDebt, fee, surplus, toMint },
          { normalizedDebtPre, collateralPre },
        ) {
          const { state, facets } = this;
          const { helper } = facets;
          const { vaultSeat } = state;

          const giveMintedTaken = AmountMath.subtract(fp.give.Minted, surplus);

          /** @type {import('@agoric/zoe/src/contractSupport/atomicTransfer.js').TransferPart[]} */
          const transfers = harden([
            [clientSeat, vaultSeat, { Collateral: fp.give.Collateral }],
            [vaultSeat, clientSeat, { Collateral: fp.want.Collateral }],
            [clientSeat, vaultSeat, { Minted: giveMintedTaken }],
            // Minted into vaultSeat requires minting and so is done by mintAndTransfer
          ]);

          state.manager.mintAndTransfer(clientSeat, toMint, fee, transfers);

          // parent needs to know about the change in debt
          helper.updateDebtAccounting(
            normalizedDebtPre,
            collateralPre,
            newDebt,
          );
          state.manager.burnAndRecord(giveMintedTaken, vaultSeat);
          helper.assertVaultHoldsNoMinted();

          helper.updateUiState();
          clientSeat.exit();
          return 'We have adjusted your balances, thank you for your business';
        },

        /**
         *
         * @param {ZCFSeat} seat
         * @returns {VaultKit}
         */
        makeTransferInvitationHook(seat) {
          const { state, facets } = this;

          const { self, helper } = facets;
          helper.assertCloseable();
          seat.exit();

          // eslint-disable-next-line no-use-before-define
          const vaultKit = makeVaultKit(self, state.storageNode);
          state.outerUpdater = vaultKit.vaultUpdater;
          helper.updateUiState();

          return vaultKit;
        },
      },
      self: {
        getVaultSeat() {
          return this.state.vaultSeat;
        },

        /**
         * @param {ZCFSeat} seat
         * @param {ERef<StorageNode>} storageNodeP
         */
        async initVaultKit(seat, storageNodeP) {
          const { state, facets } = this;

          const { self, helper } = facets;

          const normalizedDebtPre = self.getNormalizedDebt();
          const actualDebtPre = self.getCurrentDebt();
          (AmountMath.isEmpty(normalizedDebtPre) &&
            AmountMath.isEmpty(actualDebtPre)) ||
            Fail`vault must be empty initially`;

          const collateralPre = self.getCollateralAmount();
          trace('initVaultKit start: collateral', state.idInManager, {
            actualDebtPre,
            collateralPre,
          });

          // get the payout to provide access to the collateral if the
          // contract abandons
          const {
            give: { Collateral: giveCollateral },
            want: { Minted: wantMinted },
          } = seat.getProposal();

          const {
            newDebt: newDebtPre,
            fee,
            toMint,
          } = helper.loanFee(actualDebtPre, helper.emptyDebt(), wantMinted);
          !AmountMath.isEmpty(fee) ||
            Fail`loan requested (${wantMinted}) is too small; cannot accrue interest`;
          AmountMath.isEqual(newDebtPre, toMint) ||
            Fail`fee mismatch for vault`;
          trace(
            'initVault',
            state.idInManager,
            { wantedRun: wantMinted, fee },
            self.getCollateralAmount(),
          );

          await helper.assertSufficientCollateral(giveCollateral, newDebtPre);

          const { vaultSeat } = state;
          state.manager.mintAndTransfer(
            seat,
            toMint,
            fee,
            harden([[seat, vaultSeat, { Collateral: giveCollateral }]]),
          );
          seat.exit();

          helper.updateDebtAccounting(
            normalizedDebtPre,
            collateralPre,
            newDebtPre,
          );
          trace('initVault updateDebtAccounting fired');

          // So that makeVaultKit can be synchronous
          const storageNode = await storageNodeP;
          const vaultKit = makeVaultKit(self, storageNode);
          state.outerUpdater = vaultKit.vaultUpdater;
          helper.updateUiState();
          return vaultKit;
        },

        /**
         * Called by manager at start of liquidation.
         */
        liquidating() {
          const { facets } = this;

          const { helper } = facets;
          helper.assignPhase(Phase.LIQUIDATING);
          helper.updateUiState();
        },

        /**
         * Called by manager at end of liquidation, at which point all debts have been
         * covered.
         */
        liquidated() {
          const { facets } = this;

          const { helper } = facets;
          helper.updateDebtSnapshot(
            // liquidated vaults retain no debt
            AmountMath.makeEmpty(helper.debtBrand()),
          );

          helper.assignPhase(Phase.LIQUIDATED);
          helper.updateUiState();
        },

        makeAdjustBalancesInvitation() {
          const { state, facets } = this;
          const { helper } = facets;
          helper.assertActive();
          return zcf.makeInvitation(
            seat => helper.adjustBalancesHook(seat),
            state.manager.scopeDescription('AdjustBalances'),
          );
        },

        makeCloseInvitation() {
          const { state, facets } = this;
          const { helper } = facets;
          helper.assertCloseable();
          return zcf.makeInvitation(
            seat => helper.closeHook(seat),
            state.manager.scopeDescription('CloseVault'),
          );
        },

        /**
         * @returns {Promise<Invitation>}
         */
        makeTransferInvitation() {
          const { state, facets } = this;
          const { outerUpdater } = state;
          const { self, helper } = facets;
          // Bring the debt snapshot current for the final report before transfer
          helper.updateDebtSnapshot(self.getCurrentDebt());
          const {
            debtSnapshot: debt,
            interestSnapshot: interest,
            phase,
          } = state;
          if (outerUpdater) {
            outerUpdater.finish(helper.getStateSnapshot(Phase.TRANSFER));
            state.outerUpdater = null;
          }
          const transferState = {
            debtSnapshot: { debt, interest },
            locked: self.getCollateralAmount(),
            vaultState: phase,
          };
          return zcf.makeInvitation(
            seat => helper.makeTransferInvitationHook(seat),
            state.manager.scopeDescription('TransferVault'),
            transferState,
          );
        },

        // for status/debugging

        /**
         *
         * @returns {Amount<'nat'>}
         */
        getCollateralAmount() {
          const { state, facets } = this;
          const { vaultSeat } = state;
          const { helper } = facets;
          // getCollateralAllocated would return final allocations
          return vaultSeat.hasExited()
            ? helper.emptyCollateral()
            : helper.getCollateralAllocated(vaultSeat);
        },

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
         *
         * @returns {Amount<'nat'>}
         */
        getCurrentDebt() {
          const { state } = this;
          return calculateCurrentDebt(
            state.debtSnapshot,
            state.interestSnapshot,
            state.manager.getCompoundedInterest(),
          );
        },

        /**
         * The normalization puts all debts on a common time-independent scale since
         * the launch of this vault manager. This allows the manager to order vaults
         * by their debt-to-collateral ratios without having to mutate the debts as
         * the interest accrues.
         *
         * @see getActualDebAmount
         *
         * @returns {import('./storeUtils.js').NormalizedDebt} as if the vault was open at the launch of this manager, before any interest accrued
         */
        getNormalizedDebt() {
          const { state } = this;
          // @ts-expect-error cast
          return reverseInterest(state.debtSnapshot, state.interestSnapshot);
        },
      },
    },
  );
  return maker;
};

/** @typedef {ReturnType<ReturnType<typeof prepareVault>>['self']} Vault */
