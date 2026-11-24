// @ts-check
import { makeRpcLifecycle } from './rpc-lifecycle.js';
import { makeTransferServer, makeTextEncoder } from './sync-xfer.js';
import stringify from './json-stable-stringify.js';

/**
 * Reader-thread protocol implementation. The entrypoint owns input IO.
 * @import { MessagePort } from 'node:worker_threads';
 * @import { RpcParentMessage } from './rpc-service.js';
 * @param {MessagePort} parent
 * @param {(fd: number, acceptLine: (line: string) => void, signal: AbortSignal) => Promise<void>} readInput
 */
export const makeRpcInputHandler = (parent, readInput) => {
  /** @type {ReturnType<typeof makeRpcLifecycle> | undefined} */
  let lifecycle;
  /** @type {{ id: number, transfer: ReturnType<typeof makeTransferServer> } | undefined} */
  let pendingReply;
  const cancellation = new AbortController();
  let started = false;
  /** @type {MessagePort | undefined} */
  let lease;
  let finished = false;
  const finish = reason => {
    if (finished) return;
    finished = true;
    pendingReply = undefined;
    if (reason !== undefined) lifecycle?.fail(reason);
    else if (!lifecycle?.finish()) lifecycle?.fail('Unexpected RPC input EOF');
    cancellation.abort();
    parent.postMessage({
      type: 'FINISH_LOOP',
      error: reason === undefined ? null : String(reason),
    });
    lease?.close();
    lease = undefined;
    parent.close();
  };
  const acceptLine = line => {
    const message = JSON.parse(line);
    if (
      message === null ||
      typeof message !== 'object' ||
      Array.isArray(message)
    ) {
      throw Error(`Malformed RPC input ${line}`);
    }
    if ('method' in message) {
      parent.postMessage({ type: 'RECV_OBJ', obj: message });
      return;
    }
    const pending = pendingReply;
    if (!pending || message.id !== pending.id) {
      throw Error(`Unexpected RPC response ID ${message.id}`);
    }
    pendingReply = undefined;
    pending.transfer.write(makeTextEncoder(stringify(message)));
  };
  /** @param {RpcParentMessage} message */
  return message => {
    try {
      switch (message?.type) {
        case 'INIT_LOOP': {
          if (started) throw Error('RPC input already started');
          started = true;
          lifecycle = makeRpcLifecycle(message.lifecycle);
          lease = message.lease;
          lease.on('close', () => {
            if (!finished) finish(Error('RPC lifetime monitor disappeared'));
          });
          lease.start();
          void readInput(message.fd, acceptLine, cancellation.signal).then(
            () => {
              if (!lifecycle?.isStopping() || pendingReply)
                finish(Error('Unexpected RPC input EOF'));
              else finish(undefined);
            },
            finish,
          );
          break;
        }
        case 'INTERCEPT_ID': {
          if (!started || finished || pendingReply)
            throw Error('Overlapping or inactive RPC reply registration');
          lifecycle?.check();
          const transfer = makeTransferServer(message.buf, lifecycle);
          transfer.prepareToWrite(() => {
            pendingReply = { id: message.id, transfer };
          });
          break;
        }
        case 'STOP_LOOP': {
          if (!started || pendingReply || !lifecycle?.isStopping())
            throw Error('RPC stop with pending calls or without shutdown');
          finish(undefined);
          break;
        }
        default:
          throw Error(`Unknown RPC worker message ${stringify(message)}`);
      }
    } catch (error) {
      if (!lifecycle) throw error;
      finish(error);
    }
  };
};
