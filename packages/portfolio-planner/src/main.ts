import { Fail } from '@endo/errors';
import { makeCosmosCommand } from './cosmos-cmd.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { SpectrumClient } from './spectrum-client.ts';
import { CosmosRestClient } from './cosmos-rest-client.ts';
import { startEngine } from './engine.ts';

const DEFAULT_AGD = 'agd';
const DEFAULT_ENV_PREFIX = 'AGD_';
const DEFAULT_FROM = 'planner';

const getChainIdFromRpc = async (rpc: CosmosRPCClient) => {
  await rpc.opened();
  const status = await rpc.request('status', {});
  const chainId = status?.node_info?.network;
  chainId || Fail`Chain ID not found in RPC status: ${status}`;
  return chainId;
};

export const main = async (argv, { env }) => {
  await null;
  // console.log('Hello, world!', { argv });

  const { AGORIC_RPC_URL } = env;

  console.warn(`Initializing planner watching`, { AGORIC_RPC_URL });
  const rpc = new CosmosRPCClient(AGORIC_RPC_URL);

  const {
    AGD = DEFAULT_AGD,
    ENV_PREFIX = DEFAULT_ENV_PREFIX,
    CHAIN_ID = await getChainIdFromRpc(rpc),
    FROM = DEFAULT_FROM,
    REDIS_URL,
    SPECTRUM_API_URL,
    SPECTRUM_API_TIMEOUT,
    SPECTRUM_API_RETRIES,
  } = env;

  console.warn(`Using:`, { AGD, CHAIN_ID, FROM });

  const agd = makeCosmosCommand([AGD], {
    envPrefix: ENV_PREFIX,
    node: AGORIC_RPC_URL,
    from: FROM,
    chainId: CHAIN_ID,
  });

  const { stdout: plannerAddress } = await agd.rawOutput.exec([
    'keys',
    'show',
    '-a',
    FROM,
  ]);
  console.log('Planner address:', plannerAddress);

  let redis: AgoricRedis | undefined;
  if (REDIS_URL) {
    console.log('Connecting to Redis');
    redis = new AgoricRedis(REDIS_URL);
  }

  const spectrum = new SpectrumClient({
    baseUrl: SPECTRUM_API_URL,
    timeout: SPECTRUM_API_TIMEOUT ? parseInt(SPECTRUM_API_TIMEOUT, 10) : undefined,
    retries: SPECTRUM_API_RETRIES ? parseInt(SPECTRUM_API_RETRIES, 10) : undefined,
  });

  const cosmosRest = new CosmosRestClient({
    timeout: 15000, // 15s timeout for REST calls
    retries: 3,
  });

  await startEngine({ agd, rpc, redis, spectrum, cosmosRest });
};
harden(main);
