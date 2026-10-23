// @ts-check
import { Fail } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { assertFileDescriptor } from './agcc-shim.js';
import stringify from './helpers/json-stable-stringify.js';
import { makeJsonRpcService } from './helpers/input-worker.js';

/**
 * @import { AgoricBridge, AgoricSender } from './agcc-shim.js';
 * @import { Worker } from 'node:worker_threads';
 * @typedef {{ method: string, id: number, params: [{ port: number, data: string, needsReply: boolean }] }} RPCRequest
 */

// Keep in sync with golang/cosmos/vm/client.go and server.go.
export const VM_RECEIVE_MESSAGE = 'agvm.ReceiveMessage';
export const AGD_RECEIVE_MESSAGE = 'agd.ReceiveMessage';
const NO_REPLY_REQUESTED = '<no-reply-requested>';

/**
 * Connect JS to a Go parent using explicit input/output file descriptors.
 * The entrypoint supplies only the IO needed by this connection.
 *
 * @param {number} inputFd
 * @param {number} outputFd
 * @param {{
 *   write: (fd: number, text: string) => void,
 *   makeInputWorker: () => Worker,
 *   onFinish: () => void,
 *   onError: (error: unknown) => void,
 * }} io
 * @returns {AgoricBridge}
 */
export const makeAgcc = (inputFd, outputFd, io) => {
  assertFileDescriptor(inputFd);
  assertFileDescriptor(outputFd);
  let started = false;
  /** @param {string} error */
  const defaultHandleError = harden(error =>
    stringify({ error: String(error) }),
  );

  return harden({
    start(handleMessage, argv) {
      !started || Fail`Agoric bridge may only be started once`;
      typeof handleMessage === 'function' ||
        Fail`handleMessage must be a function`;
      (Array.isArray(argv) &&
        argv.length > 0 &&
        [...argv].every(arg => typeof arg === 'string')) ||
        Fail`argv must be a nonempty array of strings`;
      started = true;

      /** @param {Record<string, unknown>} rpcMessage */
      const writeMessage = rpcMessage =>
        io.write(outputFd, `${stringify(rpcMessage)}\n`);

      /** @param {unknown} rpcMessage */
      const acceptRPCRequest = rpcMessage => {
        if (rpcMessage === null || typeof rpcMessage !== 'object') {
          throw Error(
            `unexpected RPC message ${String(rpcMessage)}, expected ${VM_RECEIVE_MESSAGE}`,
          );
        }
        const rpcRequest = /** @type {Partial<RPCRequest>} */ (rpcMessage);
        const { method, params, id } = rpcRequest;
        if (
          !(
            method === VM_RECEIVE_MESSAGE &&
            typeof id === 'number' &&
            Number.isSafeInteger(id) &&
            id >= 0 &&
            Array.isArray(params) &&
            params.length === 1 &&
            params[0] &&
            params[0].port === 1 &&
            typeof params[0].data === 'string' &&
            typeof params[0].needsReply === 'boolean'
          )
        ) {
          throw Fail`unexpected RPC message ${stringify(rpcRequest)}, expected ${VM_RECEIVE_MESSAGE}`;
        }
        const { port, data, needsReply } = params[0];
        const { promise, resolve, reject } = makePromiseKit();
        if (needsReply) {
          void promise.then(
            result => writeMessage({ id, result: String(result), error: null }),
            reason => writeMessage({ id, result: null, error: String(reason) }),
          );
        } else {
          // Go's net/rpc requires an acknowledgement even when no application
          // reply is needed, just as the native ClientCodec fabricates one.
          void promise.catch(() => {});
        }
        try {
          handleMessage(port, data, { resolve, reject });
        } catch (error) {
          reject(error);
        }
        if (!needsReply) {
          writeMessage({ id, result: NO_REPLY_REQUESTED, error: null });
        }
      };

      const rpcService = makeJsonRpcService(
        io.makeInputWorker(),
        inputFd,
        acceptRPCRequest,
      );
      void rpcService.start().then(io.onFinish, io.onError);
      let lastSendId = 0;
      /** @type {AgoricSender} */
      const sender = harden({
        send(port, messageJSON, opts = {}) {
          const { handleError = defaultHandleError } = opts;
          typeof handleError === 'function' ||
            Fail`handleError must be a function`;
          (Number.isInteger(port) && port > 0 && port <= 2 ** 31 - 1) ||
            Fail`invalid Go service port ${port}`;
          typeof messageJSON === 'string' || Fail`message must be a string`;
          lastSendId += 1;
          const id = lastSendId;
          Number.isSafeInteger(id) || Fail`RPC request ID exhausted`;
          const wakeup = rpcService.makeReplyWakeup(id);
          writeMessage({
            method: AGD_RECEIVE_MESSAGE,
            params: [{ port, data: messageJSON, needsReply: true }],
            id,
          });
          const reply = wakeup.wait();
          reply.id === id || Fail`Expected id ${id}, got ${reply.id}`;
          if (reply.error != null) {
            return handleError(String(reply.error));
          }
          typeof reply.result === 'string' ||
            Fail`RPC reply ${id} must have a string result`;
          return reply.result;
        },
      });
      return sender;
    },
  });
};
