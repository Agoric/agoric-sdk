// @ts-check

import { amountMath } from '@agoric/ertp';
import { assert, details as X } from '@agoric/assert';

import {
  getInputPrice,
  getOutputPrice,
  natSafeMath,
  makeRatio,
  multiplyBy,
} from '../../../src/contractSupport';

const { multiply, subtract } = natSafeMath;
const BASIS_POINTS = 10000;
const PERCENT_BASE = 100;

export function makeSimpleFeePool(initX, initY, fee = 0n) {
  let x = initX;
  let y = initY;
  const trades = [];
  function logTrade(deltaX, deltaY, increaseX) {
    trades.push({
      deltaX: increaseX ? deltaX.value : -deltaX.value,
      deltaY: increaseX ? -deltaY.value : deltaY.value,
      x: x.value,
      y: y.value,
      k: multiply(x.value, y.value),
    });
  }

  function tradeIn(changeAmount) {
    if (changeAmount.brand === x.brand) {
      const deltaY = amountMath.make(
        y.brand,
        getInputPrice(changeAmount.value, x.value, y.value, fee),
      );
      x = amountMath.add(x, changeAmount);
      y = amountMath.subtract(y, deltaY);
      logTrade(changeAmount, deltaY, true);
      return deltaY;
    } else {
      const deltaX = amountMath.make(
        x.brand,
        getInputPrice(changeAmount.value, y.value, x.value, fee),
      );
      x = amountMath.subtract(x, deltaX);
      y = amountMath.add(y, changeAmount);
      logTrade(deltaX, changeAmount, false);
      return deltaX;
    }
  }

  function tradeOut(changeAmount) {
    if (changeAmount.brand === x.brand) {
      const deltaY = amountMath.make(
        y.brand,
        getOutputPrice(changeAmount.value, y.value, x.value, fee),
      );
      x = amountMath.subtract(x, changeAmount);
      y = amountMath.add(y, deltaY);
      logTrade(changeAmount, deltaY, false);
      return deltaY;
    } else {
      const deltaX = amountMath.make(
        x.brand,
        getOutputPrice(changeAmount.value, x.value, y.value, fee),
      );
      x = amountMath.add(x, deltaX);
      y = amountMath.subtract(y, changeAmount);
      logTrade(deltaX, changeAmount, true);
      return deltaX;
    }
  }

  return {
    tradeIn,
    tradeOut,
    getTrades: () => trades,
  };
}

// The pool gets fee - shareBP, and the protocol gets shareBP
export function makePoolChargeFeeInX(initX, initY, fee = 0n, shareBP) {
  assert(shareBP < fee, X`shareBP ${shareBP} must be smaller than fee ${fee}`);
  let x = initX;
  let y = initY;
  let protocolPool = amountMath.makeEmpty(initX.brand);
  const protocolShare = makeRatio(shareBP, x.brand, BASIS_POINTS);

  const trades = [];
  function logTrade(deltaX, deltaY, pay, get, protocolFee, increaseX) {
    protocolPool = amountMath.add(protocolFee, protocolPool);
    trades.push({
      deltaX: increaseX ? deltaX.value : -deltaX.value,
      deltaY: increaseX ? -deltaY.value : deltaY.value,
      x: x.value,
      y: y.value,
      k: multiply(x.value, y.value),
      pay: increaseX ? -pay.value : pay.value,
      get: increaseX ? get.value : -get.value,
      protocol: protocolPool.value,
    });
  }

  function tradeIn(changeAmount) {
    if (changeAmount.brand === x.brand) {
      const protocolFee = multiplyBy(changeAmount, protocolShare);
      const poolChange = amountMath.subtract(changeAmount, protocolFee);
      // poolChange reduced by protocol Fee. deltaY includes remainder of Fee
      const deltaY = amountMath.make(
        y.brand,
        getInputPrice(poolChange.value, x.value, y.value, fee),
      );
      x = amountMath.add(x, poolChange);
      y = amountMath.subtract(y, deltaY);
      // trader pays changeAmount, gains deltaY. Pool pays deltaY, gains
      // changeAmount - protocol fee
      logTrade(poolChange, deltaY, changeAmount, deltaY, protocolFee, true);
      return deltaY;
    } else {
      const deltaX = amountMath.make(
        x.brand,
        getInputPrice(changeAmount.value, y.value, x.value, fee),
      );
      const protocolFee = multiplyBy(deltaX, protocolShare);

      // deltaX was reduced by the total fee. trader pays changeAmount to the pool
      // trader gets deltaX, pool pays out deltaX + protocolFee
      const poolChange = amountMath.add(deltaX, protocolFee);
      x = amountMath.subtract(x, poolChange);
      y = amountMath.add(y, changeAmount);
      logTrade(
        poolChange,
        changeAmount,
        deltaX,
        changeAmount,
        protocolFee,
        false,
      );
      return deltaX;
    }
  }

  function tradeOut(changeAmount) {
    if (changeAmount.brand === x.brand) {
      const protocolFee = multiplyBy(changeAmount, protocolShare);
      // trader gets changeAmount, pays deltaY. pool gains deltaY, pays
      // changeAmount plus the protocolFee
      const deltaY = amountMath.make(
        y.brand,
        getOutputPrice(changeAmount.value, y.value, x.value, fee),
      );
      const poolChange = amountMath.add(changeAmount, protocolFee);
      x = amountMath.subtract(x, poolChange);
      y = amountMath.add(y, deltaY);
      logTrade(poolChange, deltaY, changeAmount, deltaY, protocolFee, false);
      return deltaY;
    } else {
      const deltaX = amountMath.make(
        x.brand,
        getOutputPrice(changeAmount.value, x.value, y.value, fee),
      );
      const protocolFee = multiplyBy(deltaX, protocolShare);
      // trader gains changeAmount, pays deltaX. Pool pays changeAmount, gains
      // deltaX - protocolFee
      const poolChange = amountMath.subtract(deltaX, protocolFee);
      x = amountMath.add(x, poolChange);
      y = amountMath.subtract(y, changeAmount);
      logTrade(deltaX, changeAmount, deltaX, changeAmount, protocolFee, true);
      return deltaX;
    }
  }

  return {
    tradeIn,
    tradeOut,
    getTrades: () => trades,
  };
}
