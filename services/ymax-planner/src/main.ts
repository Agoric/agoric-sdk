import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { Fail, q } from '@endo/errors';

import { SigningStargateClient } from '@cosmjs/stargate';

import { getConfig } from './config.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { startEngine } from './engine.ts';
import { buildEvmDependencies } from './support.ts';
import { SpectrumClient } from './spectrum-client.ts';

const assertChainId = async (rpc: CosmosRPCClient, chainId: string) => {
  const status = await rpc.request('status', {});
  const actualChainId = status?.node_info?.network;
  actualChainId || Fail`Chain ID not found in RPC status: ${status}`;
  actualChainId === chainId ||
    Fail`Expected chain ID ${q(actualChainId)} to be ${q(chainId)}`;
};

export const main = async (
  argv,
  {
    env = process.env,
    fetch = globalThis.fetch,
    setTimeout = globalThis.setTimeout,
    connectWithSigner = SigningStargateClient.connectWithSigner,
  } = {},
) => {
  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(() => {});
  const simplePowers = { fetch, setTimeout, delay };

  const config = await getConfig(env);
  const { clusterName } = config;

  const networkConfig = await fetchEnvNetworkConfig({
    env: { AGORIC_NET: config.cosmosRest.agoricNetworkSpec },
    fetch,
  });
  const agoricRpcAddr = networkConfig.rpcAddrs[0];

  console.warn('Initializing planner watching', { agoricRpcAddr });
  const rpc = new CosmosRPCClient(agoricRpcAddr);
  await rpc.opened();
  await assertChainId(rpc, networkConfig.chainName);

  const walletUtils = await makeSmartWalletKit(simplePowers, networkConfig);
  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );

  console.warn('Using:', signingSmartWalletKit.address, networkConfig);

  const spectrum = new SpectrumClient(simplePowers, {
    baseUrl: config.spectrum.apiUrl,
    timeout: config.spectrum.timeout,
    retries: config.spectrum.retries,
  });

  const cosmosRest = new CosmosRestClient(simplePowers, {
    clusterName,
    timeout: config.cosmosRest.timeout,
    retries: config.cosmosRest.retries,
  });

  const { evmProviders, usdcAddresses } = await buildEvmDependencies({
    clusterName,
    alchemyApiKey: config.alchemyApiKey,
  });

  const powers = {
    evmProviders,
    rpc,
    spectrum,
    cosmosRest,
    signingSmartWalletKit,
  };
  await startEngine(powers, {
    depositIbcDenom: env.DEPOSIT_IBC_DENOM || 'USDC',
    usdcAddresses,
  });
};
harden(main);
