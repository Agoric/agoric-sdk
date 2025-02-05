/* eslint-env node */
/**
 * @file The goal of this file is to make sure all the PSM contacts were
 * upgraded. Each set of vats are different per chain, but for mainnet, we
 * expect this to be: V37-V42, V73, V76
 *
 * The test scenario is as follows;
 * 1. Verify metrics before the upgrade
 * 2. Verify trading is possible after the upgrade
 */

import '@endo/init';
import test from 'ava';
import { evalBundles } from '@agoric/synthetic-chain';
import { makeVstorageKit } from '@agoric/client-utils';

const SWAP_ANCHOR = 'swapAnchorForMintedSeat';

test.before(async t => {
  const vstorageKit = await makeVstorageKit(
    { fetch },
    { rpcAddrs: ['http://localhost:26657'], chainName: 'agoriclocal' },
  );

  t.context = {
    vstorageKit,
  };
});

test.serial('check stats pre-swap', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  const metrics = await vstorageKit.readLatestHead(
    'published.psm.IST.USDC.metrics',
  );

  t.is(metrics.anchorPoolBalance.value, 0n, 'anchorPool empty');
  t.is(metrics.feePoolBalance.value, 0n, 'feePool empty');
  t.is(metrics.mintedPoolBalance.value, 0n, 'mintedPool 500K');
  t.is(metrics.totalAnchorProvided.value, 0n, 'totalAnchor empty');
  t.is(metrics.totalMintedProvided.value, 0n, 'totalMinted 500K');
});

test.serial('verify trading after upgrade', async t => {
  // @ts-expect-error casting
  const { vstorageKit } = t.context;

  await evalBundles(SWAP_ANCHOR);

  const metrics = await vstorageKit.readLatestHead(
    'published.psm.IST.USDC.metrics',
  );

  t.is(metrics.anchorPoolBalance.value, 500_000n, 'AnchorPool +500K');
  t.is(metrics.feePoolBalance.value, 0n, 'feePool empty');
  t.is(metrics.mintedPoolBalance.value, 500_000n, 'mintedPool +500K');
  t.is(metrics.totalAnchorProvided.value, 0n, 'totalAnchor empty');
  t.is(metrics.totalMintedProvided.value, 500_000n, 'totalMinted +500K');
});
