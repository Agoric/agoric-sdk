/* eslint-env node */
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  LoggerProvider,
  SimpleLogRecordProcessor,
} from '@opentelemetry/sdk-logs';
import { readFileSync, writeFileSync } from 'fs';
import { logCreator } from './context-aware-slog.js';
import { getResourceAttributes } from './index.js';
import { serializeSlogObj } from './serialize-slog-obj.js';

/**
 * @typedef {import('./index.js').MakeSlogSenderOptions} Options
 */

const DEFAULT_CONTEXT_FILE = 'slog-context.json';
const FILE_ENCODING = 'utf8';

/**
 * @param {string} filePath
 */
export const getContextFilePersistenceUtils = filePath => {
  console.log(`Using file ${filePath} for slogger context`);

  return {
    /**
     * @param {import('./context-aware-slog.js').Context} context
     */
    persistContext: context => {
      try {
        writeFileSync(filePath, serializeSlogObj(context), FILE_ENCODING);
      } catch (err) {
        console.warn('Error writing context to file: ', err);
      }
    },

    /**
     * @returns {import('./context-aware-slog.js').Context | null}
     */
    restoreContext: () => {
      try {
        return JSON.parse(readFileSync(filePath, FILE_ENCODING));
      } catch (parseErr) {
        console.warn('Error reading context from file: ', parseErr);
        return null;
      }
    },
  };
};

/**
 * @param {Options} options
 */
export const makeSlogSender = async options => {
  const { OTEL_EXPORTER_OTLP_ENDPOINT } = options.env || {};
  if (!(OTEL_EXPORTER_OTLP_ENDPOINT && options.stateDir))
    return console.warn(
      'Ignoring invocation of slogger "context-aware-slog" without the presence of "OTEL_EXPORTER_OTLP_ENDPOINT" and "stateDir"',
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

  const persistenceUtils = getContextFilePersistenceUtils(
    process.env.SLOG_CONTEXT_FILE_PATH ||
      `${options.stateDir}/${DEFAULT_CONTEXT_FILE}`,
  );

  const slogSender = logCreator(
    logRecord =>
      logger.emit({
        ...JSON.parse(serializeSlogObj(logRecord)),
        severityNumber: SeverityNumber.INFO,
      }),
    persistenceUtils,
  );

  return Object.assign(slogSender, {
    forceFlush: () => logRecordProcessor.forceFlush(),
    shutdown: () =>
      logRecordProcessor.forceFlush().then(logRecordProcessor.shutdown),
  });
};
