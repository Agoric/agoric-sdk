#!/usr/bin/env node

import {
  GOV1ADDR,
  CHAINID,
  agd,
  openVault,
  addUser,
  waitForBlock,
  provisionSmartWallet,
  ATOM_DENOM,
  pushPrices,
  registerOraclesForBrand,
  generateOracleMap,
} from '@agoric/synthetic-chain';
import { retryUntilCondition } from './sync-tools.js';
import { getPriceQuote } from './agd-tools.js';

export const scale6 = x => BigInt(x * 1_000_000);

const pushPriceRetryOpts = {
  maxRetries: 5, // arbitrary
  retryIntervalMs: 5000, // in ms
};

const oraclesByBrand = generateOracleMap('n-upgrade', ['ATOM']);
await registerOraclesForBrand('ATOM', oraclesByBrand);

const price = 15.2;
await pushPrices(price, 'ATOM', oraclesByBrand, 1);

await retryUntilCondition(
  () => getPriceQuote('ATOM'),
  res => res === `+${scale6(price).toString()}`,
  'price not pushed yet',
  {
    log: console.log,
    setTimeout: globalThis.setTimeout,
    ...pushPriceRetryOpts,
  },
);

export const bankSend = (from, addr, wanted) => {
  const chain = ['--chain-id', CHAINID];
  const fromArg = ['--from', from];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...fromArg, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', from, addr, wanted, ...noise);
};

const user = await addUser('long-living-vault');
console.log('USER', user);
await bankSend(GOV1ADDR, user, `80000000uist`);
console.log('IST sent');
await provisionSmartWallet(user, `20000000ubld,100000000${ATOM_DENOM}`);
console.log('Provision sent');
await waitForBlock(3);
console.log('Wait For Block done. Sending open vault offer');

const mint = '5.0';
const collateral = '10.0';
await openVault(user, mint, collateral);
