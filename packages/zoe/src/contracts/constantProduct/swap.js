// @ts-check

import { assert, details as X } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';
import { calculateFees, amountGT, maximum } from './calcFees.js';

const subtractRelevantFees = (amount, fee) => {
  if (amount.brand === fee.brand) {
    if (AmountMath.isGTE(fee, amount)) {
      return AmountMath.makeEmptyFromAmount(amount);
    }

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

const isWantedAvailable = (poolAllocation, amountWanted) => {
  return amountWanted.brand === poolAllocation.Central.brand
    ? !AmountMath.isGTE(amountWanted, poolAllocation.Central)
    : !AmountMath.isGTE(amountWanted, poolAllocation.Secondary);
};

function noTransaction(amountGiven, amountWanted, poolAllocation, poolFee) {
  const emptyGive = AmountMath.makeEmptyFromAmount(amountGiven);
  const emptyWant = AmountMath.makeEmptyFromAmount(amountWanted);

  let newX;
  let newY;
  if (poolAllocation.Central.brand === amountGiven.brand) {
    newX = poolAllocation.Central;
    newY = poolAllocation.Secondary;
  } else {
    newX = poolAllocation.Secondary;
    newY = poolAllocation.Central;
  }

  const result = {
    protocolFee: AmountMath.makeEmpty(poolAllocation.Central.brand),
    poolFee: AmountMath.makeEmpty(poolFee.numerator.brand),
    swapperGives: emptyGive,
    swapperGets: emptyWant,
    // swapperGiveRefund: AmountMath.subtract(amountGiven, swapperGives),
    xIncrement: emptyGive,
    yDecrement: emptyWant,
    newX,
    newY,
    improvement: emptyGive,
  };
  return result;
}

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
  assert(
    (amountGiven &&
      !AmountMath.isGTE(
        AmountMath.makeEmptyFromAmount(amountGiven),
        amountGiven,
      )) ||
      (amountWanted &&
        !AmountMath.isGTE(
          AmountMath.makeEmptyFromAmount(amountWanted),
          amountWanted,
        )),
    X`amountGiven or amountWanted must be greater than 0: ${amountWanted} ${amountGiven}`,
  );

  if (!isWantedAvailable(poolAllocation, amountWanted)) {
    return noTransaction(
      amountGiven,
      amountWanted,
      poolAllocation,
      poolFeeRatio,
    );
  }

  // The protocol fee must always be collected in RUN, but the pool
  // fee is collected in the amount opposite of what is specified.
  // This call gives us improved amountIn or amountOut
  const fees = calculateFees(
    amountGiven,
    poolAllocation,
    amountWanted,
    protocolFeeRatio,
    poolFeeRatio,
    swapFn,
  );

  if (!isWantedAvailable(poolAllocation, addFees(amountWanted, fees))) {
    return noTransaction(
      amountGiven,
      amountWanted,
      poolAllocation,
      poolFeeRatio,
    );
  }

  // calculate no-fee amounts. swapFn will only pay attention to the specified
  // value. The pool fee is always charged on the unspecified side, so it won't
  // affect the calculation. When the specified value is in RUN, the protocol
  // fee will be deducted from amountGiven before adding to the pool or from
  // amountOut to calculate swapperGets.
  const { amountIn, amountOut, improvement } = swapFn({
    amountGiven: subtractFees(amountGiven, fees),
    poolAllocation,
    amountWanted: addFees(amountWanted, fees),
  });

  if (AmountMath.isEmpty(amountOut)) {
    return noTransaction(
      amountGiven,
      amountWanted,
      poolAllocation,
      poolFeeRatio,
    );
  }

  // The swapper pays extra or receives less to cover the fees.
  const swapperGives = addFees(amountIn, fees);
  const swapperGets = subtractFees(amountOut, fees);

  if (
    AmountMath.isEmpty(swapperGets) ||
    (!AmountMath.isEmpty(amountGiven) && amountGT(swapperGives, amountGiven)) ||
    amountGT(amountWanted, swapperGets)
  ) {
    return noTransaction(
      amountGiven,
      amountWanted,
      poolAllocation,
      poolFeeRatio,
    );
  }

  const xIncrement = addRelevantFees(amountIn, fees.poolFee);
  const yDecrement = subtractRelevantFees(amountOut, fees.poolFee);

  // poolFee is the amount the pool will grow over the no-fee calculation.
  // protocolFee is to be separated and sent to an external purse.
  // The swapper amounts are what will we paid and received.
  // xIncrement and yDecrement are what will be added and removed from the pools.
  //   Either xIncrement will be increased by the pool fee or yDecrement will be
  //   reduced by it in order to compensate the pool.
  // newX and newY are the new pool balances, for comparison with start values.
  // improvement is an estimate of how much the gains or losses were improved.
  const result = {
    protocolFee: fees.protocolFee,
    poolFee: fees.poolFee,
    swapperGives,
    swapperGets,
    xIncrement,
    yDecrement,
    newX: addOrSubtractFromPool(AmountMath.add, poolAllocation, xIncrement),
    newY: addOrSubtractFromPool(
      AmountMath.subtract,
      poolAllocation,
      yDecrement,
    ),
    improvement: maximum(fees.improvement, improvement),
  };

  return result;
};
