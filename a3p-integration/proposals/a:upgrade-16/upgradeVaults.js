#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  generateOracleMap,
  getPriceQuote,
  pushPrices,
  registerOraclesForBrand,
} from './agd-tools.js';

const BRANDNAMES = ['ATOM', 'stATOM', 'stTIA', 'stOSMO', 'stkATOM'];
const oraclesByBrand = generateOracleMap('u16', BRANDNAMES);

// There are no old prices for the other currencies.
const atomOutPre = await getPriceQuote('ATOM');
assert.equal(atomOutPre, '+12010000');

console.log('adding oracle for each brand');
await registerOraclesForBrand('ATOM', oraclesByBrand);
await registerOraclesForBrand('stATOM', oraclesByBrand);
await registerOraclesForBrand('stTIA', oraclesByBrand);
await registerOraclesForBrand('stOSMO', oraclesByBrand);
await registerOraclesForBrand('stkATOM', oraclesByBrand);

console.log('pushing new prices');
await pushPrices(11.2, 'ATOM', oraclesByBrand);
await pushPrices(11.3, 'stTIA', oraclesByBrand);
await pushPrices(11.4, 'stATOM', oraclesByBrand);
await pushPrices(11.5, 'stOSMO', oraclesByBrand);
await pushPrices(11.6, 'stkATOM', oraclesByBrand);
