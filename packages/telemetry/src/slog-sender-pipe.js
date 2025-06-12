/**
 * @file Export a `makeSlogSender` that spawns a
 *   {@link ./slog-sender-pipe-entrypoint.js} child process to which it forwards
 *   all slog entries via Node.js IPC with advanced (structured clone)
 *   serialization.
 *   https://nodejs.org/docs/latest/api/child_process.html#advanced-serialization
 */

import { fork } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import anylogger from 'anylogger';

import { q, Fail } from '@endo/errors';
import { makePromiseKit } from '@endo/promise-kit';
import { makeQueue } from '@endo/stream';

import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const logger = anylogger('slog-sender-pipe');

const sink = () => {};

/**
 * @template {any[]} T
 * @template R
 * @param {(...args: T) => Promise<R>} operation
 */
const withMutex = operation => {
  /** @type {import('@endo/stream').AsyncQueue<void>} */
  const mutex = makeQueue();
  mutex.put(Promise.resolve());
  /** @param {T} args */
  return async (...args) => {
    await mutex.get();
    const result = operation(...args);
    mutex.put(result.then(sink, sink));
    return result;
  };
};

/**
 * @template [P=unknown]
 * @typedef {{ type: string, error?: Error } & P} PipeReply
 */

/**
 * @typedef {{
 *   init: {
 *     message: import('./slog-sender-pipe-entrypoint.js').InitMessage;
 *     reply: PipeReply<{ hasSender: boolean }>;
 *   };
 *   flush: {
 *     message: import('./slog-sender-pipe-entrypoint.js').FlushMessage;
 *     reply: PipeReply<{}>;
 *   };
 * }} SlogSenderPipeAPI
 *
 * @typedef {keyof SlogSenderPipeAPI} PipeAPICommand
 * @typedef {SlogSenderPipeAPI[PipeAPICommand]["reply"]} PipeAPIReply
 */

/** @param {import('.').MakeSlogSenderOptions} options */
export const makeSlogSender = async options => {
  const { env = {} } = options;
  const { registerShutdown } = makeShutdown();

  const cp = fork(path.join(dirname, 'slog-sender-pipe-entrypoint.js'), [], {
    stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    serialization: 'advanced',
    env,
  });
  // logger.log('done fork');

  const exitKit = makePromiseKit();
  cp.on('error', error => {
    // An exit event *might* be coming, so wait a tick.
    setImmediate(() => exitKit.resolve({ error }));
  });
  cp.on('exit', (exitCode, signal) => {
    exitKit.resolve({ exitCode, signal });
  });

  /** @type {(msg: Record<string, unknown> & {type: string}) => Promise<void>} */
  const rawSend = promisify(cp.send.bind(cp));
  const pipeSend = withMutex(rawSend);

  /** @type {import('@endo/stream').AsyncQueue<PipeAPIReply>} */
  const sendWaitQueue = makeQueue();
  /** @type {PipeAPICommand | undefined} */
  let sendWaitType;

  const sendWaitReply = withMutex(
    /**
     * @template {PipeAPICommand} T
     * @param {T} type
     * @param {Omit<SlogSenderPipeAPI[T]["message"], 'type'>} payload
     * @returns {Promise<Omit<SlogSenderPipeAPI[T]["reply"], keyof PipeReply>>}
     */
    async (type, payload) => {
      !sendWaitType || Fail`Invalid mutex state`;

      const msg = { ...payload, type };

      sendWaitType = type;
      await null;
      try {
        await pipeSend(msg);
        /** @type {SlogSenderPipeAPI[T]["reply"]} */
        const reply = await sendWaitQueue.get();
        const { type: replyType, error, ...rest } = reply;
        replyType === `${type}Reply` ||
          Fail`Unexpected reply type ${q(replyType)}`;
        if (error) throw error;
        return rest;
      } finally {
        sendWaitType = undefined;
      }
    },
  );

  /** @param {PipeReply} msg */
  const onMessage = msg => {
    // logger.log('received', msg);
    if (!msg || msg.type !== `${sendWaitType}Reply`) {
      logger.warn('Received unexpected message', msg);
      return;
    }

    sendWaitQueue.put(msg);
  };
  cp.on('message', onMessage);

  const flush = async () => {
    await sendWaitReply('flush', {});
  };

  const shutdown = async () => {
    // logger.log('shutdown');
    if (!cp.connected) return;

    await flush();
    cp.disconnect();
    await exitKit.promise;
  };
  registerShutdown(shutdown);

  const { hasSender } = await sendWaitReply('init', { options }).catch(err => {
    cp.disconnect();
    throw err;
  });
  if (!hasSender) {
    cp.disconnect();
    return undefined;
  }

  const slogSender = obj => {
    void pipeSend({ type: 'send', obj }).catch(sink);
  };
  return Object.assign(slogSender, {
    forceFlush: flush,
    shutdown,
    usesJsonObject: false,
  });
};
