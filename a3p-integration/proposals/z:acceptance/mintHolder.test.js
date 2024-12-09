/* eslint-env node */

import test from 'ava';
import { addUser, provisionSmartWallet } from '@agoric/synthetic-chain';
import { upgradeContract } from './test-lib/utils.js';
import {
  mintPayment,
  getAssetList,
  swap,
  getPSMChildren,
} from './test-lib/mint-holder.js';
import { networkConfig } from './test-lib/index.js';

test('mintHolder BLD contract is upgraded', async t => {
  const receiver = await addUser('receiver');
  await provisionSmartWallet(receiver, `20000000ubld`);

  const labelList = await getPSMChildren(fetch, networkConfig);
  const assetList = await getAssetList(labelList.slice(2));
  t.log(`labelList: `, labelList);
  t.log(`assetList: `, assetList);

  for (const asset of assetList) {
    const { label, denom, mintHolderVat } = asset;
    t.log(`testing ${label} mintHolder contract upgrade`);

    await upgradeContract(`upgrade-mintHolder-${label}`, mintHolderVat);
    await mintPayment(t, receiver, label, denom);
    await swap(t, receiver, label, denom, 5);
  }
});
