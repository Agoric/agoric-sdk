import { createLogger, format, transports } from 'winston';

export const ddlogger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [
    new transports.File({ filename: `/Users/touseefliaqat/datadog.log` }),
  ],
});
