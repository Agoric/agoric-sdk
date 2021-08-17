// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { calculateFees } from './calcFees';

const subtractRelevantFees = (amount, fee) => {
  if (amount.brand === fee.brand) {
    return AmountMath.subtract(amount, fee);
  }
  return amount;
};

const subtractFees = (amount, { poolFee, protocolFee }) => {
  return subtractRelevantFees(
    subtractRelevantFees(amount, protocolFee),
    poolFee,
  );
};

const addRelevantFees = (amount, fee) => {
  if (amount.brand === fee.brand) {
    return AmountMath.add(amount, fee);
  }
  return amount;
};

const addFees = (amount, { poolFee, protocolFee }) => {
  return addRelevantFees(addRelevantFees(amount, protocolFee), poolFee);
};

const addOrSubtractFromPool = (addOrSub, poolAllocation, amount) => {
  if (poolAllocation.Central.brand === amount.brand) {
    return addOrSub(poolAllocation.Central, amount);
  } else {
    return addOrSub(poolAllocation.Secondary, amount);
  }
};

const assertGreaterThanZeroHelper = (amount, name) => {
  assert(
    amount && !AmountMath.isGTE(AmountMath.makeEmptyFromAmount(amount), amount),
    X`${name} must be greater than 0: ${amount}`,
  );
};

const assertWantedAvailable = (poolAllocation, amountWanted) => {
  if (amountWanted.brand === poolAllocation.Central.brand) {
    assert(
      AmountMath.isGTE(poolAllocation.Central, amountWanted),
      X`The poolAllocation ${poolAllocation.Central} did not have enough to satisfy the wanted amountOut ${amountWanted}`,
    );
  } else {
    assert(
      !AmountMath.isGTE(amountWanted, poolAllocation.Secondary),
      X`The poolAllocation ${poolAllocation.Secondary} did not have enough to satisfy the wanted amountOut ${amountWanted}`,
    );
  }
};

export const swap = (
  amountGiven,
  poolAllocation,
  amountWanted,
  protocolFeeRatio,
  poolFeeRatio,
  swapFn,
) => {
  assertGreaterThanZeroHelper(poolAllocation.Central, 'poolAllocation.Central');
  assertGreaterThanZeroHelper(
    poolAllocation.Secondary,
    'poolAllocation.Secondary',
  );
  assertGreaterThanZeroHelper(amountGiven, 'amountGiven');
  assertGreaterThanZeroHelper(amountWanted, 'amountWanted');
  assertWantedAvailable(poolAllocation, amountWanted);

  // The protocol fee must always be collected in RUN, but the pool
  // fee is collected in the amount opposite of what is specified.

  const fees = calculateFees(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
    swapFn,
  );

  const { amountIn, amountOut } = swapFn({
    amountGiven: subtractFees(fees.amountIn, fees),
    poolAllocation,
    amountWanted,
  });

  const swapperGives = addFees(amountIn, fees);
  const swapperGets = subtractFees(amountOut, fees);

  // assert(
  //   AmountMath.isGTE(amountGiven, swapperGives),
  //   X`The amount provided ${amountGiven} is not enough. ${swapperGives} is required.`,
  // );

  const result = {
    protocolFee: fees.protocolFee,
    poolFee: fees.poolFee,
    swapperGives,
    swapperGets,
    // swapperGiveRefund: AmountMath.subtract(amountGiven, swapperGives),
    deltaX: amountIn,
    deltaY: amountOut,
    newX: addOrSubtractFromPool(AmountMath.add, poolAllocation, amountIn),
    newY: addOrSubtractFromPool(AmountMath.subtract, poolAllocation, amountOut),
  };

  return result;
};
