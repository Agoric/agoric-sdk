// @ts-check
import { Far } from '@endo/far';
import { makeReadlineLoop } from './read-fd-lines.js';
import { makeJsonRPCInterceptor } from './interceptor.js';
import stableStringify from './json-stable-stringify.js';
import {
  DEFAULT_BUFFER_SIZE,
  makeTextEncoder,
  makeTextDecoder,
  makeTransferClient,
  makeTransferServer,
} from './sync-xfer.js';

const debug = (..._args) => {}; // console.error(..._args);

/**
 * @param {import('worker_threads').MessagePort} parent
 */
export const makeInputWorkerHandler = parent => {
  /** @type {ReturnType<makeJsonRPCInterceptor>} */
  let intercept;
  return data => {
    debug('message handler received', data);
    switch (data && data.type) {
      case 'INIT_LOOP': {
        const { fd } = data;
        if (intercept) {
          throw Error('Already initialized');
        }
        intercept = makeJsonRPCInterceptor(obj =>
          parent.postMessage({ type: 'RECV_OBJ', fd, obj }),
        );
        makeReadlineLoop(fd, intercept.handler)
          .then(intercept.resolve, intercept.reject)
          .finally(() => parent.postMessage({ type: 'FINISH_LOOP', fd }));
        break;
      }

      case 'INTERCEPT_ID': {
        /** @type {{ id: number, buf: Int32Array }} */
        const { id, buf } = data;
        const xferServer = makeTransferServer(buf);
        const interceptor = obj => {
          debug('intercepted id', id, obj);
          xferServer.write(makeTextEncoder(stableStringify(obj)));
        };

        xferServer.prepareToWrite(() => intercept.interceptId(id, interceptor));
        break;
      }

      default: {
        // do nothing
        break;
      }
    }
  };
};

/**
 *
 * @param {import('worker_threads').Worker} worker
 * @param {number | string} fd
 * @param {(obj: any) => void} dispatch
 * @param {number} [bufferSize]
 */
export const makeJsonRpcService = (
  worker,
  fd,
  dispatch,
  bufferSize = DEFAULT_BUFFER_SIZE,
) => {
  /** @type {{ resolve: () => void, reject: (reason: any) => void}} */
  let finishedSettler;
  /** @type {Promise<void>} */
  const finishedP = new Promise(
    (resolve, reject) => (finishedSettler = harden({ resolve, reject })),
  );
  worker.on('message', obj => {
    debug('host received', obj);
    switch (obj && obj.type) {
      case 'RECV_OBJ': {
        dispatch(obj.obj);
        break;
      }

      case 'FINISH_LOOP': {
        debug('worker finished', obj);
        finishedSettler.resolve();
        break;
      }

      default: {
        // do nothing
        break;
      }
    }
  });

  const xferClient = makeTransferClient(new SharedArrayBuffer(bufferSize));
  return Far('jsonRpcService', {
    start() {
      worker.postMessage({ type: 'INIT_LOOP', fd });
      return finishedP;
    },
    stop(reason) {
      worker
        .terminate()
        .catch(err => console.error('input-worker terminated with', err));
      finishedSettler.reject(reason);
    },
    makeReplyWakeup(id) {
      xferClient.prepareToRead(buf =>
        worker.postMessage({ type: 'INTERCEPT_ID', id, buf }),
      );
      return {
        wait() {
          const s = xferClient.read(makeTextDecoder());
          return JSON.parse(s);
        },
      };
    },
  });
};
