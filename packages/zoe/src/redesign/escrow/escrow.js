// @ts-check

/**
 * The Escrow Service
 *
 * Users can deposit payments in escrow accounts, with clear
 * conditions for how the account can be closed and how funds can
 * moved between accounts. Funds can only be moved between escrow
 * accounts after the conditions for moving (offer safety) and total
 * conservation of funds (rights conservation) have been confirmed.
 */

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeScalarMap } from '@agoric/store';

import { areAmountsGTE } from './offerSafety';
import { assertRightsConservedForAllocations } from './assertRightsConservedForAllocations.js';
import { assertOfferSafetyForAllocations } from './assertOfferSafetyForAllocations.js';
import { holdEscrowPurses } from './purses.js';
import { assertPayments } from './assertPayments.js';
import { cleanConditions, CLOSING_CONDITIONS } from './cleanConditions.js';
import { assertRemotable } from './assertPassStyleOf.js';
import { coerceDeltas } from './coerceDeltas.js';
import { addAmounts, subtractAmounts } from './amountArrayMath.js';
import { calculateAllocations } from './calculateAllocations';
import { assertAmounts } from './assertAmounts';
import { makeHandle } from '../makeHandle';
import { deleteSeatDeltas } from './deleteSeatDeltas';

const { details: X } = assert;

