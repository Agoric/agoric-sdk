/* eslint-env node */
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { readFile, writeFile } from 'fs';
import { dirSync } from 'tmp';
import { getResourceAttributes } from './index.js';

/**
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
 *    'run.num': string | null;
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
 *  'chain-id': string;
 *  'crank.syscallNum'?: Slog['syscallNum'];
 *  'process.uptime': Slog['monotime'];
 *  timestamp: Slog['time'];
 * } & Context} LogAttributes
 *
 * @typedef {{env: typeof process.env; stateDir: string;}} Options
 *
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
 */

const FILE_ENCODING = 'utf8';

const SLOG_TYPES = {
  CLIST: 'clist',
  CONSOLE: 'console',
  COSMIC_SWINGSET: {
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
    // eslint-disable-next-line no-restricted-syntax
    RUN: {
      FINISH: 'cosmic-swingset-run-finish',
      START: 'cosmic-swingset-run-start',
    },
  },
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
  SYSCALL: 'syscall',
  SYSCALL_RESULT: 'syscall-result',
};

/**
 * @param {string} filePath
 */
export const getContextFilePersistenceUtils = async filePath => {
  console.log(`Using file ${filePath} for slogger`);

  return {
    /**
     * @param {Context} context
     * @returns {Promise<null>}
     */
    persistContext: context =>
      new Promise(resolve =>
        writeFile(filePath, JSON.stringify(context), FILE_ENCODING, err => {
          if (err) console.warn('Error writing context to file: ', err);
          resolve(null);
        }),
      ),

    /**
     * @returns {Promise<Context | null>}
     */
    restoreContext: () =>
      new Promise(resolve =>
        readFile(filePath, FILE_ENCODING, (err, data) => {
          if (!err) {
            try {
              resolve(JSON.parse(data));
            } catch (parseErr) {
              err = parseErr;
            }
          }

          if (err) {
            console.warn('Error reading context from file: ', err);
            return resolve(null);
          }
        }),
      ),
  };
};

const stringify = data =>
  JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value,
  );

/**
 * @param {(log: import('@opentelemetry/api-logs').LogRecord) => void} emitLog
 * @param {Options} options
 * @param {Partial<{ persistContext: (context: Context) => Promise<null>; restoreContext: () => Promise<Context | null>; }>} persistenceUtils
 */
