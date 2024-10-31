#!/usr/bin/env node

import {
  GOV1ADDR,
  CHAINID,
  agd,
  agopsInter,
  addUser,
  waitForBlock,
  provisionSmartWallet,
  ATOM_DENOM,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';

/**
 *
 * @param {string} addr
 * @param {string} wanted
 * @param {string | undefined} from
 */
export const bankSend = (addr, wanted, from = VALIDATORADDR) => {
  const chain = ['--chain-id', CHAINID];
  const fromArg = ['--from', from];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...fromArg, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', from, addr, wanted, ...noise);
};

const bidder = await addUser('long-living-bidder');
console.log('BIDDER', bidder);
await bankSend(bidder, `80000000uist`, GOV1ADDR);
console.log('IST sent');
await provisionSmartWallet(bidder, `20000000ubld,100000000${ATOM_DENOM}`);
console.log('Provision sent');
await waitForBlock(3);
console.log('Wait For Block done. Sending bid offer');
agopsInter(
  'bid',
  'by-price',
  `--price 49.0`,
  `--give 80IST`,
  '--from',
  bidder,
  '--keyring-backend test',
  `--offer-id long-living-bid-for-acceptance`,
);
