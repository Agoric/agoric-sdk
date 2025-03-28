/* eslint-env node */
/**
 * @file Run as a child process of {@link ./slog-sender-pipe.js} to isolate an
 *   aggregate slog sender (@see {@link ./make-slog-sender.js}). Communicates
 *   with its parent via Node.js IPC with advanced (structured clone)
 *   serialization.
 *   https://nodejs.org/docs/latest/api/child_process.html#advanced-serialization
 */

import '@endo/init';

import anylogger from 'anylogger';
import { Fail } from '@endo/errors';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

import { makeSlogSender } from './make-slog-sender.js';

const logger = anylogger('slog-sender-pipe-entrypoint');

/** @type {(msg: import('./slog-sender-pipe.js').PipeAPIReply) => void} */
const send = Function.prototype.bind.call(process.send, process);

/**
 * @typedef {{type: 'init', options: import('./index.js').MakeSlogSenderOptions }} InitMessage
 * @typedef {{type: 'flush' }} FlushMessage
 * @typedef {{type: 'send', obj: Record<string, unknown> }} SendMessage
 *
 * @typedef {InitMessage | FlushMessage} PipeAPIResponsefulMessage
 * @typedef {SendMessage} PipeAPIResponselessMessage
 * @typedef {PipeAPIResponsefulMessage | PipeAPIResponselessMessage} PipeAPIMessage
 */

const main = async () => {
  /** @type {import('./index.js').SlogSender | undefined} */
  let slogSender;

  const sendErrors = [];

  const { registerShutdown } = makeShutdown(false);

  registerShutdown(async () => {
    await slogSender?.forceFlush?.();
    await slogSender?.shutdown?.();
    process.disconnect?.();
  });

  /** @param {import('./index.js').MakeSlogSenderOptions} opts */
  const init = async ({ env, ...otherOpts } = {}) => {
    !slogSender || Fail`Already initialized`;

    slogSender = await makeSlogSender({
      ...otherOpts,
      env: Object.assign(Object.create(process.env), env),
    });

    return !!slogSender;
  };

  const flush = async () => {
    if (!slogSender) throw Fail`No sender available`;

    await slogSender.forceFlush?.();
  };

  /** @param {Error} [actualFlushError] */
  const generateFlushError = actualFlushError => {
    if (!sendErrors.length) {
      return actualFlushError;
    }

    if (actualFlushError) {
      sendErrors.unshift(actualFlushError);
    }

    return AggregateError(sendErrors.splice(0));
  };

  /** @param {PipeAPIMessage} msg */
  const onMessage = msg => {
    if (!msg || typeof msg !== 'object') {
      logger.warn('Received invalid message', msg);
      return;
    }

    switch (msg.type) {
      case 'init': {
        void init(msg.options).then(
          hasSender => {
            send({ type: 'initReply', hasSender });
          },
          error => {
            send({ type: 'initReply', hasSender: false, error });
          },
        );
        break;
      }
      case 'flush': {
        void flush().then(
          () => {
            send({ type: 'flushReply', error: generateFlushError() });
          },
          error => {
            send({ type: 'flushReply', error: generateFlushError(error) });
          },
        );
        break;
      }
      case 'send': {
        if (!slogSender) {
          logger.warn('Received send with no sender available');
        } else {
          try {
            slogSender(harden(msg.obj));
          } catch (e) {
            sendErrors.push(e);
          }
        }
        break;
      }
      default: {
        // @ts-expect-error exhaustive type check
        logger.warn('Received unknown message type', msg.type);
      }
    }
  };
  process.on('message', onMessage);
};

process.exitCode = 1;
main().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    logger.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
