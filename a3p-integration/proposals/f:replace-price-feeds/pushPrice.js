#!/usr/bin/env node

import {
  pushPrices,
  registerOraclesForBrand,
  generateOracleMap,
  getPriceQuote,
} from '@agoric/synthetic-chain';
import { retryUntilCondition } from './sync-tools.js';

const BRANDS = ['ATOM', 'stATOM'];
const PRICES = [12.01, 12.01];

const BASE_ID = 'f-priceFeeds';
const ROUND_ID = 1;

const pushPriceRetryOpts = {
  maxRetries: 5, // arbitrary
  retryIntervalMs: 5000, // in ms
};

export const scale6 = x => BigInt(x * 1_000_000);

const oraclesByBrand = generateOracleMap(BASE_ID, BRANDS);

for (let i = 0; i < BRANDS.length; i++) {
  await registerOraclesForBrand(BRANDS[i], oraclesByBrand);
  console.log(`Registering Oracle for ${BRANDS[i]}`);

  await pushPrices(PRICES[i], BRANDS[i], oraclesByBrand, ROUND_ID);
  console.log(`Pushing price ${PRICES[i]} for ${BRANDS[i]}`);

  await retryUntilCondition(
    () => getPriceQuote(BRANDS[i]),
    res => res === `+${scale6(PRICES[i]).toString()}`,
    'price not pushed yet',
    {
      log: console.log,
      setTimeout: globalThis.setTimeout,
      ...pushPriceRetryOpts,
    },
  );
  console.log('Price pushed');
}
