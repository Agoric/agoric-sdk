// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';

import '../../../exported.js';

const { details: X } = assert;

const swapAll = ([firstSnapshot, secondSnapshot]) => {
  const firstAllocation = harden({
    escrowAccount: firstSnapshot.escrowAccount,
    amounts: secondSnapshot.amounts,
  });

  const secondAllocation = harden({
    escrowAccount: secondSnapshot.escrowAccount,
    amounts: firstSnapshot.amounts,
  });

  return [firstAllocation, secondAllocation];
};

const performTransfer = async (escrowService, accounts, callback) => {
  const snapshots = await E(escrowService).startTransfer(...accounts);
  const newSnapshots = callback(snapshots);
  return E(escrowService).completeTransfer(...newSnapshots);
};

const contractHelper = es => {
  return harden({
    transfer: async (callback, accounts) => {
      const newSnapshotsP = E.when(E(es).startTransfer(accounts), callback);
      return E(es).completeTransfer(newSnapshotsP);
    },
  });
};

// no helpers
const startNoHelpers = escrow => {
  let initialEA;
  const startSwap = initial => {
    initialEA = initial;
  };
  const completeSwap = async matchingEA => {
    assert(initialEA !== undefined, X`The swap has not yet started`);
    const [initialS, matchingS] = await E(escrow).startTransfer([
      initialEA,
      matchingEA,
    ]);
    const completeP = E(escrow).completeTransfer([
      {
        seat: initialS.seat,
        subtract: matchingS.conditions.wantedAmounts,
        add: initialS.conditions.wantedAmounts,
      },
      {
        seat: matchingS.seat,
        subtract: initialS.conditions.wantedAmounts,
        add: matchingS.conditions.wantedAmounts,
      },
    ]);
    completeP
      .then(() => {
        const initialClosed = E(initialEA).closeAccount();
        const matchingClosed = E(matchingEA).closeAccount();
        return Promise.all([initialClosed, matchingClosed]);
      })
      .then(() => {
        shutdownVat();
      });
  };
  return Far('API', {
    startSwap,
    completeSwap,
  });
};

/**
 * All of the escrowed assets are swapped between two escrowAccounts.
 *
 * @param {EscrowService} escrowService
 */
const start = escrowService => {
  const h = makeHelper(escrowService);
  const offerFirst = firstEA => {
    const offerSecond = async secondEA => {
      const callback = ([leftSeat, rightSeat]) => {
        rightSeat.decrementBy(leftSeat.getWanted());
        leftSeat.incrementBy(leftSeat.getWanted());
        leftSeat.decrementBy(rightSeat.getWanted());
        rightSeat.incrementBy(rightSeat.getWanted());

        return [leftSeat, rightSeat];
      };
      h.transfer(callback, [firstEA, secondEA]);
    };

    return Far('secondOffer', {
      offerSecond,
    });
  };

  return Far('firstOffer', {
    offerFirst,
  });
};

harden(start);
export { start };
