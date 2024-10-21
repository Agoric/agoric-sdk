/* globals process */
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { Resource } from '@opentelemetry/resources';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import sqlite from 'better-sqlite3';
import { closeSync, existsSync, openSync } from 'fs';
import { getResourceAttributes } from './index.js';

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

const DATABASE_FILE_PATH =
  process.env.SLOG_CONTEXT_DATABASE_FILE_PATH || '/state/slog-db.sqlite3';
const DATABASE_TABLE_NAME = 'context';

const DATABASE_TYPES = {
  INTEGER: 'INTEGER',
  TEXT: 'TEXT',
};

const DATABASE_SCHEMA = {
  key: `${DATABASE_TYPES.TEXT} PRIMARY KEY`,
  'run.id': DATABASE_TYPES.TEXT,
  'run.num': DATABASE_TYPES.TEXT,
  'run.trigger.blockHeight': DATABASE_TYPES.INTEGER,
  'run.trigger.msgIdx': DATABASE_TYPES.INTEGER,
  'run.trigger.sender': DATABASE_TYPES.TEXT,
  'run.trigger.source': DATABASE_TYPES.TEXT,
  'run.trigger.time': DATABASE_TYPES.INTEGER,
  'run.trigger.txHash': DATABASE_TYPES.TEXT,
  'run.trigger.type': DATABASE_TYPES.TEXT,
};

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
  // eslint-disable-next-line no-restricted-syntax
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

const getDatabaseInstance = async () => {
  if (!existsSync(DATABASE_FILE_PATH))
    closeSync(openSync(DATABASE_FILE_PATH, 'w'));

  const databaseInstance = sqlite(DATABASE_FILE_PATH, { fileMustExist: true });
  databaseInstance.exec(
    `
      CREATE TABLE IF NOT EXISTS '${DATABASE_TABLE_NAME}'(
        ${Object.entries(DATABASE_SCHEMA)
          .map(([name, type]) => `[${name}] ${type}`)
          .join(',\n')}
      )
    `,
  );

  /**
   * @type {Array<{ cid: number; name: string; type: string; notnull: number; dflt_value: null; pk: number; }>}
   */
  // @ts-expect-error
  const rows = databaseInstance
    .prepare(`PRAGMA table_info('${DATABASE_TABLE_NAME}')`)
    .all();

  const existingColumns = rows.map(row => row.name);

  Object.entries(DATABASE_SCHEMA).map(
    ([name, type]) =>
      !existingColumns.includes(name) &&
      databaseInstance
        .prepare(`ALTER TABLE '${DATABASE_TABLE_NAME}' ADD [${name}] ${type}`)
        .run(),
  );

  return {
    /**
     *
     * @param {Context} context
     */
    persistContext: context => {
      /** @type {Array<string>} */
      const keys = [];
      const values = [];

      for (const [key, value] of Object.entries(context)) {
        keys.push(`[${key}]`);
        if (value === undefined) values.push(null);
        else
          values.push(
            DATABASE_SCHEMA[key].startsWith(DATABASE_TYPES.TEXT)
              ? `'${value}'`
              : value,
          );
      }

      databaseInstance
        .prepare(
          `INSERT OR REPLACE INTO '${DATABASE_TABLE_NAME}' (key, ${keys.join(', ')}) VALUES ('trigger-context', ${values.join(', ')})`,
        )
        .run();
    },

    restoreContext: () => {
      /**
       * @type {Context | undefined}
       */
      // @ts-expect-error
      const row = databaseInstance
        .prepare(
          `SELECT * FROM '${DATABASE_TABLE_NAME}' WHERE key = 'trigger-context'`,
        )
        .get();
      return row || null;
    },
  };
};

const stringify = data =>
  JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? Number(value) : value,
  );

/**
 *
 * @param {{env: typeof process.env}} options
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
  loggerProvider.addLogRecordProcessor(
    new SimpleLogRecordProcessor(new OTLPLogExporter({ keepAlive: true })),
  );

  logs.setGlobalLoggerProvider(loggerProvider);
  const logger = logs.getLogger('default');

  const db = await getDatabaseInstance();

  /** @type Array<Context | null> */
  let [blockContext, crankContext, initContext, replayContext, triggerContext] =
    [null, null, null, null, null];

  /**
   * @param {Slog} slog
   */
  const slogSender = async ({ monotime, time: timestamp, ...body }) => {
    await Promise.resolve();

    let [afterProcessed, beforeProcessed] = [true, true];

    /** @type ReportedSlog */
    const extractedFields = { 'process.uptime': monotime, timestamp };
    const finalBody = { ...body };

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
      // eslint-disable-next-line no-restricted-syntax
      case SLOG_TYPES.RUN.START: {
        if (!(triggerContext || finalBody.runNum === 0)) {
          const blockTime = finalBody.blockTime || blockContext?.['block.time'];

          assert(blockTime);
          // TBD: add explicit slog events of both timer poll and install bundle
          triggerContext = {
            'run.id': `timer-${finalBody.blockHeight}`,
            'run.trigger.time': blockTime,
            'run.trigger.type': 'timer',
          };
          db.persistContext(triggerContext);
        }

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
        const triggerType = body.type.split('-')[2];

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
        db.persistContext(triggerContext);
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

    const finalSlog = {
      ...blockContext,
      ...crankContext,
      ...extractedFields,
      ...finalBody,
      ...initContext,
      ...replayContext,
      ...triggerContext,
    };

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
        triggerContext = db.restoreContext();
        break;
      }
      default:
        afterProcessed = false;
    }

    if (afterProcessed || beforeProcessed)
      logger.emit({
        body: JSON.parse(stringify(finalSlog)),
        severityNumber: SeverityNumber.INFO,
      });
    else console.log(`Unexpected slog type: ${body.type}`);
  };

  return slogSender;
};