const makeZoeEscrowService = (shutdownWithFailure = _err => {}) => {
  const { depositPayments, withdrawPayments, addIssuer } = holdEscrowPurses();

  // The amounts that will be paid out if the escrowAccount were to
  // close now
  /** @type {Store<EscrowAccount, Array<Amount>>} */
  const escrowAccountToCurrentAmounts = makeScalarMap('escrowAccount');

  // The amounts that the user has deposited (minus those withdrawn)
  // Used for offerSafety
  /** @type {Store<EscrowAccount, Array<Amount>>} */
  const escrowAccountToEscrowedAmounts = makeScalarMap('escrowAccount');

  // Seats are the exclusive right to transfer assets to and from an
  // escrowAccount
  /** @type {Store<EscrowAccount, Seat>} */
  const escrowAccountToSeat = makeScalarMap('escrowAccount');
  /** @type {Store<Seat, EscrowAccount>} */
  const seatToEscrowAccount = makeScalarMap('seat');

  /** @type {TransferAssets} */
  const transferAssets = async deltas => {
    const isEscrowAccount = escrowAccountToCurrentAmounts.has;
    const hasSeat = escrowAccountToSeat.has;
    const localDeltas = await coerceDeltas(isEscrowAccount, hasSeat, deltas);
    const allocations = calculateAllocations(localDeltas);
    assertRightsConservedForAllocations(allocations);
    assertOfferSafetyForAllocations(allocations);

    try {
      // No side effects above. All conditions checked which could have
      // caused us to reject this reallocation.
      // COMMIT POINT
      allocations.forEach(({ account, amounts }) => {
        escrowAccountToCurrentAmounts.set(account, amounts);
      });
    } catch (err) {
      shutdownWithFailure(err);
      throw err;
    }

    // Close the escrow account if the wantedAmounts are achieved and
    // the closingConditions allow it

    allocations.forEach(({ account }) => {
      const { closing, wantedAmounts } = account.getConditions();
      if (closing.condition === CLOSING_CONDITIONS.OPTIMISTIC) {
        if (areAmountsGTE(account.getCurrentAmounts(), wantedAmounts)) {
          account.closeAccount();
        }
      }
    });
  };

  /** @type {StartTransfer} */
  const startExclTransfer = async accounts => {
    const localAccounts = await Promise.all(accounts);
    return localAccounts.map(account => account.startTransfer());
  };

  // TODO: figure out if this needs to allow for ERef<Seat>
  /** @type {CompleteTransfer} */
  const completeExclTransfer = async seatDeltas => {
    const deleteSeat = seat => {
      const ea = seatToEscrowAccount.get(seat);
      seatToEscrowAccount.delete(seat);
      escrowAccountToSeat.delete(ea);
      return ea;
    };
    const deltas = deleteSeatDeltas(deleteSeat, seatDeltas);
    return transferAssets(deltas);
  };

  // The `escrowAccount` object has the ability to release funds from
  // escrow, which triggers payments being sent to the pre-registered
  // payoutHandler.

  // "releasing funds from escrow" = "payout"
  const openEscrowAccount = async (payments, conditions, payoutHandler) => {
    // Validate the inputs
    const paymentsArray = assertPayments(payments);
    conditions = cleanConditions(conditions);
    assertRemotable(payoutHandler, `payoutHandler`);

    let paymentsAmounts;
    try {
      paymentsAmounts = await depositPayments(paymentsArray);
    } catch (err) {
      // TODO: handle case of partially deposited
      // const payouts = withdrawPayments(alreadyDepositedAmounts);
      E(payoutHandler).handle(paymentsArray);
      throw err;
    }

    const assertOpen = ea => {
      assert(
        escrowAccountToCurrentAmounts.has(ea),
        `The escrow account ${ea} has been closed, or is not actually an escrow account`,
      );
    };

    // TODO: handle afterDeadline closing, and prevent closing (from both
    // contract and user's side) if that is the case.

    /** @type {EscrowAccount} */
    const escrowAccount = Far('escrowAccount', {
      getConditions: () => conditions,
      getCurrentAmounts: () => escrowAccountToCurrentAmounts.get(escrowAccount),
      closeAccount: async (promiseToWait = Promise.resolve()) => {
        await promiseToWait;
        assertOpen(escrowAccount);
        const closingAmounts = escrowAccountToCurrentAmounts.get(escrowAccount);
        escrowAccountToCurrentAmounts.delete(escrowAccount);
        escrowAccountToEscrowedAmounts.delete(escrowAccount);
        const payouts = withdrawPayments(closingAmounts);
        E(payoutHandler).handle(payouts);
        return closingAmounts;
      },
      deposit: async additionalPayments => {
        // TODO: are deposits allowed even with an outstanding seat?
        assert(
          !escrowAccountToSeat.has(escrowAccount),
          X`Deposit failed because there is an outstanding exclusive right to transfer assets to and from this escrowAccount`,
        );
        const additionalPaymentsArray = assertPayments(additionalPayments);
        const additionalAmounts = await depositPayments(
          additionalPaymentsArray,
        );
        const currentAmounts = escrowAccountToCurrentAmounts.get(escrowAccount);
        const escrowedAmounts = escrowAccountToEscrowedAmounts.get(
          escrowAccount,
        );
        const combinedCurrent = addAmounts(currentAmounts, additionalAmounts);
        const combinedEscrowed = addAmounts(escrowedAmounts, additionalAmounts);

        // COMMIT POINT
        escrowAccountToCurrentAmounts.set(escrowAccount, combinedCurrent);
        escrowAccountToEscrowedAmounts.set(escrowAccount, combinedEscrowed);
        return additionalAmounts;
      },
      withdraw: amountsToWithdraw => {
        assert(
          !escrowAccountToSeat.has(escrowAccount),
          X`Deposit failed because there is an outstanding exclusive right to transfer assets to and from this escrowAccount`,
        );
        assertAmounts(amountsToWithdraw);
        const currentAmounts = escrowAccountToCurrentAmounts.get(escrowAccount);
        const escrowedAmounts = escrowAccountToEscrowedAmounts.get(
          escrowAccount,
        );
        const remainingCurrent = subtractAmounts(
          currentAmounts,
          amountsToWithdraw,
        );
        const remainingEscrowed = subtractAmounts(
          escrowedAmounts,
          amountsToWithdraw,
        );

        // COMMIT POINT
        escrowAccountToCurrentAmounts.set(escrowAccount, remainingCurrent);
        escrowAccountToEscrowedAmounts.set(escrowAccount, remainingEscrowed);
        const newPayments = withdrawPayments(amountsToWithdraw);
        E(payoutHandler).handle(newPayments);
      },
      startTransfer: () => {
        const seat = makeHandle('Seat');
        escrowAccountToSeat.init(escrowAccount, seat);
        seatToEscrowAccount.init(seat, escrowAccount);
        return harden({
          seat, // To be renamed
          conditions,
          currentAmounts: escrowAccountToCurrentAmounts.get(escrowAccount),
          escrowedAmounts: escrowAccountToEscrowedAmounts.get(escrowAccount),
        });
      },
    });
    escrowAccountToCurrentAmounts.init(escrowAccount, paymentsAmounts);
    return escrowAccount;
  };

  return harden({
    addIssuer,
    openEscrowAccount,
    transferAssets,
    startExclTransfer,
    completeExclTransfer,
  });
};
harden(makeZoeEscrowService);
export { makeZoeEscrowService };
