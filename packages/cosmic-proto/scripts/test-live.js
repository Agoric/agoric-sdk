#!/usr/bin/env node
// @ts-check
import '@endo/init';

import process from 'node:process';
import assert from 'node:assert/strict';

import { agoric } from '../dist/codegen/index.js';

const rpcEndpoint = 'https://emerynet.rpc.agoric.net:443';

const testMain = async () => {
  const client = await agoric.ClientFactory.createRPCQueryClient({
    rpcEndpoint,
  });
  const { params } = await client.agoric.swingset.params();
  assert.deepEqual(Object.keys(params).sort(), [
    'beansPerUnit',
    'bootstrapVatConfig',
    'feeUnitPrice',
    'powerFlagFees',
    'queueMax',
  ]);
  console.log('✅ SwingSet params query successful');
};

process.exitCode = 1;
testMain().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
