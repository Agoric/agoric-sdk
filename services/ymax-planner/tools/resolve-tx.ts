/* eslint-env node */

import timersPromises from 'node:timers/promises';

import { SigningStargateClient } from '@cosmjs/stargate';
import * as ws from 'ws';

import { Fail, q } from '@endo/errors';

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';

import { TxStatus } from '@aglocal/portfolio-contract/src/resolver/constants.js';

import { loadConfig } from '../src/config.ts';
import { CosmosRPCClient } from '../src/cosmos-rpc.ts';
import { prepareAbortController } from '../src/support.ts';
import type { SimplePowers } from '../src/main.ts';
import { resolvePendingTx } from '../src/resolver.ts';

const parseStatus = (statusArg: string): Omit<TxStatus, 'pending'> => {
  const normalized = statusArg.toLowerCase();
  switch (normalized) {
    case 'success':
    case 'succeeded':
      return TxStatus.SUCCESS;
    case 'fail':
    case 'failed':
    case 'failure':
      return TxStatus.FAILED;
    default:
      throw Fail`Invalid status: ${q(statusArg)}. Use "success" or "fail"`;
  }
};

export const resolveTx = async (
  txId: `tx${number}`,
  statusArg: string,
  {
    env = process.env,
    fetch = globalThis.fetch,
    generateInterval = timersPromises.setInterval,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    AbortController = globalThis.AbortController,
    AbortSignal = globalThis.AbortSignal,
    WebSocket = ws.WebSocket,
  } = {},
) => {
  console.log(`\n🔧 Manually resolving transaction: ${txId}\n`);

  const status = parseStatus(statusArg);
  console.log(`📝 Setting status to: ${status}\n`);

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
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });

  // We need RPC connection for the smart wallet kit
  const agoricRpcAddr = networkConfig.rpcAddrs[0];
  console.log('📡 Connecting to:', agoricRpcAddr);

  const rpc = new CosmosRPCClient(agoricRpcAddr, {
    WebSocket,
    heartbeats: generateInterval(6000),
  });
  await rpc.opened();

  try {
    const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
    const signingSmartWalletKit = await makeSigningSmartWalletKit(
      { connectWithSigner, walletUtils },
      config.mnemonic,
    );
    console.log('👛 Signer address:', signingSmartWalletKit.address);

    console.log(`\n🔄 Resolving transaction...\n`);

    await resolvePendingTx({
      signingSmartWalletKit,
      txId,
      status,
    });

    console.log(`\n✅ Transaction ${txId} resolved as ${status}!\n`);
  } finally {
    await rpc.close();
  }
};
harden(resolveTx);
