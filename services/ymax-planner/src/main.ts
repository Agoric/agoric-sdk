import {
  fetchEnvNetworkConfig,
  makeSigningSmartWalletKit,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { Fail } from '@endo/errors';

import { SigningStargateClient } from '@cosmjs/stargate';

import { getConfig } from './config.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { startEngine } from './engine.ts';
import { createEVMContext } from './support.ts';
import { SpectrumClient } from './spectrum-client.ts';

const getChainIdFromRpc = async (rpc: CosmosRPCClient) => {
  await rpc.opened();
  const status = await rpc.request('status', {});
  const chainId = status?.node_info?.network;
  chainId || Fail`Chain ID not found in RPC status: ${status}`;
  return chainId;
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
  const config = await getConfig(env);

  const delay = ms =>
    new Promise(resolve => setTimeout(resolve, ms)).then(_ => {});
  const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
  const agoricRpcAddr = networkConfig.rpcAddrs[0];

  console.warn(`Initializing planner watching`, { agoricRpcAddr });
  const rpc = new CosmosRPCClient(agoricRpcAddr);

  const rpcChainId = await getChainIdFromRpc(rpc);

  if (rpcChainId !== networkConfig.chainName) {
    Fail`Mismatching chainId. config=${networkConfig.chainName}, rpc=${rpcChainId}`;
  }

  const walletUtils = await makeSmartWalletKit({ fetch, delay }, networkConfig);

  const signingSmartWalletKit = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    config.mnemonic,
  );

  console.warn(`Using:`, {
    networkConfig,
    plannerAddress: signingSmartWalletKit.address,
  });

  const spectrum = new SpectrumClient(
    { fetch, setTimeout },
    {
      baseUrl: config.spectrum.apiUrl,
      timeout: config.spectrum.timeout,
      retries: config.spectrum.retries,
    },
  );

  const cosmosRest = new CosmosRestClient(
    {
      fetch,
      setTimeout,
    },
    {
      agoricNetwork: config.cosmosRest.agoricNetwork,
      timeout: config.cosmosRest.timeout,
      retries: config.cosmosRest.retries,
    },
  );

  const evmCtx = await createEVMContext({
    // Any non-mainnet Agoric chain would be connected to Axelar testnet.
    net: env.AGORIC_NET === 'mainnet' ? 'mainnet' : 'testnet',
    alchemy: config.alchemy,
  });

  const powers = {
    evmCtx,
    rpc,
    spectrum,
    cosmosRest,
    signingSmartWalletKit,
  };
  await startEngine(powers, {
    depositIbcDenom: env.DEPOSIT_IBC_DENOM || 'USDC',
  });
};
harden(main);
