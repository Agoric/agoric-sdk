#!/usr/bin/env -S node --import ts-blank-space/register
/* global process */

import { SigningStargateClient } from '@cosmjs/stargate';

import { Fail, q } from '@endo/errors';

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';

import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';

import { loadConfig } from '../src/config.ts';
import { prepareAbortController } from '../src/support.ts';
import type { SimplePowers } from '../src/main.ts';
import { resolvePendingTx } from '../src/resolver.ts';
import { makeNowISO } from '../src/utils.ts';

const parseStatus = (statusArg: string): Omit<TxStatus, 'pending'> => {
  const normalized = statusArg.toLowerCase();
  switch (normalized) {
    case 'success':
      return TxStatus.SUCCESS;
    case 'fail':
      return TxStatus.FAILED;
    default:
      throw Fail`Invalid status: ${q(statusArg)}. Use "success" or "fail"`;
  }
};

export const resolveTx = async (
  txId: `tx${number}`,
  statusArg: string,
  reason?: string,
  {
    env = process.env,
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    // Default to the wall clock for debugging sent transactions.
    makeNonce = makeNowISO(Date.now),
    AbortController = globalThis.AbortController,
    AbortSignal = globalThis.AbortSignal,
  } = {},
) => {
  console.log(`\n🔧 Manually resolving transaction: ${txId}\n`);

  const status = parseStatus(statusArg);
  console.log(`📝 Setting status to: ${status}\n`);
  if (status === TxStatus.FAILED) {
    if (!reason) {
      throw Fail`Reason is required when marking a transaction as failed`;
    }
    console.log(`📋 Reason: ${reason}\n`);
  }

  const makeAbortController = prepareAbortController({
    setTimeout,
    AbortController,
    AbortSignal,
  });

  const simplePowers: SimplePowers = {
    fetch,
    setTimeout,
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)).then(() => {}),
    makeAbortController,
  };

  const config = await loadConfig(env);

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.agoricNetworkSpec },
    fetch,
  });

  const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );
  console.log('👛 Signer address:', signingSmartWalletKit.address);

  console.log(`\n🔄 Resolving transaction...\n`);

  await resolvePendingTx({
    signingSmartWalletKit,
    makeNonce,
    txId,
    status,
    ...(status === TxStatus.FAILED ? { rejectionReason: reason } : {}),
  });

  console.log(`\n✅ Transaction ${txId} resolved as ${status}!\n`);
};
harden(resolveTx);
