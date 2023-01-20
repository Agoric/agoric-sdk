import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { AmountMath } from '@agoric/ertp';
import { BASIS_POINTS } from './constantProduct/defaults.js';

/**
 * @file support the UI in calculating how much to offer, taking slippage
 * into account, and not requiring a round trip to the chain.
 */

/** @typedef {{ centralAmount: Amount<'nat'>, secondaryAmount: Amount<'nat'> }} Pool */

const { ceilDivide, floorDivide } = natSafeMath;

/**
 * @param {bigint} chargeBP
 * @param {Amount<'nat'>} amount
 */
export const charge = (chargeBP, amount) => {
  return AmountMath.make(
    amount.brand,
    ceilDivide(amount.value * chargeBP, BASIS_POINTS),
  );
};

/**
 * @param {bigint} chargeBP
 * @param {Amount<'nat'>} amount
 */
export const chargeFloor = (chargeBP, amount) => {
  return AmountMath.make(
    amount.brand,
    floorDivide(amount.value * chargeBP, BASIS_POINTS),
  );
};

const makeEstimator = (centralBrand, rates) => {
  const { poolFeeBP, protocolFeeBP, slippageBP } = rates;

  /**
   * Proceeds less slippage when specifying the amount to add to a single pool
   *
   * @param {Amount<'nat'>} amountIn
   * @param {Brand<'nat'>} brandOut
   * @param {MapStore<Brand, Pool>} pools
   */
  function estimateSinglePoolProceeds(amountIn, brandOut, pools) {
    const isCentralIn = amountIn.brand === centralBrand;
    const pool = isCentralIn ? pools.get(brandOut) : pools.get(amountIn.brand);
    const kPre = pool.secondaryAmount.value * pool.centralAmount.value;

    function calcYFromX(X) {
      const denom = isCentralIn
        ? AmountMath.add(pool.centralAmount, X)
        : AmountMath.add(pool.secondaryAmount, X);
      const finalOutBalance = AmountMath.make(
        brandOut,
        ceilDivide(kPre, denom.value),
      );

      return isCentralIn
        ? AmountMath.subtract(pool.secondaryAmount, finalOutBalance)
        : AmountMath.subtract(pool.centralAmount, finalOutBalance);
    }

    const amountAdded = isCentralIn
      ? AmountMath.subtract(amountIn, charge(protocolFeeBP, amountIn))
      : amountIn;
    const amountOutForFees = calcYFromX(amountIn);
    const amountOut = calcYFromX(amountAdded);
    const amountRemoved = AmountMath.subtract(
      amountOut,
      charge(poolFeeBP, amountOutForFees),
    );
    const amountReturned = isCentralIn
      ? amountRemoved
      : AmountMath.subtract(
          amountRemoved,
          charge(protocolFeeBP, amountOutForFees),
        );

    return amountReturned;
  }

  /**
   * Payment w/slippage when specifying the amount to receive from a single pool
   *
   * @param {Brand<'nat'>} brandIn
   * @param {Amount<'nat'>} amountOut
   * @param {MapStore<Brand, Pool>} pools
   */
  function estimateSinglePoolRequired(brandIn, amountOut, pools) {
    const isCentralIn = brandIn === centralBrand;
    const pool = isCentralIn ? pools.get(amountOut.brand) : pools.get(brandIn);
    const kPre = pool.secondaryAmount.value * pool.centralAmount.value;
    const amountWithdrawn = isCentralIn
      ? AmountMath.add(amountOut, charge(protocolFeeBP, amountOut))
      : amountOut;

    const calcXFromY = y => {
      const denom = isCentralIn
        ? AmountMath.subtract(pool.secondaryAmount, y)
        : AmountMath.subtract(pool.centralAmount, y);
      const finalInBalance = AmountMath.make(
        brandIn,
        ceilDivide(kPre, denom.value),
      );
      return isCentralIn
        ? AmountMath.subtract(finalInBalance, pool.centralAmount)
        : AmountMath.subtract(finalInBalance, pool.secondaryAmount);
    };

    const amountInForFees = calcXFromY(amountOut);
    const amountIn = calcXFromY(amountWithdrawn);
    const amountAddToPool = AmountMath.add(
      amountIn,
      charge(poolFeeBP, amountInForFees),
    );
    const amountToBePaid = isCentralIn
      ? amountAddToPool
      : AmountMath.add(
          amountAddToPool,
          chargeFloor(protocolFeeBP, amountInForFees),
        );

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
    return AmountMath.subtract(proceeds, charge(slippageBP, proceeds));
  };

  const estimateRequired = (brandIn, amountOut, pools) => {
    let required;
    if (brandIn === centralBrand || amountOut.brand === centralBrand) {
      required = estimateSinglePoolRequired(brandIn, amountOut, pools);
    } else {
      required = estimateDoublePoolRequired(brandIn, amountOut, pools);
    }

    return AmountMath.add(required, charge(slippageBP, required));
  };

  return { estimateProceeds, estimateRequired };
};
harden(makeEstimator);

export { makeEstimator };
