/* eslint-env node */
import {
  getEnvironmentOptionsList,
  getEnvironmentOption,
} from '@endo/env-options';
import anylogger from 'anylogger';
import { defineName } from '@agoric/internal/src/js-utils.js';
import util from 'util';

/** @import {BaseLevels} from 'anylogger'; */
/** @typedef {keyof BaseLevels} LogLevel; */

const VAT_LOGGER_PREFIXES = Object.freeze([
  'SwingSet:vat',
  'SwingSet:ls', // "ls" for "liveslots"
]);

//#region Golang zerolog-like output affordances

let shortDateTimeFormatter;
const plainTime = d => {
  if (!shortDateTimeFormatter) {
    shortDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
      timeStyle: 'short',
    });
  }
  const shortTime = shortDateTimeFormatter.format(d).replace(/(\d) /, '$1');
  return shortTime;
};

const levelToPlainLevel = {
  error: 'ERR',
  warn: 'WRN',
  info: 'INF',
  log: 'LOG',
  debug: 'DBG',
};

/**
 * @param {Date} d
 * @returns {string}
 */
const dateToNumericOffsetString = d => {
  // TODO: Use Temporal.ZonedDateTime
  // `toString({ fractionalSecondDigits: 0 })`.`
  const pad2 = n => (n < 10 ? `0${n}` : `${n}`);
  const utcOffsetMinutes = -d.getTimezoneOffset();
  const utcOffsetAbsMinutes = Math.abs(utcOffsetMinutes);
  const utcOffsetString = `${utcOffsetMinutes < 0 ? '-' : '+'}${pad2(Math.floor(utcOffsetAbsMinutes / 60))}:${pad2(utcOffsetAbsMinutes % 60)}`;
  const utcDateWithSameLocalTime = new Date(
    d.getTime() + utcOffsetMinutes * 60e3,
  );
  return utcDateWithSameLocalTime
    .toISOString()
    .replace(/[.][0-9]+Z$/, utcOffsetString);
};

/**
 * @type {Record<string,
 *   (opts: { now: Date, label: string, level: LogLevel, args: any[] }) => any[]
 * >}
 */
const logFormatterForLogFormat = {
  legacy: ({ now, label, args }) => {
    const timestamp = now.toISOString();
    return [`${timestamp} ${label}:`, ...args];
  },
  plain: ({ now, label, level, args }) => {
    const timestamp = plainTime(now);
    const plainLevel = levelToPlainLevel[level];
    return [`${timestamp} ${plainLevel} ${label}:`, ...args];
  },
  json: ({ now, label, level, args }) => {
    const message = [`${label}:`, ...args]
      .map(a => (typeof a === 'string' ? a : util.inspect(a)))
      .join(' ');
    return [
      JSON.stringify({
        level,
        time: dateToNumericOffsetString(now),
        message,
      }),
    ];
  },
};

/** @type {string} */
let logFormat;
/** @type {typeof logFormatterForLogFormat[string]} */
let logFormatter;

/** @param {string} format */
export const setLogFormat = format => {
  logFormat = format;
  logFormatter =
    logFormatterForLogFormat[logFormat] || logFormatterForLogFormat.plain;
};
setLogFormat('plain'); // default

//#endregion

// Turn on debugging output with DEBUG=agoric or DEBUG=agoric:${level}
const DEBUG_LIST = getEnvironmentOptionsList('DEBUG');

/**
 * As documented in ../../../docs/env.md, the log level defaults to "log" when
 * environment variable DEBUG is non-empty or unset, and to the quieter "info"
 * when it is set to an empty string, but in either case is overridden if DEBUG
 * is a comma-separated list that contains "agoric:none" or "agoric:${level}" or
 * "agoric" (the last an alias for "agoric:debug").
 *
 * @type {string | undefined}
 */
let maxActiveLevel =
  DEBUG_LIST.length > 0 || getEnvironmentOption('DEBUG', 'unset') === 'unset'
    ? 'log'
    : 'info';
for (const selector of DEBUG_LIST) {
  const fullSelector = selector === 'agoric' ? 'agoric:debug' : selector;
  const [_, detail] = fullSelector.match(/^agoric:(.*)/gs) || [];
  if (detail) {
    maxActiveLevel = detail === 'none' ? undefined : detail;
  }
}
const maxActiveLevelCode = /** @type {number} */ (
  (maxActiveLevel && anylogger.levels[maxActiveLevel]) ?? -Infinity
);

const oldExt = anylogger.ext;
anylogger.ext = logger => {
  logger = oldExt(logger);

  /** @type {(level: LogLevel) => boolean} */
  const enabledFor = level => anylogger.levels[level] <= maxActiveLevelCode;
  logger.enabledFor = enabledFor;

  const nameColon = `${logger.name}:`;
  const label = logger.name.replaceAll(':', ': ');

  // Vat logs are suppressed unless matched by a prefix in DEBUG_LIST.
  const suppressed =
    VAT_LOGGER_PREFIXES.some(prefix => nameColon.startsWith(`${prefix}:`)) &&
    !DEBUG_LIST.some(prefix => nameColon.startsWith(`${prefix}:`));

  const levels = /** @type {LogLevel[]} */ (Object.keys(anylogger.levels));
  for (const level of levels) {
    const impl = logger[level];
    const disabled = !impl || suppressed || !enabledFor(level);
    logger[level] = disabled
      ? defineName(`dummy ${level}`, () => {})
      : defineName(level, (...args) => {
          // Format as requested.
          const formattedArgs = logFormatter({
            level,
            now: new Date(),
            label,
            args,
          });

          // Output with the underlying writer.
          impl(...formattedArgs);
        });
  }
  return logger;
};