export const logCreator = (emitLog, options, persistenceUtils) => {
  const { CHAIN_ID } = options.env;

  /** @type Array<Context | null> */
  let [
    blockContext,
    crankContext,
    initContext,
    lastPersistedTriggerContext,
    replayContext,
    triggerContext,
  ] = [null, null, null, null, null, null];

  /**
   * @param {Context} context
   */
  const persistContext = context => {
    lastPersistedTriggerContext = context;
    return persistenceUtils.persistContext?.(context);
  };

  const restoreContext = async () => {
    await Promise.resolve();

    if (!lastPersistedTriggerContext)
      lastPersistedTriggerContext =
        (await persistenceUtils.restoreContext?.()) || null;
    return lastPersistedTriggerContext;
  };

  /**
   * @param {Slog} slog
   */
  const slogSender = async ({ monotime, time: timestamp, ...body }) => {
    await Promise.resolve();

    const finalBody = { ...body };

    /** @type {{'crank.syscallNum'?: Slog['syscallNum']}} */
    const eventLogAttributes = {};

    /**
     * Add any before report operations here
     * like setting context data
     */
    switch (body.type) {
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
          assert(!!crankContext && !finalBody.replay);
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
      case SLOG_TYPES.COSMIC_SWINGSET.AFTER_COMMIT_STATS: {
        assert(!!blockContext);
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BEGIN_BLOCK: {
        blockContext = {
          'block.height': finalBody.blockHeight,
          'block.time': finalBody.blockTime,
        };
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.FINISH: {
        assert(!!blockContext);
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.START: {
        blockContext = {
          'block.height': finalBody.blockHeight || 0,
          'block.time': finalBody.blockTime,
        };
        triggerContext = {
          'run.num': null,
          'run.id': `bootstrap-${finalBody.blockTime}`,
          'run.trigger.type': 'bootstrap',
          'run.trigger.time': finalBody.blockTime,
        };
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BRIDGE_INBOUND:
      case SLOG_TYPES.COSMIC_SWINGSET.DELIVER_INBOUND: {
        const [blockHeight, txHash, msgIdx] = (
          finalBody.inboundNum || ''
        ).split('-');
        const [, triggerType] =
          /cosmic-swingset-([^-]+)-inbound/.exec(body.type) || [];

        triggerContext = {
          'run.num': null,
          'run.id': `${triggerType}-${finalBody.inboundNum}`,
          'run.trigger.type': triggerType,
          'run.trigger.source': finalBody.source,
          'run.trigger.sender': finalBody.sender,
          'run.trigger.blockHeight': Number(blockHeight),
          'run.trigger.txHash': txHash,
          'run.trigger.msgIdx': Number(msgIdx),
        };
        await persistContext(triggerContext);
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.COMMIT.FINISH:
      case SLOG_TYPES.COSMIC_SWINGSET.COMMIT.START:
      case SLOG_TYPES.COSMIC_SWINGSET.END_BLOCK.FINISH: {
        assert(!!blockContext);
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.END_BLOCK.START: {
        assert(!!blockContext);
        break;
      }
      // eslint-disable-next-line no-restricted-syntax
      case SLOG_TYPES.COSMIC_SWINGSET.RUN.START: {
        if (!triggerContext && finalBody.runNum !== 0) {
          assert(!!blockContext);
          // TBD: add explicit slog events of both timer poll and install bundle
          triggerContext = {
            'run.num': null,
            'run.id': `timer-${finalBody.blockHeight}`,
            'run.trigger.type': 'timer',
            'run.trigger.time': blockContext['block.time'],
          };
          await persistContext(triggerContext);
        }

        if (!triggerContext) triggerContext = {};
        triggerContext['run.num'] = `${finalBody.runNum}`;

        break;
      }
      case SLOG_TYPES.SYSCALL:
      case SLOG_TYPES.SYSCALL_RESULT: {
        eventLogAttributes['crank.syscallNum'] = finalBody.syscallNum;

        delete finalBody.deliveryNum;
        delete finalBody.replay;
        delete finalBody.syscallNum;

        break;
      }
      default:
        // All other log types are logged as is (using existing contexts) without
        // any change to the slogs or any contributions to the contexts. This also
        // means that any unexpected slog type will pass through. To fix that, add
        // all remaining cases of expected slog types above with a simple break
        // statement and log a warning here
        break;
    }

    /** @type {LogAttributes} */
    const logAttributes = {
      'chain-id': String(CHAIN_ID),
      'process.uptime': monotime,
      ...initContext, // Optional prelude
      ...blockContext, // Block is the first level of execution nesting
      ...triggerContext, // run and trigger info is nested next
      ...crankContext, // Finally cranks are the last level of nesting
      ...replayContext, // Replay is a substitute for crank context during vat page in
      ...eventLogAttributes,
      timestamp,
    };

    emitLog({
      attributes: JSON.parse(stringify(logAttributes)),
      body: JSON.parse(stringify(finalBody)),
      severityNumber: SeverityNumber.INFO,
    });

    /**
     * Add any after report operations here
     * like resetting context data
     */
    switch (body.type) {
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
      // eslint-disable-next-line no-restricted-syntax
      case SLOG_TYPES.COSMIC_SWINGSET.RUN.FINISH: {
        triggerContext = null;
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.AFTER_COMMIT_STATS: {
        blockContext = null;
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.BOOTSTRAP_BLOCK.FINISH: {
        blockContext = null;
        break;
      }
      case SLOG_TYPES.COSMIC_SWINGSET.END_BLOCK.START: {
        triggerContext = await restoreContext();
        break;
      }
      default:
        break;
    }
  };

  return slogSender;
};

/**
 * @param {Options} options
 */
export const makeSlogSender = async options => {
  const { OTEL_EXPORTER_OTLP_ENDPOINT } = options.env;
  if (!OTEL_EXPORTER_OTLP_ENDPOINT)
    return console.warn(
      'Ignoring invocation of slogger "context-aware-slog" without the presence of "OTEL_EXPORTER_OTLP_ENDPOINT" envrionment variable',
    );

  const loggerProvider = new LoggerProvider({
    resource: new Resource(getResourceAttributes(options)),
  });
  const logRecordProcessor = new SimpleLogRecordProcessor(
    new OTLPLogExporter({ keepAlive: true }),
  );

  loggerProvider.addLogRecordProcessor(logRecordProcessor);

  logs.setGlobalLoggerProvider(loggerProvider);
  const logger = logs.getLogger('default');

  const persistenceUtils = await getContextFilePersistenceUtils(
    process.env.SLOG_CONTEXT_FILE_PATH ||
      `${options.stateDir || dirSync({ prefix: 'slog-context' }).name}/slog-context.json`,
  );

  const slogSender = logCreator(
    logRecord => logger.emit(logRecord),
    options,
    persistenceUtils,
  );

  return Object.assign(slogSender, {
    forceFlush: () => logRecordProcessor.forceFlush(),
    shutdown: () =>
      logRecordProcessor.forceFlush().then(logRecordProcessor.shutdown),
  });
};
