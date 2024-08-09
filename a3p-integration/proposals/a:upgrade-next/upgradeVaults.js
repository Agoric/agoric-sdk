#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  generateOracleMap,
  getPriceQuote,
  pushPrices,
  registerOraclesForBrand,
} from './agd-tools.js';
import { getDetailsMatchingVats } from './vatDetails.js';

const BRANDNAMES = ['ATOM', 'stATOM'];
const oraclesByBrand = generateOracleMap('u16', BRANDNAMES);

const atomOutPre = await getPriceQuote('ATOM');
assert.equal(atomOutPre, '+12010000');

console.log('UPGV: adding oracle for each brand');
await registerOraclesForBrand('ATOM', oraclesByBrand);
await registerOraclesForBrand('stATOM', oraclesByBrand);

console.log('UPGV: pushing new prices');
await pushPrices(11.2, 'ATOM', oraclesByBrand);
await pushPrices(11.4, 'stATOM', oraclesByBrand);

// price_feed and governor, old and new for two tokens
const priceFeedDetails = await getDetailsMatchingVats('price_feed');
assert.equal(Object.keys(priceFeedDetails).length, 8);

// Two old SPAs, and two new ones
const details = await getDetailsMatchingVats('scaledPriceAuthority');
assert.equal(Object.keys(details).length, 4, Object.keys(details));
console.log('UPGV 8 price feeds and 4 scaledPriceAuthorities found');

// We previously created price feeds for some tokens that aren't in A3P
const osmoDetails = await getDetailsMatchingVats('stOSMO');
assert.equal(Object.keys(osmoDetails).length, 0);
const tiaDetails = await getDetailsMatchingVats('stTIA');
assert.equal(Object.keys(tiaDetails).length, 0);
const stkAtomDetails = await getDetailsMatchingVats('stkATOM');
assert.equal(Object.keys(stkAtomDetails).length, 0);
