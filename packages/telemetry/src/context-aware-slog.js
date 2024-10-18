import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';

/**
 * @typedef {Partial<{
 *    block: Partial<{
 *      height: number;
 *      time: number;
 *    }>;
 *    crank: Partial<{
 *      num: bigint;
 *      type: string;
 *    }>;
 *    init: boolean;
 *    replay: boolean;
 *    run: Partial<{
 *      id: string;
 *      trigger: Partial<{
 *        blockHeight: number;
 *        msgIdx: number;
 *        sender: string;
 *        source: string;
 *        time: number;
 *        txHash: string;
 *        type: string;
 *      }>
 *    }>;
 *  }>
 * } Context
 */

const FILE_PATH = 'slogs-temp.log';

const SLOG_TYPES = {
  CRANK: {
    RESULT: 'crank-result',
    START: 'crank-start',
  },
  KERNEL: {
    INIT: {
      FINISH: 'kernel-init-finish',
      START: 'kernel-init-start',
    },
  },
  REPLAY: {
    FINISH: 'finish-replay',
    START: 'start-replay',
  },
  SWINGSET: {
    AFTER_COMMIT_STATS: 'cosmic-swingset-after-commit-stats',
    BEGIN_BLOCK: 'cosmic-swingset-begin-block',
    BOOTSTRAP_BLOCK: {
      FINISH: 'cosmic-swingset-bootstrap-block-finish',
      START: 'cosmic-swingset-bootstrap-block-start',
    },
    BRIDGE_INBOUND: 'cosmic-swingset-bridge-inbound',
    COMMIT: {
      FINISH: 'cosmic-swingset-commit-finish',
      START: 'cosmic-swingset-commit-start',
    },
    DELIVER_INBOUND: 'cosmic-swingset-deliver-inbound',
    END_BLOCK: {
      FINISH: 'cosmic-swingset-end-block-finish',
      START: 'cosmic-swingset-end-block-start',
    },
  },
};

const stringify = data =>
  JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value,
  );

/**
 *
 * @param {{env: typeof process.env}} options
 */
export const makeSlogSender = async ({ env: _ }) => {
  const stream = await makeFsStreamWriter(FILE_PATH);

  if (!stream) {
    return undefined;
  }

  /** @type Array<Context | null> */
  let [blockContext, crankContext, initContext, replayContext, triggerContext] =
    [null, null, null, null, null];

  /**
   *
   * @param {{
   *  blockHeight?: number;
   *  blockTime?: number;
   *  crankNum?: bigint;
   *  crankType?: string;
   *  inboundNum?: string;
   *  monotime: number;
   *  sender?: string;
   *  source?: string;
   *  time: number;
   *  type: string;
   * }} slog
   */
  const slogSender = async ({
    monotime,
    time: timestamp,
    type: slogType,
    ...body
  }) => {
    await Promise.resolve();

    let [afterProcessed, beforeProcessed] = [true, true];

    /**
     * Add any before report operations here
     * like setting context data
     */
    switch (slogType) {
      case SLOG_TYPES.CRANK.START: {
        crankContext = {
          crank: { num: body.crankNum, type: body.crankType },
        };
        break;
      }
      case SLOG_TYPES.KERNEL.INIT.START: {
        initContext = { init: true };
        break;
      }
      case SLOG_TYPES.REPLAY.START: {
        replayContext = { replay: true };
        break;
      }
      case SLOG_TYPES.SWINGSET.BEGIN_BLOCK: {
        blockContext = {
          block: {
            height: body.blockHeight,
            time: body.blockTime,
          },
        };
        break;
      }
      case SLOG_TYPES.SWINGSET.BOOTSTRAP_BLOCK.START: {
        blockContext = {
          block: {
            height: body.blockHeight || 0,
            time: body.blockTime,
          },
        };
        triggerContext = {
          run: {
            id: `bootstrap-${body.blockTime}`,
            trigger: {
              time: body.blockTime,
              type: 'bootstrap',
            },
          },
        };
        break;
      }
      case SLOG_TYPES.SWINGSET.BRIDGE_INBOUND:
      case SLOG_TYPES.SWINGSET.DELIVER_INBOUND: {
        const [blockHeight, txHash, msgIdx] = (body.inboundNum || '').split('');
        const triggerType = slogType.split('-')[2];

        triggerContext = {
          run: {
            id: `${triggerType}-${body.inboundNum}`,
            trigger: {
              blockHeight: Number(blockHeight),
              msgIdx: Number(msgIdx),
              sender: body.sender,
              source: body.source,
              time: body.blockTime,
              txHash,
              type: triggerType,
            },
          },
        };
        break;
      }
      case SLOG_TYPES.SWINGSET.COMMIT.FINISH:
      case SLOG_TYPES.SWINGSET.COMMIT.START:
      case SLOG_TYPES.SWINGSET.END_BLOCK.FINISH: {
        assert(!!blockContext);
        break;
      }
      case SLOG_TYPES.SWINGSET.END_BLOCK.START: {
        assert(!!blockContext);
        break;
      }
      default:
        beforeProcessed = false;
    }

    const finalSlog = {
      body,
      context: {
        ...blockContext,
        ...crankContext,
        ...initContext,
        ...replayContext,
        ...triggerContext,
      },
      process: { uptime: monotime },
      timestamp,
      type: slogType,
    };

    /**
     * Add any after report operations here
     * like resetting context data
     */
    switch (slogType) {
      case SLOG_TYPES.CRANK.RESULT: {
        crankContext = null;
        break;
      }
      case SLOG_TYPES.KERNEL.INIT.FINISH: {
        initContext = null;
        break;
      }
      case SLOG_TYPES.REPLAY.START: {
        replayContext = null;
        break;
      }
      case SLOG_TYPES.SWINGSET.AFTER_COMMIT_STATS: {
        blockContext = null;
        break;
      }
      case SLOG_TYPES.SWINGSET.BOOTSTRAP_BLOCK.FINISH: {
        blockContext = null;
        break;
      }
      case SLOG_TYPES.SWINGSET.END_BLOCK.START: {
        // TODO: restore the trigger context here
        break;
      }
      default:
        afterProcessed = false;
    }

    if (afterProcessed || beforeProcessed)
      await stream.write(`${stringify(finalSlog)}\n`);
    else console.log(`Unexpected slog type: ${slogType}`);
  };

  return slogSender;
};
