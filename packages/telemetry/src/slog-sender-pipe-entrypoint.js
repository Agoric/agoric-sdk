/* eslint-env node */
import '@endo/init';

import anylogger from 'anylogger';
import { makeShutdown } from '@agoric/internal/src/node/shutdown.js';

import { makeSlogSender } from './make-slog-sender.js';

const logger = anylogger('slog-sender-pipe-entrypoint');

/** @type {(msg: import('./slog-sender-pipe.js').SlogSenderPipeWaitReplies) => void} */
const send = Function.prototype.bind.call(process.send, process);

/**
 * @typedef {object} InitMessage
 * @property {'init'} type
 * @property {import('./index.js').MakeSlogSenderOptions} options
 */
/**
 * @typedef {object} SendMessage
 * @property {'send'} type
 * @property {object} obj
 */
/**
 * @typedef {object} FlushMessage
 * @property {'flush'} type
 */
/** @typedef {InitMessage | FlushMessage} SlogSenderPipeWaitMessages */
/** @typedef {SlogSenderPipeWaitMessages | SendMessage } SlogSenderPipeMessages */

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
    if (slogSender) {
      assert.fail('Already initialized');
    }

    slogSender = await makeSlogSender({
      ...otherOpts,
      env: Object.assign(Object.create(process.env), env),
    });

    return !!slogSender;
  };

  const flush = async () => {
    if (!slogSender) {
      assert.fail('No sender available');
    }

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

  process.on(
    'message',
    /** @param {SlogSenderPipeMessages} msg */ msg => {
      if (!msg || typeof msg !== 'object') {
        logger.warn('received invalid message', msg);
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
            logger.warn('received send with no sender available');
          } else {
            try {
              slogSender(msg.obj);
            } catch (e) {
              sendErrors.push(e);
            }
          }
          break;
        }
        default: {
          // @ts-expect-error exhaustive type check
          logger.warn('received unknown message type', msg.type);
        }
      }
    },
  );
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
