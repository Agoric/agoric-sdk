import { Fail } from '@endo/errors';
import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
  makeVstorageKit,
} from '@agoric/client-utils';

import { SigningStargateClient } from '@cosmjs/stargate';

import { CosmosRPCClient } from './cosmos-rpc.ts';
import { SpectrumClient } from './spectrum-client.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { startEngine } from './engine.ts';
import { makeStargateClientKit } from './swingset-tx.ts';
import { createContext } from './axelar/support.ts';

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
  await null;

  const { MNEMONIC } = env;
  if (!MNEMONIC) throw Error(`MNEMONIC not set`);

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

  const walletKit = await makeSmartWalletKit({ fetch, delay }, networkConfig);
  const vstorageKit = makeVstorageKit({ fetch }, networkConfig);

  const { address: plannerAddress, client: stargateClient } =
    await makeStargateClientKit(MNEMONIC, {
      connectWithSigner,
      rpcAddr: networkConfig.rpcAddrs[0],
    });

  console.warn(`Using:`, { networkConfig, plannerAddress });

  const { SPECTRUM_API_URL, SPECTRUM_API_TIMEOUT, SPECTRUM_API_RETRIES } = env;
  const spectrum = new SpectrumClient({
    baseUrl: SPECTRUM_API_URL,
    timeout: SPECTRUM_API_TIMEOUT
      ? parseInt(SPECTRUM_API_TIMEOUT, 10)
      : undefined,
    retries: SPECTRUM_API_RETRIES
      ? parseInt(SPECTRUM_API_RETRIES, 10)
      : undefined,
  });

  const cosmosRest = new CosmosRestClient({
    timeout: 15000, // 15s timeout for REST calls
    retries: 3,
    variant: env.AGORIC_NET || 'local',
  });

  const net = env.AGORIC_NET == 'mainnet' ? 'mainnet' : 'testnet';
  const ctx = await createContext({
    net,
    stargateClient,
    plannerAddress,
    vstorageKit,
    walletKit,
  });
  await startEngine({
    ctx,
    rpc,
    spectrum,
    cosmosRest,
  });
};
harden(main);
