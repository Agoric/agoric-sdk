/* eslint-env node */

import { EventEmitter } from 'node:events';
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
  failedCount: number,
  successCount: number,
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
  const totalCount = failedCount + successCount;
  console.log(
    `\n🔍 Load testing lookback: ${failedCount} failed tx + ${successCount} success tx = ${totalCount} parallel scans\n`,
  );

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

  // Bump global listener limit for shared WebSockets under high concurrency
  EventEmitter.defaultMaxListeners = totalCount + 20;

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
    // const txId = 'tx445';
    // const sourceAddr =
    //   'cosmos:agoric-3:agoric1uu7jv958xxayfeezq7yz8zxda9jfr0v7h6shlke350qadqld9jgqgu3lpq';
    // const pendingTxData = {
    //   txId,
    //   destinationAddress:
    //     'eip155:43114:0x57733a73f0eb38fae93ae5af01cd994625fc5b6f',
    //   status: 'pending',
    //   type: 'GMP',
    //   sourceAddress: sourceAddr,
    // };
    // const timestampMs = 1764837518000 - 4 * 60 * 1000;

    // https://optimistic.etherscan.io/address/0xbe731782c125b12d1549a5a5dc29eeafc2f82322
    // https://vstorage.agoric.net/?path=published.ymax0.pendingTxs.tx465&endpoint=https%3A%2F%2Fmain-a.rpc.agoric.net%3A443&height=undefined
    const txId = 'tx465';
    const pendingTxData = {
      txId,
      destinationAddress:
        'eip155:10:0xbe731782c125b12d1549a5a5dc29eeafc2f82322',
      sourceAddress:
        'cosmos:agoric-3:agoric1u6mpx9zzzahtmdvlhswmdyxm9wyush7xr6hl7k93kzxdu77xljrs35k424',
      status: 'pending',
      type: 'GMP',
    };
    const timestampMs = 1769482245000 - 4 * 60 * 1000;

    // successful tx on Arbitrum
    // evm tx https://arbiscan.io/tx/0xa145fae8071255f72e14ef49f0b77d2805721ccaa08f54c01f447396685983ce
    // https://vstorage.agoric.net/?path=published.ymax1.pendingTxs.tx1359&endpoint=https%3A%2F%2Fmain-a.rpc.agoric.net%3A443&height=undefined
    const txId1 = 'tx1359';
    const pendingTxData2 = {
      txId: txId1,
      destinationAddress:
        'eip155:42161:0x7f52ccd46cebd4a15649f68d077424c346dd7498',
      sourceAddress:
        'cosmos:agoric-3:agoric10g55pv27870cyyqszqtgfxu9mvhmangv73vr0ut0hel92mndzrhq799zvq',
      status: 'pending',
      type: 'GMP',
    };
    const timestampMs1 = 1769733702000 - 2 * 60 * 1000;

    const makeScanJob = (
      label: string,
      txData: Record<string, string>,
      txTimestampMs: number,
      { skipSuccessPath = false } = {},
    ) => {
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

      return handlePendingTx(txData as any, {
        ...txPowers,
        txTimestampMs,
        skipSuccessPath,
      }).then(
        () => ({ label, durationMs: now() - scanStart }),
        err => {
          throw Object.assign(err, {
            label,
            durationMs: now() - scanStart,
          });
        },
      );
    };

    console.log(
      `\n🔄 Launching ${totalCount} parallel lookback scans (${failedCount}x ${txId} failed + ${successCount}x ${txId1} success)...\n`,
    );
    const startTime = now();

    const jobs = [
      ...Array.from({ length: failedCount }, (_, i) =>
        makeScanJob(`[failed-${i}]`, pendingTxData, timestampMs, {
          skipSuccessPath: true,
        }),
      ),
      ...Array.from({ length: successCount }, (_, i) =>
        makeScanJob(`[success-${i}]`, pendingTxData2, timestampMs1),
      ),
    ];

    const results = await Promise.allSettled(jobs);
    const totalDuration = now() - startTime;

    // Report results
    const settled = results.filter(r => r.status === 'fulfilled');
    const errored = results.filter(r => r.status === 'rejected');

    const durations = results.map(r =>
      r.status === 'fulfilled'
        ? r.value.durationMs
        : (r.reason as { durationMs: number }).durationMs,
    );
    durations.sort((a, b) => a - b);

    console.log('\n========== LOAD TEST RESULTS ==========');
    console.log(
      `Concurrency: ${totalCount} (${failedCount} failed + ${successCount} success)`,
    );
    console.log(`Total wall time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`Succeeded: ${settled.length} / ${totalCount}`);
    console.log(`Errored: ${errored.length} / ${totalCount}`);

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

    if (errored.length > 0) {
      console.log(`\nErrored scans:`);
      for (const r of errored) {
        if (r.status === 'rejected') {
          const { label, durationMs, message } = r.reason as {
            label: string;
            durationMs: number;
            message: string;
          };
          console.error(
            `  ${label} after ${(durationMs / 1000).toFixed(1)}s: ${message}`,
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
