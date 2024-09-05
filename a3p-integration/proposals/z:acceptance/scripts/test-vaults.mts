#!/usr/bin/env tsx
/* eslint-disable @jessie.js/safe-await-separator */

import {
  agoric,
  GOV1ADDR,
  GOV2ADDR,
  newOfferId,
} from '@agoric/synthetic-chain';
import assert from 'node:assert/strict';
import {
  implementNewAuctionParams,
  ISTunit,
  provisionWallet,
  setDebtLimit,
} from '../lib/vaults.mjs';

const START_FREQUENCY = 600; // StartFrequency: 600s (auction runs every 10m)
const CLOCK_STEP = 20; // ClockStep: 20s (ensures auction completes in time)
const PRICE_LOCK_PERIOD = 300;
const oraclesAddresses = [GOV1ADDR, GOV2ADDR];

const oracles = [] as { address: string; id: string }[];
for (const oracle of oraclesAddresses) {
  const offerId = await newOfferId();
  oracles.push({ address: oracle, id: offerId });
}

console.log('Ensure user2 provisioned');
await provisionWallet('user2');

console.log('Ensure auction params have changed');
await implementNewAuctionParams(
  GOV1ADDR,
  oracles,
  START_FREQUENCY,
  CLOCK_STEP,
  PRICE_LOCK_PERIOD,
);

const govParams = await agoric.follow('-lF', ':published.auction.governance');
assert.equal(govParams.current.ClockStep.value.relValue, CLOCK_STEP.toString());
assert.equal(
  govParams.current.StartFrequency.value.relValue,
  START_FREQUENCY.toString(),
);

console.log('Ensure debt ceiling changes');
const limit = 45_000_000n;
await setDebtLimit(GOV1ADDR, limit);
const params = await agoric.follow(
  '-lF',
  ':published.vaultFactory.managers.manager0.governance',
);
assert.equal(params.current.DebtLimit.value.value, String(limit * ISTunit));
