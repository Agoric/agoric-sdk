import {
  fetchEnvNetworkConfig,
  getInvocationUpdate,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
  reflectWalletStore,
} from '@agoric/client-utils';
import { objectMetaMap } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
import { isPrimitive } from '@endo/pass-style';

import { SigningStargateClient } from '@cosmjs/stargate';

import { loadConfig } from './config.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { startEngine } from './engine.ts';
import { createEVMContext, verifyEvmChains } from './support.ts';
import { SpectrumClient } from './spectrum-client.ts';
import { makeGasEstimator } from './gas-estimation.ts';
import { SequenceManager } from './sequence-manager.ts';
import { SmartWalletWithSequence } from './smart-wallet-with-sequence.ts';

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
  argv,
  {
    env = process.env,
    fetch = globalThis.fetch,
    now = Date.now,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  } = {},
) => {
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

  const rpc = new CosmosRPCClient(agoricRpcAddr);
  await rpc.opened();
  await assertChainId(rpc, networkConfig.chainName, (...args) =>
    console.warn('Agoric chain status', ...args),
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
  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );
  console.warn('Signer address:', signingSmartWalletKit.address);
  const walletStore = reflectWalletStore(signingSmartWalletKit, {
    setTimeout,
    makeNonce: () => new Date(now()).toISOString(),
  });

  const sequenceManager = new SequenceManager(
    {
      cosmosRest,
      log: (...args) => console.log('[SequenceManager]:', ...args),
    },
    { chainKey: 'agoric', address: signingSmartWalletKit.address },
  );
  await sequenceManager.initialize();

  const smartWalletWithSequence = new SmartWalletWithSequence(
    {
      signingSmartWalletKit,
      sequenceManager,
      log: (...args) => console.log('[SmartWalletWithSequence]:', ...args),
    },
    { chainId: networkConfig.chainName },
  );

  // Create a wrapper that uses SmartWalletWithSequence methods instead of direct smartWalletKit calls
  const smartWalletKitWithSequence = {
    ...signingSmartWalletKit,
    // Override the three main methods to use SmartWalletWithSequence
    sendBridgeAction: smartWalletWithSequence.sendBridgeAction.bind(
      smartWalletWithSequence,
    ),
    executeOffer: smartWalletWithSequence.executeOffer.bind(
      smartWalletWithSequence,
    ),
    invokeEntry: smartWalletWithSequence.invokeEntry.bind(
      smartWalletWithSequence,
    ),
  };

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
    signingSmartWalletKit: smartWalletKitWithSequence,
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
    contractInstance: config.contractInstance,
    depositBrandName: env.DEPOSIT_BRAND_NAME || 'USDC',
    feeBrandName: env.FEE_BRAND_NAME || 'BLD',
  });
};
harden(main);
