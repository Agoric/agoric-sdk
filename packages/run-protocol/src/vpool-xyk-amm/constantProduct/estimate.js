// @ts-check

import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { BASIS_POINTS } from './defaults';

const { floorDivide, ceilDivide } = natSafeMath;

const reduceByValue = (chargeBP, brand, value) => {
  const dividend = floorDivide(value * (BASIS_POINTS - chargeBP), BASIS_POINTS);
  return AmountMath.make(brand, dividend);
};

const growByValue = (chargeBP, brand, value) => {
  const dividend = ceilDivide(value * (BASIS_POINTS + chargeBP), BASIS_POINTS);
  return AmountMath.make(brand, dividend);
};

const reduceBy = (chargeBP, amount) => {
  return reduceByValue(chargeBP, amount.brand, amount.value);
};

const growBy = (chargeBP, amount) => {
  return growByValue(chargeBP, amount.brand, amount.value);
};

const makeEstimator = (centralBrand, poolFeeBP, protocolFeeBP, slippageBP) => {
  // Proceeds less slippage when specifying the amount to add to a single pool
  function estimateSinglePoolProceeds(amountIn, brandOut, pools) {
    const isCentralIn = amountIn.brand === centralBrand;
    const pool = isCentralIn ? pools.get(brandOut) : pools.get(amountIn.brand);
    const kPre =
      pool.getSecondaryAmount().value * pool.getCentralAmount().value;
    const amountAdded = isCentralIn
      ? reduceBy(protocolFeeBP, amountIn)
      : amountIn;
    const denom = isCentralIn
      ? AmountMath.add(pool.getCentralAmount(), amountAdded)
      : AmountMath.add(pool.getSecondaryAmount(), amountAdded);
    const valueOut = floorDivide(kPre, denom.value);
    const amountRemoved = reduceByValue(poolFeeBP, denom.brand, valueOut);
    const amountReturned = isCentralIn
      ? amountRemoved
      : reduceBy(protocolFeeBP, amountRemoved);

    return amountReturned;
  }

  // Payment w/slippage when specifying the amount to receive from a single pool
  function estimateSinglePoolRequired(brandIn, amountOut, pools) {
    const isCentralIn = brandIn === centralBrand;
    const pool = isCentralIn ? pools.get(amountOut.brand) : pools.get(brandIn);
    const kPre =
      pool.getSecondaryAmount().value * pool.getCentralAmount().value;
    const amountWithdrawn = isCentralIn
      ? amountOut
      : growBy(protocolFeeBP, amountOut);
    const denom = isCentralIn
      ? AmountMath.subtract(pool.getSecondaryAmount(), amountWithdrawn)
      : AmountMath.subtract(pool.getCentralAmount(), amountWithdrawn);
    const valueOut = floorDivide(kPre, denom.value);
    const amountAddToPool = growByValue(poolFeeBP, denom.brand, valueOut);
    const amountToBePaid = isCentralIn
      ? amountAddToPool
      : growBy(protocolFeeBP, amountAddToPool);

    return amountToBePaid;
  }

  // ignores price improvement
  function estimateDoublePoolProceeds(amountIn, brandOut, pools) {
    const inProceeds = estimateSinglePoolProceeds(
      amountIn,
      centralBrand,
      pools,
    );
    const outProceeds = estimateSinglePoolProceeds(inProceeds, brandOut, pools);
    return outProceeds;
  }

  // ignores price improvement
  function estimateDoublePoolRequired(brandIn, amountOut, pools) {
    const outRequired = estimateSinglePoolRequired(
      centralBrand,
      amountOut,
      pools,
    );
    const inRequired = estimateSinglePoolRequired(brandIn, outRequired, pools);
    return inRequired;
  }

  const estimateProceeds = (amountIn, brandOut, pools) => {
    let proceeds;
    if (amountIn.brand === centralBrand || brandOut === centralBrand) {
      proceeds = estimateSinglePoolProceeds(amountIn, brandOut, pools);
    } else {
      proceeds = estimateDoublePoolProceeds(amountIn, brandOut, pools);
    }
    return reduceBy(proceeds, slippageBP);
  };

  const estimateRequired = (brandIn, amountOut, pools) => {
    let required;
    if (brandIn === centralBrand || amountOut.brand === centralBrand) {
      required = estimateSinglePoolRequired(brandIn, amountOut, pools);
    } else {
      required = estimateDoublePoolRequired(brandIn, amountOut, pools);
    }

    return growBy(slippageBP, required);
  };

  return { estimateProceeds, estimateRequired };
};
harden(makeEstimator);

export { makeEstimator };
