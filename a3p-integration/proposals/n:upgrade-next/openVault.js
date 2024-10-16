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
} from '@agoric/synthetic-chain';

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
