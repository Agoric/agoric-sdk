// @ts-check

import test from 'ava';

import {
  evalBundles,
  getIncarnation,
  waitForBlock,
} from '@agoric/synthetic-chain';

import { bankSend, getProvisionPoolMetrics } from './agd-tools.js';

const NULL_UPGRADE_BANK_DIR = 'upgrade-bank';
const UPGRADE_PP_DIR = 'upgrade-provisionPool';
const ADD_LEMONS_DIR = 'add-LEMONS';
const ADD_OLIVES_DIR = 'add-OLIVES';

const USDC_DENOM =
  'ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F';
const PROVISIONING_POOL_ADDR = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

/**
 * @file
 * The problems to be addressed are that provisionPool won't correctly handle
 * (#8722) deposit of assets after it (provisionPool) is upgraded, or (#8724)
 * new asset kinds after vat-bank is upgraded.
 *
 * To test this, we will
 *
 * 1. See that we can add USDC.
 *
 * 2. Null upgrade vat-bank, and see that we can add a new collateal.
 *
 * 2a. if we had been able to null-upgrade provisionPool at this point, we
 * wouldn't have been able to productively add USDC, but the null upgrade fails.
 *
 * 3. Do a full upgrade of provisionPool; then deposit USDC, and see IST
 * incremented in totalMintedConverted.
 *
 * 4. Null upgrade vat-bank again, and then see (in logs) that adding a new
 * asset type gives the ability to make deposits.
 */

const contributeToPool = async (t, asset, expectedToGrow) => {
  const metricsBefore = await getProvisionPoolMetrics();
  console.log('PPT pre', metricsBefore);

  await bankSend(PROVISIONING_POOL_ADDR, asset);

  const metricsAfter = await getProvisionPoolMetrics();
  console.log('PPT post', metricsAfter);
  t.is(
    metricsAfter.totalMintedConverted.brand,
    metricsBefore.totalMintedConverted.brand,
    'brands match',
  );
  if (expectedToGrow) {
    // I couldn't import AmountMath. dunno why.
    t.true(
      metricsAfter.totalMintedConverted.value >
        metricsBefore.totalMintedConverted.value,
      'brands match',
    );
  } else {
    t.equal(
      metricsAfter.totalMintedConverted.value,
      metricsBefore.totalMintedConverted.value,
    );
  }
};

test.serial('add assets before', async t => {
  await contributeToPool(t, `10000${USDC_DENOM}`, true);
});

test.serial(`upgrade Bank`, async t => {
  await evalBundles(NULL_UPGRADE_BANK_DIR);

  const incarnation = await getIncarnation('bank');
  t.is(incarnation, 1);

  await evalBundles(ADD_STARS_DIR);
});

test.serial('full upgrade ProvisionPool', async t => {
  await evalBundles(UPGRADE_PP_DIR);
  const ppIncarnation = await getIncarnation('db93f-provisionPool');
  t.is(ppIncarnation, 1);

  await contributeToPool(t, `30000${USDC_DENOM}`, true);
});

test.serial(`Add assets after bank upgrade`, async t => {
  await evalBundles(NULL_UPGRADE_BANK_DIR);
  await waitForBlock(2);

  const incarnation = await getIncarnation('bank');
  t.is(incarnation, 2);

  await evalBundles(ADD_STARS2_DIR);
});
