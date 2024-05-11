// @ts-check
/** @file snippets from the README */
/* eslint-disable import/no-extraneous-dependencies -- requiring the package itself to check exports map */
import test from 'ava';

import { agoric } from '../dist/index.js';

const RPC_ENDPOINT = '';

// Skip because we don't have a real endpoint, still tests the types
test.skip('RPC Clients', async t => {
  // @ts-expect-error
  const { createRPCQueryClient } = agoric.ClientFactory;
  const client = await createRPCQueryClient({ rpcEndpoint: RPC_ENDPOINT });

  const swingsetParams = await client.agoric.swingset.params();
  t.truthy(swingsetParams);
});

test.failing('Composing Messages', t => {
  // @ts-expect-error
  const { sendPacket } = agoric.vibc.MessageComposer.withTypeUrl;
  t.truthy(sendPacket);
});
