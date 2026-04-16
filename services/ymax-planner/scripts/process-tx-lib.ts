/* global process */

import timersPromises from 'node:timers/promises';
import { inspect } from 'node:util';

import { SigningStargateClient } from '@cosmjs/stargate';
import * as ws from 'ws';

import { Fail, q } from '@endo/errors';

import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { deeplyFulfilledObject, mustMatch, objectMap } from '@agoric/internal';

import {
  PublishedTxShape,
  type PendingTx,
} from '@aglocal/portfolio-contract/src/resolver/types.ts';
import {
  TxStatus,
  TxType,
} from '@aglocal/portfolio-contract/src/resolver/constants.js';

import type { CaipChainId } from '@agoric/orchestration';
import { loadConfig } from '../src/config.ts';
import { CosmosRPCClient } from '../src/cosmos-rpc.ts';
import { createEVMContext, prepareAbortController } from '../src/support.ts';
import { makeEvmRpc, type EvmRpc } from '../src/evm-scanner.ts';
import type { SimplePowers } from '../src/main.ts';
import { makeSQLiteKeyValueStore } from '../src/kv-store.ts';
import type { HandlePendingTxOpts } from '../src/pending-tx-manager.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import {
  parseStreamCell,
  parseStreamCellValue,
} from '../src/vstorage-utils.ts';

const makeVstoragePathPrefixes = (contractInstance: string) => ({
  portfoliosPathPrefix: `published.${contractInstance}.portfolios`,
  pendingTxPathPrefix: `published.${contractInstance}.pendingTxs`,
});

const inspectOpts = { depth: 6, colors: process.stdout.isTTY };

export const processTx = async (
  txId: string,
  cliArgs: string[],
  {
    env = process.env,
    fetch = globalThis.fetch,
    generateInterval = timersPromises.setInterval,
    _now = Date.now,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    AbortController = globalThis.AbortController,
    AbortSignal = globalThis.AbortSignal,
    WebSocket = ws.WebSocket,
  } = {},
) => {
  void _now;
  console.log(`\n🔍 Resolving transaction: ${txId}\n`);

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

  const retryProviders = Object.fromEntries(
    Object.entries(evmCtx.evmProviders).map(([caip, provider]) => [
      caip,
      makeEvmRpc(provider, setTimeout),
    ]),
  ) as Record<CaipChainId, EvmRpc>;

  const { db, kvStore } = makeSQLiteKeyValueStore(config.sqlite.dbPath, {
    trace: () => {},
  });

  try {
    const vstoragePathPrefixes = makeVstoragePathPrefixes(
      config.contractInstance,
    );
    const { pendingTxPathPrefix } = vstoragePathPrefixes;
    const path = `${pendingTxPathPrefix}.${txId}`;

    console.log(`\n📖 Reading from vstorage: ${path}\n`);

    // Fetch transaction data from vstorage
    const { query, marshaller } = signingSmartWalletKit;
    let streamCellJson;
    let data;

    try {
      streamCellJson = await query.vstorage.readStorage(path, {
        kind: 'data',
      });
      const streamCell = parseStreamCell(streamCellJson.value, path);
      const marshalledData = parseStreamCellValue(streamCell, -1, path);
      data = marshaller.fromCapData(marshalledData);

      console.log('📦 Transaction data:', inspect(data, inspectOpts));

      if (data?.status !== TxStatus.PENDING) {
        console.warn(
          `⚠️  Transaction ${txId} is not pending (status: ${data?.status})`,
        );
        return;
      }

      if (data.type === TxType.CCTP_TO_AGORIC) {
        console.warn(
          `⚠️  Transaction ${txId} is CCTP_TO_AGORIC type, skipping`,
        );
        return;
      }

      mustMatch(harden(data), PublishedTxShape, path);

      const tx: PendingTx = { txId, ...data };

      console.log(`\n🔄 Processing transaction...\n`);

      // Prepare powers for handling the transaction
      const txPowers: HandlePendingTxOpts = Object.freeze({
        ...evmCtx,
        retryProviders,
        fetch,
        setTimeout,
        kvStore,
        makeAbortController,
        log: (...args) => console.log('[TX]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        marshaller,
        signingSmartWalletKit,
        vstoragePathPrefixes,
        axelarApiUrl: config.axelar.apiUrl,
        pendingTxAbortControllers: new Map(),
      });

      // Get the block timestamp for lookback mode
      const blockHeight = BigInt(streamCell.blockHeight);
      const resp = await rpc.request('block', {
        height: `${blockHeight}`,
      });
      const date = new Date(resp.block.header.time);
      const timestampMs = date.getTime();

      console.log(
        `📅 Transaction published at block ${blockHeight} (${date.toISOString()})`,
      );

      // Process the transaction with lookback mode
      await handlePendingTx(tx, { ...txPowers, txTimestampMs: timestampMs });

      console.log(`\n✅ Transaction ${txId} processing complete!\n`);
    } catch (err) {
      const errLabel = `🚨 Failed to process pending tx ${path}`;
      console.error(errLabel, data || streamCellJson, err);
      throw err;
    }
  } finally {
    await db.close();
    await rpc.close();
  }
};
harden(processTx);
