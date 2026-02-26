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
import { deeplyFulfilledObject, objectMap } from '@agoric/internal';

import { loadConfig } from '../src/config.ts';
import { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { CosmosRPCClient } from '../src/cosmos-rpc.ts';
import { createEVMContext, prepareAbortController } from '../src/support.ts';
import type { SimplePowers } from '../src/main.ts';
import { makeSQLiteKeyValueStore } from '../src/kv-store.ts';
import type { HandlePendingTxOpts } from '../src/pending-tx-manager.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';

const makeVstoragePathPrefixes = (contractInstance: string) => ({
  portfoliosPathPrefix: `published.${contractInstance}.portfolios`,
  pendingTxPathPrefix: `published.${contractInstance}.pendingTxs`,
});

export const processTx = async (
  concurrency: number,
  cliArgs: string[],
  {
    env = process.env,
    fetch = globalThis.fetch,
    generateInterval = timersPromises.setInterval,
    now = Date.now,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    AbortController = globalThis.AbortController,
    AbortSignal = globalThis.AbortSignal,
    WebSocket = ws.WebSocket,
  } = {},
) => {
  console.log(`\n🔍 Load testing lookback with ${concurrency} parallel scans\n`);

  const maybeOpts = cliArgs;
  const isVerbose = maybeOpts.includes('--verbose');

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
  const { clusterName } = config;

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });
  const agoricRpcAddr = networkConfig.rpcAddrs[0];
  console.log('📡 Connecting to:', agoricRpcAddr);

  const rpc = new CosmosRPCClient(agoricRpcAddr, {
    WebSocket,
    heartbeats: generateInterval(6000),
  });
  await rpc.opened();

  const cosmosRest = new CosmosRestClient(simplePowers, {
    clusterName,
    timeout: config.cosmosRest.timeout,
    retries: config.cosmosRest.retries,
  });

  const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );
  console.log('👛 Signer address:', signingSmartWalletKit.address);

  const evmCtx = await createEVMContext({
    clusterName,
    alchemyApiKey: config.alchemyApiKey,
  });

  // Verify Alchemy chain availability
  const failedEvmChains = [] as Array<keyof typeof evmCtx.evmProviders>;
  const evmHeights = await deeplyFulfilledObject(
    objectMap(evmCtx.evmProviders, (provider, chainId) =>
      provider.getBlockNumber().catch(err => {
        failedEvmChains.push(chainId);
        return { error: err.message };
      }),
    ),
  );
  if (isVerbose) {
    console.log('📊 EVM chain heights:', evmHeights);
  }
  failedEvmChains.length === 0 ||
    Fail`Could not connect to EVM chains: ${q(failedEvmChains)}`;

  const { db, kvStore } = makeSQLiteKeyValueStore(config.sqlite.dbPath, {
    trace: () => {},
  });

  try {
    const vstoragePathPrefixes = makeVstoragePathPrefixes(
      config.contractInstance,
    );
    const { marshaller } = signingSmartWalletKit;

    // This tx failed on EVM
    // EVM Wallet: https://43114.snowtrace.io/address/0x57733a73f0eb38fae93ae5af01cd994625fc5b6f
    // Tx https://vstorage.agoric.net/?path=published.ymax1.pendingTxs.tx445&endpoint=https%3A%2F%2Fmain-a.rpc.agoric.net%3A443&height=undefined
    // Tx on EVM: https://43114.snowtrace.io/tx/0x00c09227e4aeba5d2c78678cf278ac0afddfff073c27b99f5357ff95f8d9e178
    const txId = 'tx445';
    const sourceAddr =
      'cosmos:agoric-3:agoric1uu7jv958xxayfeezq7yz8zxda9jfr0v7h6shlke350qadqld9jgqgu3lpq';
    const pendingTxData = {
      destinationAddress:
        'eip155:43114:0x57733a73f0eb38fae93ae5af01cd994625fc5b6f',
      status: 'pending',
      type: 'GMP',
      sourceAddress: sourceAddr,
    };

    const timestampMs = 123;

    console.log(`\n🔄 Launching ${concurrency} parallel lookback scans for ${txId}...\n`);
    const startTime = now();

    const results = await Promise.allSettled(
      Array.from({ length: concurrency }, (_, i) => {
        const label = `[scan-${i}]`;
        const scanStart = now();

        const txPowers: HandlePendingTxOpts = Object.freeze({
          ...evmCtx,
          cosmosRest,
          cosmosRpc: rpc,
          fetch,
          setTimeout,
          kvStore,
          makeAbortController,
          log: (...args: unknown[]) => console.log(label, ...args),
          error: (...args: unknown[]) => console.error(label, ...args),
          marshaller,
          signingSmartWalletKit,
          vstoragePathPrefixes,
          axelarApiUrl: config.axelar.apiUrl,
          pendingTxAbortControllers: new Map(),
        });

        return handlePendingTx(pendingTxData as any, {
          ...txPowers,
          txTimestampMs: timestampMs,
        }).then(
          () => ({ index: i, durationMs: now() - scanStart }),
          err => {
            throw Object.assign(err, {
              index: i,
              durationMs: now() - scanStart,
            });
          },
        );
      }),
    );

    const totalDuration = now() - startTime;

    // Report results
    const succeeded = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    const durations = results.map(r =>
      r.status === 'fulfilled'
        ? r.value.durationMs
        : (r.reason as { durationMs: number }).durationMs,
    );
    durations.sort((a, b) => a - b);

    console.log('\n========== LOAD TEST RESULTS ==========');
    console.log(`Concurrency: ${concurrency}`);
    console.log(`Total wall time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Succeeded: ${succeeded.length} / ${concurrency}`);
    console.log(`Failed: ${failed.length} / ${concurrency}`);

    if (durations.length > 0) {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = durations[0];
      const max = durations[durations.length - 1];
      const p50 = durations[Math.floor(durations.length * 0.5)];
      const p95 = durations[Math.floor(durations.length * 0.95)];

      console.log(`\nPer-scan latency:`);
      console.log(`  Min:  ${(min / 1000).toFixed(1)}s`);
      console.log(`  Avg:  ${(avg / 1000).toFixed(1)}s`);
      console.log(`  P50:  ${(p50 / 1000).toFixed(1)}s`);
      console.log(`  P95:  ${(p95 / 1000).toFixed(1)}s`);
      console.log(`  Max:  ${(max / 1000).toFixed(1)}s`);
    }

    if (failed.length > 0) {
      console.log(`\nFailed scans:`);
      for (const r of failed) {
        if (r.status === 'rejected') {
          const { index, durationMs, message } = r.reason as {
            index: number;
            durationMs: number;
            message: string;
          };
          console.error(
            `  [scan-${index}] after ${(durationMs / 1000).toFixed(1)}s: ${message}`,
          );
        }
      }
    }
    console.log('========================================\n');
  } finally {
    await db.close();
    await rpc.close();
  }
};
harden(processTx);
