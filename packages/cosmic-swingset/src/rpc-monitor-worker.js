// @ts-check
import '@endo/init/unsafe-fast.js';
import { parentPort } from 'node:worker_threads';
import { makeRpcLifecycle } from './helpers/rpc-lifecycle.js';

/** @import { RpcMonitorMessage } from './helpers/rpc-service.js'; */

if (!parentPort) throw Error('RPC monitor must run in a worker');
let initialized = false;
/** @param {RpcMonitorMessage} message */
const watchReader = message => {
  if (initialized || message?.type !== 'WATCH_READER') {
    throw Error(`Unexpected RPC monitor message ${message?.type}`);
  }
  initialized = true;
  const lifecycle = makeRpcLifecycle(message.lifecycle);
  const lease = message.lease;
  lease.on('close', () => {
    if (!lifecycle.isClosed()) lifecycle.fail('RPC input worker disappeared');
    parentPort?.close();
  });
  lease.start();
};
parentPort.on('message', watchReader);
