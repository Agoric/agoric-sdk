/* eslint-env node */
// @ts-check

/**
 * @file The goal of this file is to test the new feeDistributor replacing the old one.
 * For a test scenario break down, see https://github.com/Agoric/agoric-sdk/issues/10393#issuecomment-2462481737.
 *
 * As an improvement to test design explained above, we want to eliminate a scenario like this;
 * - calling stop() on the old feeDistributor somehow does not prevent it from collecting fees
 * - right after we produce a fee, the old feeDistributor's collection interval waker gets triggered
 * - increase in the reserve's allocation is coming from the old feeDistributor
 *
 * Since we know the new feeDistributor's collection interval is much shorter than the old one,
 * seeing consistent increases of the reserve's fee allocations makes sure the fees are coming from the newInstance.
 * So we open multiple vaults (see config.vaultCount) and observe reserve's allocations increase in an interval
 * that matches the new feeDistributor's collectionInterval.
 */

import '@endo/init/debug.js';
import test from 'ava';
import { retryUntilCondition, makeVstorageKit } from '@agoric/client-utils';
import {
  ATOM_DENOM,
  bankSend,
  openVault,
  USER1ADDR,
} from '@agoric/synthetic-chain';
import { AmountMath } from '@agoric/ertp';
import { floorMultiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';

// TODO @import {Ratio} from '@agoric/zoe'
/** @typedef {any} Ratio */

/**
 * @typedef {import('@agoric/client-utils').VstorageKit} VstorageKit
 * @typedef {import('@agoric/ertp').NatAmount} NatAmount
 * @typedef {{
 *   allocations: { Fee: NatAmount}
 *  }} ReserveAllocations
 * @typedef {{
 *   current: {
 *     MintFee: { value: Ratio }
 *   }
 * }} ManagerMetricsMintFee
 */

const config = {
  mintValue: '100.0',
  collateralValue: '200.0',
  managerIndex: 0,
  vaultOwner: {
    address: USER1ADDR,
    initialCollateralValue: `2000000000${ATOM_DENOM}`,
  },
  vaultCount: 3,
  retryOptions: {
    maxRetries: 5,
    retryIntervalMs: 10000, // 10 seconds
  },
  networkConfig: {
    rpcAddrs: ['http://0.0.0.0:26657'],
    chainName: 'agoriclocal',
  },
  collectionInterval: 30000, // 30 seconds
};

const scale6 = mintValue => BigInt(parseInt(mintValue, 10) * 1_000_000);

/**
 * @param {VstorageKit} vstorage
 * @param {NatAmount} feeAmount
 */
const produceFeesAndWait = async (vstorage, feeAmount) => {
  const {
    mintValue,
    collateralValue,
    vaultOwner: { address },
  } = config;
  const metricsBefore = /** @type {ReserveAllocations} */ (
    await vstorage.readLatestHead('published.reserve.metrics')
  );

  // XXX Probably better to not rely on synthetic-chain for opening a vault as per https://github.com/Agoric/agoric-sdk/pull/10396.
  // But to make the switch also requires either copying z:acceptance/test-lib here (which is not wanted) or creating a root level
  // lib and link it here which requires an all around work across all proposals. Probably a better idea to do it as a separate work.
  // I am leaning towards second option so leaving a note here to change this to something similar like
  // https://github.com/Agoric/agoric-sdk/blob/3b799b8302ba75327a825515c82d954a1f78103c/a3p-integration/proposals/z%3Aacceptance/vaults.test.js#L40-L69
  await openVault(address, mintValue, collateralValue);

  await retryUntilCondition(
    () => vstorage.readLatestHead('published.reserve.metrics'),
    metrics =>
      AmountMath.isGTE(
        // @ts-expect-error metrics has these fields.
        metrics.allocations.Fee,
        AmountMath.add(metricsBefore.allocations.Fee, feeAmount),
      ),
    `At least ${feeAmount.value} amount of fee not received`,
    { log: console.log, setTimeout, ...config.retryOptions },
  );
};

/**
 * @param {number} iteration
 */
function* asyncGenerator(iteration) {
  let i = 0;
  while (i < iteration) {
    i += 1;
    yield i;
  }
}

/**
 * @param {number} managerIndex
 * @param {VstorageKit} vstorage
 * @param {bigint} mintValue
 * @param {(value: bigint, keyword: string) => NatAmount} toAmount
 */
const calculateFee = async (managerIndex, vstorage, mintValue, toAmount) => {
  const path = `published.vaultFactory.managers.manager${managerIndex}.governance`;

  const {
    current: {
      MintFee: { value: feeRatio },
    },
  } = /** @type {ManagerMetricsMintFee} */ (
    await vstorage.readLatestHead(path)
  );
  const feeAmount = floorMultiplyBy(toAmount(mintValue, 'IST'), feeRatio);
  return feeAmount;
};

test.before(async t => {
  await bankSend(
    config.vaultOwner.address,
    config.vaultOwner.initialCollateralValue,
  );
  const vstorage = await makeVstorageKit({ fetch }, config.networkConfig);
  const toAmount = (value, brandKeyword) =>
    AmountMath.make(vstorage.agoricNames.brand[brandKeyword], value);

  t.context = {
    vstorage,
    toAmount,
  };
});

test('test feeDistributor', async t => {
  // @ts-expect-error type
  const { vstorage, toAmount } = t.context;
  const { vaultCount } = config;

  const feeAmount = await calculateFee(
    config.managerIndex,
    vstorage,
    scale6(config.mintValue),
    toAmount,
  );

  for await (const i of asyncGenerator(vaultCount)) {
    console.log('----- Starting sequence -----', i);
    await produceFeesAndWait(vstorage, feeAmount);
  }
  t.pass();
});
