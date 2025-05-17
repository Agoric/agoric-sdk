import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { calculateDistributionPlan } from '../../src/vaultFactory/proceeds.js';
import { withAmountUtils } from '../supports.js';

/** @import {PriceAuthority, PriceDescription, PriceQuote, PriceQuoteValue, PriceQuery,} from '@agoric/zoe/tools/types.js'; */

const debt = withAmountUtils(makeIssuerKit('IST'));
const coll = withAmountUtils(makeIssuerKit('aEth'));

const test = unknownTest;

/**
 * @param {bigint} debtN
 * @param {bigint} collN
 * @param {bigint} currN
 * @returns {import('../../src/vaultFactory/proceeds.js').VaultBalances}
 */
const makeVaultBalance = (debtN, collN, currN = debtN) => {
  return {
    collateral: coll.make(collN),
    presaleDebt: debt.make(debtN),
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
    vaultsBalances: [makeVaultBalance(0n, 0n)],
    penaltyRate: makeRatio(10n, debt.brand, 100n),
  };
  const plan = calculateDistributionPlan(inputs);
  t.deepEqual(plan, {
    overage: debt.makeEmpty(),
    shortfallToReserve: debt.makeEmpty(),
    collateralForReserve: coll.makeEmpty(),
    collatRemaining: coll.makeEmpty(),
    actualCollateralSold: coll.makeEmpty(),
    collateralSold: totalCollateral,
    debtToBurn: totalDebt,
    mintedForReserve: debt.makeEmpty(),
    mintedProceeds: totalDebt,
    phantomDebt: debt.makeEmpty(),
    totalPenalty: coll.make(42n),
    transfersToVault: [],
    vaultsToReinstate: [],
  });
});
