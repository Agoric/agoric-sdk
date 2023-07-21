import { createLogger, format, transports } from 'winston';

/** @param {import('./index.js').MakeSlogSenderOptions} opts */
export const makeSlogSender = async ({
  env: { DATADOG_LOG_FILE } = {},
} = {}) => {
  if (!DATADOG_LOG_FILE) {
    return undefined;
  }

  const logger = createLogger({
    exitOnError: false,
    format: format.logstash(),
    transports: [
      new transports.File({
        filename: DATADOG_LOG_FILE,
        maxsize: 104857600, // 100MB
        maxFiles: 10,
        tailable: true,
      }),
    ],
  });

  if (!logger) {
    return undefined;
  }

  const slogSender = slogObj => {
    logger.info(slogObj);
  };

  return Object.assign(slogSender, {
    forceFlush: async () => {},
    shutdown: async () => logger.close(),
    usesJsonObject: true,
  });
};
