import { assert } from '@endo/errors';
import { inspect } from 'node:util';
import type { CosmosCommand } from './cosmos-cmd.js';
import type { CosmosRPCClient } from './cosmos-rpc.ts';

export const startEngine = async ({ agd, rpc }: {
  agd: CosmosCommand;
  rpc: CosmosRPCClient;
}) => {
  await null;
  console.log('Appd status:', (await agd.exec([`status`])).stdout);

  // TODO: This is a more expected way to use the RPC client.
  await rpc.opened();
  try {
    // console.log('RPC client opened:', rpc);
    const sub = rpc.subscribeAll([
      `tm.event = 'NewBlockHeader'`, // All BEGIN_BLOCK, END_BLOCK activity
      // `tm.event = 'Tx'`, // All transactions within the block
    ]);
    // console.log('consuming events');
    for await (const response of sub) {
      console.log(
        'Received subscription response:',
        inspect(response.data, { depth: 10 }),
      );
    }
  } finally {
    rpc.close();
  }
};
harden(startEngine);
