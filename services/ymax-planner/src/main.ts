import timersPromises from 'node:timers/promises';
import { inspect } from 'node:util';

import { SigningStargateClient } from '@cosmjs/stargate';
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
import { objectMetaMap } from '@agoric/internal';

import { loadConfig } from './config.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { startEngine } from './engine.ts';
import { createEVMContext, verifyEvmChains } from './support.ts';
import { SpectrumClient } from './spectrum-client.ts';
import { makeGasEstimator } from './gas-estimation.ts';

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

export const main = async (
  args: string[],
  {
    env = process.env,
    fetch = globalThis.fetch,
    generateInterval = timersPromises.setInterval,
    now = Date.now,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
    WebSocket = ws.WebSocket,
  } = {},
) => {
  const dashIdx = [...args, '--'].indexOf('--');
  const maybeOpts = args.slice(0, dashIdx);
  const isDryRun = maybeOpts.includes('--dry-run');
  const isVerbose = maybeOpts.includes('--verbose');

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(() => {});
  const simplePowers = { fetch, setTimeout, delay };

  const config = await loadConfig(env);
  const { clusterName } = config;

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });
  const agoricRpcAddr = networkConfig.rpcAddrs[0];
  console.warn('Initializing planner', networkConfig);

  const rpc = new CosmosRPCClient(agoricRpcAddr, {
    WebSocket,
    heartbeats: generateInterval(6000),
  });
  await rpc.opened();
  await assertChainId(rpc, networkConfig.chainName, (...logArgs) =>
    console.warn('Agoric chain status', ...logArgs),
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
  console.warn('Agoric chain versions', agoricVersions && agoricSummary);

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

  const evmCtx = await createEVMContext({
    clusterName,
    alchemyApiKey: config.alchemyApiKey,
  });

  // Verify Alchemy chain availability - throws if any chain fails
  console.warn('Verifying EVM chain connectivity...');
  await verifyEvmChains(evmCtx.evmProviders);

  const gasEstimator = makeGasEstimator({
    axelarApiAddress: config.axelar.apiUrl,
    axelarChainIdMap: config.axelar.chainIdMap,
    fetch,
  });

  const powers = {
    evmCtx,
    rpc,
    spectrum,
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
  };
  await startEngine(powers, {
    isDryRun,
    contractInstance: config.contractInstance,
    depositBrandName: env.DEPOSIT_BRAND_NAME || 'USDC',
    feeBrandName: env.FEE_BRAND_NAME || 'BLD',
  });
};
harden(main);
