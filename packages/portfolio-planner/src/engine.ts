import { assert } from '@endo/errors';
import type { CosmosRPCClient } from './cosmos-rpc.ts';
import type { AgoricRedis } from './redis.ts';

import { inspect } from 'node:util';

const trySomeExamples = async ({ rpc, redis }) => {
  await redis.hset('testing', 'blockHeight', 31);
  const ret = await redis.hsetIfGreater('testing', 'blockHeight', 32);
  const ret2 = await redis.hsetIfGreater('testing', 'blockHeight', 32);
  console.log('Redis hash-set-if-greater-than result:', { ret, ret2 });
  assert.equal(ret, '32');
  assert.equal(ret2, null);

  await rpc.opened();
  console.log('RPC status:', await rpc.request('status', {}));
};

export const startEngine = async ({
  rpc,
  redis,
}: {
  rpc: CosmosRPCClient;
  redis: AgoricRedis;
}) => {
  console.log('Starting Agoric watcher...');

  // XXX Fire off some simple requests to test the RPC and Redis clients.
  void trySomeExamples({ rpc, redis }).catch(error =>
    console.error('@@@ Error in trySomeExamples:', error),
  );

  // TODO: This is a more expected way to use the RPC client.
  await rpc.opened();
  try {
    // console.log('RPC client opened:', rpc);
    const sub = rpc.subscribeAll([
      `tm.event = 'NewBlockHeader'`, // All BEGIN_BLOCK, END_BLOCK activity
      `tm.event = 'Tx'`, // All transactions within the block
    ]);
    // console.log('consuming events');
    for await (const response of sub) {
      console.log(
        'Received subscription response:',
        inspect(response, { depth: 10 }),
      );
    }
  } finally {
    rpc.close();
  }
};
