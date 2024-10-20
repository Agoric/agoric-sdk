/* eslint-disable no-restricted-syntax */
import { makeFsStreamWriter } from '@agoric/internal/src/node/fs-stream.js';

/**
 * @typedef {{
 *  blockHeight?: number;
 *  blockTime?: number;
 *  crankNum?: bigint;
 *  crankType?: string;
 *  deliveryNum?: bigint;
 *  inboundNum?: string;
 *  monotime: number;
 *  replay?: boolean;
 *  runNum?: number;
 *  sender?: string;
 *  source?: string;
 *  syscallNum?: number;
 *  time: number;
 *  type: string;
 *  vatID?: string;
 * }} Slog
 *
 * @typedef {Partial<{
 *    'block.height': Slog['blockHeight'];
 *    'block.time': Slog['blockTime'];
 *    'crank.deliveryNum': Slog['deliveryNum'];
 *    'crank.num': Slog['crankNum'];
 *    'crank.type': Slog['crankType'];
 *    'crank.vatID': Slog['vatID'];
 *    init: boolean;
 *    replay: boolean;
 *    'run.id': string;
 *    'run.num': string;
 *    'run.trigger.blockHeight': Slog['blockHeight'];
 *    'run.trigger.msgIdx': number;
 *    'run.trigger.sender': Slog['sender'];
 *    'run.trigger.source': Slog['source'];
 *    'run.trigger.time': Slog['blockTime'];
 *    'run.trigger.txHash': string;
 *    'run.trigger.type': string;
 *  }>
 * } Context
 *
 * @typedef {{
 *  'crank.syscallNum'?: Slog['syscallNum'];
 *  'process.uptime': Slog['monotime'];
 *  timestamp: Slog['time'];
 * } & Context & Partial<Slog>} ReportedSlog
 */

const FILE_PATH = 'slogs-temp.log';

const SLOG_TYPES = {
  CLIST: 'clist',
  CONSOLE: 'console',
  CRANK: {
    RESULT: 'crank-result',
    START: 'crank-start',
  },
  DELIVER: 'deliver',
  DELIVER_RESULT: 'deliver-result',
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
  RUN: {
    FINISH: 'cosmic-swingset-run-finish',
    START: 'cosmic-swingset-run-start',
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
  SYSCALL: 'syscall',
  SYSCALL_RESULT: 'syscall-result',
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
   * @param {Slog} slog
   */
  const slogSender = async ({
    monotime,
    time: timestamp,
    type: slogType,
    ...body
  }) => {
    await Promise.resolve();

    let [afterProcessed, beforeProcessed] = [true, true];

    /** @type ReportedSlog */
    const extractedFields = { 'process.uptime': monotime, timestamp };
    const finalBody = { ...body };

    /**
     * Add any before report operations here
     * like setting context data
     */
    switch (slogType) {
      case SLOG_TYPES.CONSOLE: {
        delete finalBody.crankNum;
        delete finalBody.deliveryNum;

        break;
      }
      case SLOG_TYPES.CLIST: {
        assert(!!crankContext);
        crankContext['crank.vatID'] = finalBody.vatID;
        break;
      }
      case SLOG_TYPES.CRANK.START: {
        crankContext = {
          'crank.num': finalBody.crankNum,
          'crank.type': finalBody.crankType,
        };
        break;
      }
      case SLOG_TYPES.DELIVER: {
        if (replayContext) {
          assert(finalBody.replay);
          replayContext = {
            ...replayContext,
            'crank.deliveryNum': finalBody.deliveryNum,
            'crank.vatID': finalBody.vatID,
          };
        } else {
          assert(!!crankContext);
          crankContext = {
            ...crankContext,
            'crank.deliveryNum': finalBody.deliveryNum,
            'crank.vatID': finalBody.vatID,
          };
        }

        delete finalBody.deliveryNum;
        delete finalBody.replay;

        break;
      }
      case SLOG_TYPES.DELIVER_RESULT: {
        delete finalBody.deliveryNum;
        delete finalBody.replay;

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
      case SLOG_TYPES.RUN.START: {
        if (!(triggerContext || finalBody.runNum === 0))
          // TBD: add explicit slog events of both timer poll and install bundle
          triggerContext = {
            'run.id': `timer-${finalBody.blockHeight}`,
            'run.trigger.time': finalBody.blockTime,
            'run.trigger.type': 'timer',
          };
        // TODO: Persist this context

        if (!triggerContext) triggerContext = {};
        triggerContext = {
          ...triggerContext,
          'run.num': `${finalBody.runNum}`,
        };

        break;
      }
      case SLOG_TYPES.SWINGSET.BEGIN_BLOCK: {
        blockContext = {
          'block.height': finalBody.blockHeight,
          'block.time': finalBody.blockTime,
        };
        break;
      }
      case SLOG_TYPES.SWINGSET.BOOTSTRAP_BLOCK.START: {
        blockContext = {
          'block.height': finalBody.blockHeight || 0,
          'block.time': finalBody.blockTime,
        };
        triggerContext = {
          'run.id': `bootstrap-${finalBody.blockTime}`,
          'run.trigger.time': finalBody.blockTime,
          'run.trigger.type': 'bootstrap',
        };
        break;
      }
      case SLOG_TYPES.SWINGSET.BRIDGE_INBOUND:
      case SLOG_TYPES.SWINGSET.DELIVER_INBOUND: {
        const [blockHeight, txHash, msgIdx] = (
          finalBody.inboundNum || ''
        ).split('-');
        const triggerType = slogType.split('-')[2];

        triggerContext = {
          'run.id': `${triggerType}-${finalBody.inboundNum}`,
          'run.trigger.blockHeight': Number(blockHeight),
          'run.trigger.msgIdx': Number(msgIdx),
          'run.trigger.sender': finalBody.sender,
          'run.trigger.source': finalBody.source,
          'run.trigger.time': finalBody.blockTime,
          'run.trigger.txHash': txHash,
          'run.trigger.type': triggerType,
        };
        // TODO: Persist this context
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
      case SLOG_TYPES.SYSCALL:
      case SLOG_TYPES.SYSCALL_RESULT: {
        extractedFields['crank.syscallNum'] = finalBody.syscallNum;

        delete finalBody.deliveryNum;
        delete finalBody.replay;
        delete finalBody.syscallNum;

        break;
      }
      default:
        beforeProcessed = false;
    }

    /** @type ReportedSlog */
    const finalSlog = {
      ...blockContext,
      ...crankContext,
      ...extractedFields,
      ...finalBody,
      ...initContext,
      ...replayContext,
      ...triggerContext,
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
      case SLOG_TYPES.REPLAY.FINISH: {
        replayContext = null;
        break;
      }
      case SLOG_TYPES.RUN.FINISH: {
        triggerContext = null;
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
