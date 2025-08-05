import { assert } from '@endo/errors';
import { inspect } from 'node:util';
import type { CosmosCommand } from './cosmos-cmd.js';
import type { CosmosRPCClient } from './cosmos-rpc.ts';

export const startEngine = async ({ agd, rpc }: {
  agd: CosmosCommand;
  rpc: CosmosRPCClient;
}) => {
  await null;
  let status = await (await agd.exec([`status`])).stdout;
  try {
    const statusObj = JSON.parse(status);
    if (JSON.stringify(statusObj) === status.trim()) status = statusObj;
    else console.log({ status, rt: JSON.stringify(statusObj) });
  } catch (err) {
    console.error(err);
  }
  console.warn('agd status', status);

  // TODO: This is a more expected way to use the RPC client.
  await rpc.opened();
  try {
    // console.warn('RPC client opened:', rpc);
    const sub = rpc.subscribeAll([
      `tm.event = 'NewBlockHeader'`, // All BEGIN_BLOCK, END_BLOCK activity
      // `tm.event = 'Tx'`, // All transactions within the block
    ]);
    // console.warn('consuming events');
    for await (const response of sub) {
      console.log(
        'Received subscription response:',
        inspect(response.data, { depth: 10 }),
      );
    }
  } finally {
    console.warn('Terminating...');
    rpc.close();
  }
};
harden(startEngine);
