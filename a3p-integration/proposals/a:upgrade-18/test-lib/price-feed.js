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
