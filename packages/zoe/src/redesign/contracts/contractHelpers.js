//   const proposedAllocations = move(poolOutS, swapperS, amountOut)
//   .move(poolInS, poolOutS, reducedCentralAmount)
//   .move(swapperS, poolInS, reducedAmountIn)
//   .end();

import { addAmounts } from '../escrow/amountArrayMath';

// return proposedAllocations;

const move = (fromSnapshot, toSnapshot, amountsToMove) => {
  const allocations = [];
  const updatedFromSnapshot = {
    escrowAccount: fromSnapshot.escrowAccount,
    conditions: fromSnapshot.conditions,
    amounts: subtractAmounts(fromSnapshot.amounts, amountsToMove),
  };
  allocations.push(updatedFromSnapshot);
  const updatedToSnapshot = {
    escrowAccount: toSnapshot.escrowAccount,
    conditions: toSnapshot.conditions,
    amounts: addAmounts(toSnapshot.amounts, amountsToMove),
  };
  allocations.push(updatedToSnapshot);

  // TODO: figure out how to chain these
  return {
    move: () => {},
  };
};

/**
 * @param {Array<ERef<EscrowAccount>>} escrowAccounts
 * @returns {Promise<Array<EASnapshot>>}
 */
const takeSnapshots = escrowAccounts =>
  Promise.all(escrowAccounts.map(ea => E(ea).takeSnapshot()));

/**
 *
 * @param {Array<ERef<EscrowAccount>>} escrowAccounts
 * @param {Promise=} promiseToAwait
 * @returns {Promise<Array<Array<Amount>>>}
 */
const closeAccounts = (escrowAccounts, promiseToAwait) => {
  return Promise.all(
    escrowAccounts.map(ea => E(ea).closeAccount(promiseToAwait)),
  );
};

// Trade everything with each other
const swapAll = ([firstSnapshot, secondSnapshot]) => {
  return move(firstSnapshot, secondSnapshot, firstSnapshot.amounts)
    .move(secondSnapshot, firstSnapshot, secondSnapshot.amounts)
    .end();
};
