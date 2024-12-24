#!/usr/bin/env node

import '@endo/init/debug.js';
import {
  registerOraclesForBrand,
  generateOracleMap,
} from '@agoric/synthetic-chain';
import { argv } from 'node:process';
import { verifyPushedPrice } from './test-lib/price-feed.js';

const brand = argv[2];
const price = Number(argv[3]);

const BASE_ID = 'n-upgrade';
const ROUND_ID = 1;

const oraclesByBrand = generateOracleMap(BASE_ID, [brand]);
await registerOraclesForBrand(brand, oraclesByBrand);
console.log(`Registering Oracle for ${brand}`);

await verifyPushedPrice(price, brand, oraclesByBrand, ROUND_ID);
console.log(`Price pushed for ${brand}`);
