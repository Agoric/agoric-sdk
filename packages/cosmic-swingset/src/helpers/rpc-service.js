// @ts-check
import { MessageChannel } from 'node:worker_threads';
import { makePromiseKit } from '@endo/promise-kit';
import { makeRpcLifecycle } from './rpc-lifecycle.js';
import stringify from './json-stable-stringify.js';
import {
  DEFAULT_BUFFER_SIZE,
  makeTransferClient,
  makeTextDecoder,
} from './sync-xfer.js';

/**
 * Main-thread RPC service. Only the reader worker touches input and transfers.
 * @import { Worker, MessagePort } from 'node:worker_threads';
 * @typedef {{ type: 'INIT_LOOP', fd: number, lifecycle: SharedArrayBuffer, lease: MessagePort } |
 *   { type: 'INTERCEPT_ID', id: number, buf: SharedArrayBuffer } |
 *   { type: 'STOP_LOOP' }} RpcParentMessage
 * @typedef {{ method: string, params: unknown[], id: number }} RpcRequest
 * @typedef {{ id: number, result: unknown, error: unknown }} RpcReply
 * @typedef {{ type: 'RECV_OBJ', obj: RpcRequest } |
 *   { type: 'FINISH_LOOP', error: string | null }} RpcWorkerMessage
 * @typedef {{ type: 'WATCH_READER', lifecycle: SharedArrayBuffer, lease: MessagePort }} RpcMonitorMessage
 */
export const VM_SHUTDOWN_METHOD = 'agvm.Shutdown';

/**
 * @param {Worker} worker
 * @param {number} fd
 * @param {(request: RpcRequest) => void} dispatch
 * @param {{ write: (text: string) => void, makeMonitor: () => Worker, bufferSize?: number }} io
 */
export const makeJsonRpcService = (worker, fd, dispatch, io) => {
  const lifecycle = makeRpcLifecycle();
  const transfer = makeTransferClient(
    new SharedArrayBuffer(io.bufferSize || DEFAULT_BUFFER_SIZE),
    lifecycle,
  );
  const completion = makePromiseKit();
  // Completion may reject while a synchronous caller is unwinding its stack.
  void completion.promise.catch(() => {});
  const pendingInbound = new Set();
  let started = false;
  let settled = false;
  let activeCall = false;
  let lastRequestId = 0;
  /** @type {Worker | undefined} */
  let monitor;
  const terminateWorkers = async () => {
    await Promise.all([worker.terminate(), monitor?.terminate()]);
  };
  const fail = reason => {
    if (settled) return;
    settled = true;
    lifecycle.fail(reason);
    pendingInbound.clear();
    completion.reject(reason instanceof Error ? reason : Error(String(reason)));
    void terminateWorkers().catch(() => {});
  };
  const assertRunning = () => {
    lifecycle.check();
    if (!started || settled || lifecycle.isStopping())
      throw Error('RPC service is not running');
  };
  const writeRecord = record => {
    lifecycle.check();
    io.write(`${stringify(record)}\n`);
  };
  const beginShutdown = () => {
    assertRunning();
    if (activeCall || pendingInbound.size)
      throw Error('RPC shutdown with outstanding calls');
    if (!lifecycle.beginShutdown()) throw Error('RPC shutdown already started');
  };
  const requestStop = () => worker.postMessage({ type: 'STOP_LOOP' });
  /** @param {RpcWorkerMessage} message */
  const receiveWorkerMessage = message => {
    if (settled) return;
    try {
      switch (message?.type) {
        case 'RECV_OBJ': {
          assertRunning();
          const request = message.obj;
          if (
            !request ||
            typeof request.method !== 'string' ||
            !Number.isSafeInteger(request.id) ||
            request.id < 0 ||
            !Array.isArray(request.params)
          ) {
            throw Error(`Malformed RPC request ${stringify(request)}`);
          }
          if (request.method === VM_SHUTDOWN_METHOD) {
            beginShutdown();
            writeRecord({ id: request.id, result: '<shutdown>', error: null });
            requestStop();
          } else {
            if (pendingInbound.has(request.id))
              throw Error(`Duplicate inbound RPC ID ${request.id}`);
            pendingInbound.add(request.id);
            dispatch(request);
          }
          break;
        }
        case 'FINISH_LOOP': {
          if (message.error !== null) throw Error(message.error);
          if (!lifecycle.isClosed() || activeCall || pendingInbound.size)
            throw Error('Unexpected RPC worker completion');
          settled = true;
          void terminateWorkers().then(
            () => completion.resolve(undefined),
            completion.reject,
          );
          break;
        }
        default:
          throw Error(`Unknown RPC parent message ${stringify(message)}`);
      }
    } catch (error) {
      fail(error);
    }
  };
  worker.on('message', receiveWorkerMessage);
  worker.on('messageerror', fail);
  worker.on('error', fail);
  worker.on('exit', code => {
    if (!settled) fail(Error(`RPC input worker exited (${code})`));
  });
  return harden({
    start() {
      if (started || settled)
        throw Error(
          'RPC service may only be started once and cannot restart after failure',
        );
      started = true;
      try {
        monitor = io.makeMonitor();
        monitor.on('error', fail);
        monitor.on('messageerror', fail);
        monitor.on('exit', code => {
          if (!settled && !lifecycle.isClosed())
            fail(Error(`RPC lifetime monitor exited (${code})`));
        });
        const { port1, port2 } = new MessageChannel();
        monitor.postMessage(
          { type: 'WATCH_READER', lifecycle: lifecycle.buffer, lease: port1 },
          [port1],
        );
        worker.postMessage(
          { type: 'INIT_LOOP', fd, lifecycle: lifecycle.buffer, lease: port2 },
          [port2],
        );
      } catch (error) {
        fail(error);
      }
      return completion.promise;
    },
    close() {
      if (settled || lifecycle.isStopping()) return completion.promise;
      try {
        beginShutdown();
        requestStop();
      } catch (error) {
        fail(error);
      }
      return completion.promise;
    },
    stop(reason) {
      fail(reason);
      return completion.promise;
    },
    /**
     * @param {string} method
     * @param {unknown[]} params
     * @returns {RpcReply}
     */
    call(method, params) {
      assertRunning();
      if (activeCall) throw Error('Overlapping synchronous RPC calls');
      activeCall = true;
      lastRequestId += 1;
      const id = lastRequestId;
      try {
        if (!Number.isSafeInteger(id)) throw Error('RPC request ID exhausted');
        transfer.prepareToRead(buf =>
          worker.postMessage({ type: 'INTERCEPT_ID', id, buf }),
        );
        writeRecord({ method, params, id });
        const reply = JSON.parse(transfer.read(makeTextDecoder()));
        if (
          !reply ||
          typeof reply !== 'object' ||
          Array.isArray(reply) ||
          reply.id !== id ||
          !(
            (reply.error === null && typeof reply.result === 'string') ||
            (typeof reply.error === 'string' && reply.result === null)
          )
        ) {
          throw Error(
            `RPC reply ${id} must have the expected ID and a string result or string error`,
          );
        }
        return reply;
      } catch (error) {
        fail(error);
        throw error;
      } finally {
        activeCall = false;
      }
    },
    /**
     * @param {number} id
     * @param {string | null} result
     * @param {string | null} error
     */
    reply(id, result, error = null) {
      if (settled || !pendingInbound.delete(id)) return false;
      try {
        writeRecord({ id, result, error });
        return true;
      } catch (reason) {
        fail(reason);
        return false;
      }
    },
  });
};
