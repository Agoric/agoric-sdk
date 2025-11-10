/* eslint-env node */

import timersPromises from 'node:timers/promises';
import { inspect } from 'node:util';

import { SigningStargateClient } from '@cosmjs/stargate';
import type { GraphQLClient } from 'graphql-request';
import * as ws from 'ws';

import { Fail, q } from '@endo/errors';
import { isPrimitive } from '@endo/pass-style';

import {
  fetchEnvNetworkConfig,
  getInvocationUpdate,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import {
  deeplyFulfilledObject,
  objectMap,
  objectMetaMap,
} from '@agoric/internal';
import { UsdcTokenIds } from '@agoric/portfolio-api/src/constants.js';

import { loadConfig } from './config.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { makeGraphqlMultiClient } from './graphql-client.ts';
import { getSdk as getSpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import { getSdk as getSpectrumPoolsSdk } from './graphql/api-spectrum-pools/__generated/sdk.ts';
import { startEngine } from './engine.ts';
import {
  createEVMContext,
  spectrumChainIdsByCluster,
  spectrumPoolIdsByCluster,
} from './support.ts';
import { SpectrumClient } from './spectrum-client.ts';
import { makeGasEstimator } from './gas-estimation.ts';
import { makeSQLiteKeyValueStore } from './kv-store.ts';

const assertChainId = async (
  rpc: CosmosRPCClient,
  chainId: string,
  log?: typeof console.log,
) => {
  const status = await rpc.request('status', {});
  const actualChainId = status?.node_info?.network;
  log?.(actualChainId, status);
  actualChainId || Fail`Chain ID not found in RPC status: ${status}`;
  actualChainId === chainId ||
    Fail`Expected chain ID ${q(actualChainId)} to be ${q(chainId)}`;
};

/**
 * Mock the abort reason of `AbortSignal.timeout(ms)`.
 * https://dom.spec.whatwg.org/#dom-abortsignal-timeout
 */
const makeTimeoutReason = () =>
  Object.defineProperty(Error('Timed out'), 'name', {
    value: 'TimeoutError',
  });

const prepareAbortController = ({
  setTimeout,
  AbortController = globalThis.AbortController,
  AbortSignal = globalThis.AbortSignal,
}: {
  setTimeout: typeof globalThis.setTimeout;
  AbortController?: typeof globalThis.AbortController;
  AbortSignal?: typeof globalThis.AbortSignal;
}) => {
  /**
   * Abstract AbortController/AbortSignal functionality upon a provided
   * setTimeout.
   */
  const makeAbortController = (
    timeoutMillisec?: number,
    racingSignals: Iterable<AbortSignal> = [],
  ) => {
    let controller: AbortController | null = new AbortController();
    const abort: AbortController['abort'] = reason => {
      try {
        return controller?.abort(reason);
      } finally {
        controller = null;
      }
    };
    if (timeoutMillisec !== undefined) {
      setTimeout(() => abort(makeTimeoutReason()), timeoutMillisec);
    }
    const signal = AbortSignal.any([controller.signal, ...racingSignals]);
    signal.addEventListener('abort', _event => abort());
    return { abort, signal };
  };
  return makeAbortController;
};

export type SimplePowers = {
  fetch: typeof fetch;
  setTimeout: typeof setTimeout;
  delay: (ms: number) => Promise<void>;
  makeAbortController: ReturnType<typeof prepareAbortController>;
};

export const main = async (
  args: string[],
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
  const dashIdx = [...args, '--'].indexOf('--');
  const maybeOpts = args.slice(0, dashIdx);
  const isDryRun = maybeOpts.includes('--dry-run');
  const isVerbose = maybeOpts.includes('--verbose');

  const simplePowers: SimplePowers = {
    fetch,
    setTimeout,
    delay: ms => new Promise(resolve => setTimeout(resolve, ms)).then(() => {}),
    makeAbortController: prepareAbortController({
      setTimeout,
      AbortController,
      AbortSignal,
    }),
  };

  const config = await loadConfig(env);
  const { clusterName } = config;
  const spectrumChainIds = spectrumChainIdsByCluster[clusterName];
  const spectrumPoolIds = spectrumPoolIdsByCluster[clusterName];
  const usdcTokensByChain = UsdcTokenIds[clusterName];

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });
  const agoricRpcAddr = networkConfig.rpcAddrs[0];
  console.warn('Initializing planner:', networkConfig);

  const rpc = new CosmosRPCClient(agoricRpcAddr, {
    WebSocket,
    heartbeats: generateInterval(6000),
  });
  await rpc.opened();
  await assertChainId(rpc, networkConfig.chainName, (...logArgs) =>
    console.warn('Agoric chain status:', ...logArgs),
  );

  const cosmosRest = new CosmosRestClient(simplePowers, {
    clusterName,
    timeout: config.cosmosRest.timeout,
    retries: config.cosmosRest.retries,
  });
  const agoricChainInfo = await cosmosRest.getChainInfo('agoric');
  const agoricVersions = (agoricChainInfo as any)?.application_version;
  const agoricSummary = objectMetaMap(agoricVersions || {}, desc =>
    isPrimitive(desc.value) ? desc : undefined,
  );
  console.warn('Agoric chain versions:', agoricVersions && agoricSummary);

  const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
  let signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );
  if (isDryRun) {
    const stdoutIsTty = process.stdout.isTTY;
    const bridgeActionInspectOpts = { depth: 6, colors: stdoutIsTty };
    const { address, query, pollOffer } = signingSmartWalletKit;
    const sendBridgeAction: SigningSmartWalletKit['sendBridgeAction'] = async (
      action,
      fee,
      memo,
      signerData,
    ) => {
      if (isVerbose) {
        console.log(
          '[sendBridgeAction]',
          inspect({ action, fee, memo, signerData }, bridgeActionInspectOpts),
        );
      }
      return {
        height: 0,
        txIndex: 0,
        code: 0,
        transactionHash: '',
        events: [],
        msgResponses: [],
        gasUsed: 0n,
        gasWanted: 0n,
      };
    };
    signingSmartWalletKit = {
      ...walletUtils,
      address,
      query,
      sendBridgeAction,
      executeOffer: async offer => {
        const offerP = pollOffer(address, offer.id);
        await sendBridgeAction({ method: 'executeOffer', offer });
        return offerP;
      },
    };
  }
  console.warn('Signer address:', signingSmartWalletKit.address);
  const walletStore = reflectWalletStore(signingSmartWalletKit, {
    setTimeout,
    makeNonce: () => new Date(now()).toISOString(),
  });

  const spectrum = new SpectrumClient(simplePowers, {
    baseUrl: config.spectrum.apiUrl,
    timeout: config.spectrum.timeout,
    retries: config.spectrum.retries,
  });

  const makeOptionalGqlSdk = <Sdk>(
    makeSdk: (client: GraphQLClient) => Sdk,
    endpoints?: string[],
  ): Sdk | undefined => {
    if (!endpoints) return undefined;
    const multiClient = makeGraphqlMultiClient(endpoints, simplePowers, {
      requestLimits: config.requestLimits,
    });
    return makeSdk(multiClient);
  };
  const spectrumBlockchain = makeOptionalGqlSdk(
    getSpectrumBlockchainSdk,
    config.spectrumBlockchainEndpoints,
  );
  const spectrumPools = makeOptionalGqlSdk(
    getSpectrumPoolsSdk,
    config.spectrumPoolsEndpoints,
  );

  const evmCtx = await createEVMContext({
    clusterName,
    alchemyApiKey: config.alchemyApiKey,
  });

  // Verify Alchemy chain availability.
  const failedEvmChains = [] as Array<keyof typeof evmCtx.evmProviders>;
  const evmHeights = await deeplyFulfilledObject(
    objectMap(evmCtx.evmProviders, (provider, chainId) =>
      provider.getBlockNumber().catch(err => {
        failedEvmChains.push(chainId);
        return { error: err.message };
      }),
    ),
  );
  console.warn('EVM chain heights:', evmHeights);
  failedEvmChains.length === 0 ||
    Fail`Could not connect to EVM chains: ${q(failedEvmChains)}. Ensure they are enabled in your Alchemy dashboard.`;

  const gasEstimator = makeGasEstimator({
    axelarApiAddress: config.axelar.apiUrl,
    axelarChainIdMap: config.axelar.chainIdMap,
    fetch,
  });

  const kvStore = makeSQLiteKeyValueStore(config.sqlite.dbPath, {
    trace: console.log,
  });

  const powers = {
    evmCtx: {
      kvStore,
      ...evmCtx,
    },
    rpc,
    spectrum,
    spectrumChainIds,
    spectrumPoolIds,
    spectrumBlockchain,
    spectrumPools,
    cosmosRest,
    signingSmartWalletKit,
    walletStore,
    getWalletInvocationUpdate: (messageId, opts) => {
      const { getLastUpdate } = signingSmartWalletKit.query;
      const retryOpts = { log: () => {}, setTimeout, ...opts };
      return getInvocationUpdate(messageId, getLastUpdate, retryOpts);
    },
    now,
    gasEstimator,
    usdcTokensByChain,
    kvStore,
  };
  await startEngine(powers, {
    isDryRun,
    contractInstance: config.contractInstance,
    depositBrandName: env.DEPOSIT_BRAND_NAME || 'USDC',
    feeBrandName: env.FEE_BRAND_NAME || 'BLD',
  });
};
harden(main);
