import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { calculateDistributionPlan } from '../../src/vaultFactory/proceeds.js';
import { withAmountUtils } from '../supports.js';

const debt = withAmountUtils(makeIssuerKit('IST'));
const coll = withAmountUtils(makeIssuerKit('aEth'));

const test = unknownTest;

/**
 * @param {bigint} debtN
 * @param {bigint} collN
 * @param {bigint} currN
 * @returns {any}
 */
const makeVaultBalances = (debtN, collN, currN = debtN) => {
  return {
    debtAmount: debt.make(debtN),
    collateralAmount: coll.make(collN),
    currentDebt: debt.make(currN),
  };
};

test('price drop', async t => {
  const totalDebt = debt.make(1680n);
  const totalCollateral = coll.make(400n);
  const price = /** @type {PriceDescription} */ ({
    amountIn: coll.make(1000000n),
    amountOut: debt.make(4000000n),
  });
  const inputs = {
    proceeds: {
      Minted: totalDebt,
      Collateral: coll.makeEmpty(),
    },
    totalDebt,
    totalCollateral,
    oraclePriceAtStart: price,
    collateralInLiqSeat: coll.makeEmpty(),
    bestToWorst: [makeVaultBalances(0n, 0n)],
    penaltyRate: makeRatio(10n, debt.brand, 100n),
  };
  const plan = calculateDistributionPlan(
    inputs.proceeds,
    inputs.totalDebt,
    inputs.totalCollateral,
    inputs.oraclePriceAtStart,
    inputs.bestToWorst,
    inputs.penaltyRate,
  );
  t.deepEqual(plan, {
    accounting: {
      overage: debt.makeEmpty(),
      toBurn: debt.make(1680n),
      shortfall: debt.makeEmpty(),
    },
    collateralForReserve: coll.makeEmpty(),
    collatRemaining: coll.makeEmpty(),
    actualCollateralSold: coll.makeEmpty(),
    collateralSold: totalCollateral,
    debtToBurn: totalDebt,
    liquidationsAborted: 0,
    liquidationsCompleted: 1,
    mintedForReserve: debt.makeEmpty(),
    mintedProceeds: totalDebt,
    phantomInterest: debt.makeEmpty(),
    totalPenalty: coll.make(42n),
    transfersToVault: [],
    vaultsToReinstate: [],
  });
});
