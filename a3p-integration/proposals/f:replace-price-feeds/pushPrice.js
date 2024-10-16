#!/usr/bin/env node

import {
  pushPrices,
  registerOraclesForBrand,
  generateOracleMap,
  getPriceQuote,
} from '@agoric/synthetic-chain';
import { argv } from 'node:process';
import { retryUntilCondition } from './sync-tools.js';

const brand = argv[2];
const price = argv[3];

const BASE_ID = 'f-priceFeeds';
const ROUND_ID = 1;

const pushPriceRetryOpts = {
  maxRetries: 5, // arbitrary
  retryIntervalMs: 5000, // in ms
};

export const scale6 = x => BigInt(x * 1_000_000);

const oraclesByBrand = generateOracleMap(BASE_ID, [brand]);
await registerOraclesForBrand(brand, oraclesByBrand);
console.log(`Registering Oracle for ${brand}`);

await pushPrices(price, brand, oraclesByBrand, ROUND_ID);
console.log(`Pushing price ${price} for ${brand}`);

await retryUntilCondition(
  () => getPriceQuote(brand),
  res => res === `+${scale6(price).toString()}`,
  'price not pushed yet',
  {
    log: console.log,
    setTimeout: globalThis.setTimeout,
    ...pushPriceRetryOpts,
  },
);
console.log('Price pushed');
