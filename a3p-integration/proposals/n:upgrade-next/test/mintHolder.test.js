/* eslint-env node */

import '@endo/init';
import test from 'ava';
import { addUser, provisionSmartWallet } from '@agoric/synthetic-chain';
import {
  mintPayment,
  getAssetList,
  swap,
  getPSMChildren,
} from '../test-lib/mintHolder-helpers.js';
import { networkConfig } from '../test-lib/index.js';

test('verify mintHolder contract upgrade', async t => {
  const receiver = await addUser('receiver');
  await provisionSmartWallet(receiver, `20000000ubld`);

  let assetList = await getAssetList();
  t.log('List of mintHolder vats being upgraded: ', assetList);
  // The FastLP mint is not in a mintHolder; it's a ZCFMint from the FastUSDC contract
  const assetListNoFastUSDC = assetList.filter(x => x.label !== 'FastLP');
  await mintPayment(t, receiver, assetListNoFastUSDC, 10);

  const psmLabelList = await getPSMChildren(fetch, networkConfig);
  assetList = await getAssetList(psmLabelList);
  t.log('List of assets being swapped with IST via PSM: ', assetList);
  await swap(t, receiver, assetList, 5);
});
