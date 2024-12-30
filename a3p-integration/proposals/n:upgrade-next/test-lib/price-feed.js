/* eslint-env node */

import {
  agoric,
  getContractInfo,
  pushPrices,
  getPriceQuote,
} from '@agoric/synthetic-chain';
import { retryUntilCondition } from '@agoric/client-utils';

export const scale6 = x => BigInt(x * 1_000_000);

/**
 *
 * @param {number} price
 * @param {string} brand
 * @param {Map<any, any>} oraclesByBrand
 * @param {number} roundId
 * @returns {Promise<void>}
 */
export const verifyPushedPrice = async (
  price,
  brand,
  oraclesByBrand,
  roundId,
) => {
  const pushPriceRetryOpts = {
    maxRetries: 5, // arbitrary
    retryIntervalMs: 5000, // in ms
  };

  await pushPrices(price, brand, oraclesByBrand, roundId);
  console.log(`Pushing price ${price} for ${brand}`);

  await retryUntilCondition(
    () => getPriceQuote(brand),
    res => res === `+${scale6(price).toString()}`,
    'price not pushed yet',
    {
      log: console.log,
      setTimeout: global.setTimeout,
      ...pushPriceRetryOpts,
    },
  );
  console.log(`Price ${price} pushed for ${brand}`);
};

/**
 *
 * @param {string} brand
 * @returns {Promise<number>}
 */
export const getPriceFeedRoundId = async brand => {
  const latestRoundPath = `published.priceFeed.${brand}-USD_price_feed.latestRound`;
  const latestRound = await getContractInfo(latestRoundPath, {
    agoric,
    prefix: '',
  });

  console.log(latestRoundPath, latestRound);
  return Number(latestRound.roundId);
};

/**
 * Copy from https://github.com/Agoric/agoric-sdk/blob/745f2a82cc94e246f98dd1bd69cb679b608a7170/a3p-integration/proposals/p%3Aupgrade-19/test-lib/psm-lib.js#L277
 *
 * Checking IST balances can be tricky because of the execution fee mentioned in
 * https://github.com/Agoric/agoric-sdk/issues/6525. So we first check for
 * equality, but if that fails we recheck against an assumption that a fee of
 * the default "minFeeDebit" has been charged.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {number} actualBalance
 * @param {number} expectedBalance
 */
export const tryISTBalances = async (t, actualBalance, expectedBalance) => {
  const firstTry = await t.try(tt => {
    tt.is(actualBalance, expectedBalance);
  });
  if (firstTry.passed) {
    firstTry.commit();
    return;
  }

  firstTry.discard();
  t.log('tryISTBalances assuming no batched IST fee', ...firstTry.errors);
  // See golang/cosmos/x/swingset/types/default-params.go
  // and `ChargeBeans` in golang/cosmos/x/swingset/keeper/keeper.go.
  const minFeeDebit = 200_000;
  t.is(actualBalance + minFeeDebit, expectedBalance);
};
