#!/usr/bin/env node
/* eslint-env node */

import '@endo/init/debug.js';

import {
  generateOracleMap,
  getPriceQuote,
  pushPrices,
  registerOraclesForBrand,
} from '@agoric/synthetic-chain';
import { argv } from 'node:process';

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
export const pushPriceAndVerify = async (
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

const brand = argv[2];
const price = Number(argv[3]);

const BASE_ID = 'n-upgrade';
const ROUND_ID = 1;

const oraclesByBrand = generateOracleMap(BASE_ID, [brand]);
await registerOraclesForBrand(brand, oraclesByBrand);
console.log(`Registering Oracle for ${brand}`);

await pushPriceAndVerify(price, brand, oraclesByBrand, ROUND_ID);
console.log(`Price pushed for ${brand}`);
