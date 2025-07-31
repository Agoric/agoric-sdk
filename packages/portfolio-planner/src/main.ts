import { AgoricRedis } from './redis.ts';
import { CosmosRPCClient } from './cosmos-rpc.ts';
import { startEngine } from './engine.ts';

export const main = async (argv, { env }) => {
  console.log('Hello, world!', { argv });

  const redis = new AgoricRedis(env.REDIS_URL);
  const rpc = new CosmosRPCClient(env.AGORIC_RPC_URL);

  await startEngine({ rpc, redis });
};
