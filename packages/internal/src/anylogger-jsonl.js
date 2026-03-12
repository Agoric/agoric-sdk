/**
 * @file anylogger JSON Lines adapter, with cosmic-swingset DEBUG sensibilities.
 *
 * Use this module for cosmic-swingset/runtime logging, where output is consumed
 * as service logs rather than interactive CLI output.
 *
 * Runtime-focused behavior:
 * - Reads `DEBUG` selectors (`agoric`, `agoric:<level>`, `agoric:none`).
 * - Adds ISO timestamps and stable labels to emitted messages.
 * - Suppresses high-volume vat/liveslots logs unless explicitly selected.
 *
 * Why this file exists alongside `packages/agoric-cli/src/anylogger-agoric.js`:
 * - This adapter enforces production/runtime log policy.
 * - The CLI adapter is tuned for terminal UX (e.g., colored prefixes) and does
 *   not apply cosmic-swingset suppression semantics.
 */
/* eslint-env node */
import os from 'os';
import util from 'util';

import {
  getEnvironmentOptionsList,
  getEnvironmentOption,
} from '@endo/env-options';
import { originalConsole } from './node/patch-console.js';

import anylogger from '../vendor/anylogger.js';
import { defineName } from './js-utils.js';

/** @import {BaseLevels} from '../vendor/anylogger.js'; */
/** @typedef {keyof BaseLevels} LogLevel; */

const VAT_LOGGER_PREFIXES = Object.freeze([
  'SwingSet:vat',
  'SwingSet:ls', // "ls" for "liveslots"
]);

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
const DEBUG = getEnvironmentOption('DEBUG', 'unset');
/** @type {string | undefined} */
let maxActiveLevel = DEBUG_LIST.length || DEBUG === 'unset' ? 'log' : 'info';
for (const selector of DEBUG_LIST) {
  const fullSelector = selector === 'agoric' ? 'agoric:debug' : selector;
  const [_, detail] = fullSelector.match(/^agoric:(.*)/s) || [];
  if (detail) {
    maxActiveLevel = detail;
  }
}
const maxActiveLevelCode = anylogger.levels[maxActiveLevel] ?? -Infinity;

const pinoLevels = {
  fatal: 60, // Critical system failures
  error: 50, // Application errors
  warn: 40, // Warnings that require attention
  info: 30, // General application logs
  debug: 20, // Debugging information
  trace: 10, // Detailed execution tracing
};

const console = originalConsole;
const fallbackSink = console.log.bind(console);
const hostname = os.hostname();
const pid = process.pid;

const oldExt = anylogger.ext;
anylogger.ext = (logger, opts = {}) => {
  const { context = {} } = opts || {};
  const extended = oldExt(logger);

  /** @type {(level: LogLevel) => boolean} */
  const enabledFor = level =>
    level !== undefined && anylogger.levels[level] <= maxActiveLevelCode;
  extended.enabledFor = enabledFor;

  const nameColon = `${extended.name}:`;

  // Vat logs are suppressed unless matched by a prefix in DEBUG_LIST.
  const suppressed =
    VAT_LOGGER_PREFIXES.some(prefix => nameColon.startsWith(`${prefix}:`)) &&
    !DEBUG_LIST.some(prefix => nameColon.startsWith(`${prefix}:`));
  const label = extended.name;

  const { ...safeContext } = context;
  for (const key of ['level', 'time', 'pid', 'hostname', 'label']) {
    if (key in safeContext) {
      console.warn(
        `Logger ${extended.name} context key "${key}" is reserved and will be ignored.`,
      );
      delete safeContext[key];
    }
  }

  const levels = /** @type {LogLevel[]} */ (Object.keys(anylogger.levels));
  for (const level of levels) {
    const println =
      (typeof console[level] === 'function' && console[level].bind(console)) ||
      fallbackSink;
    const disabled = suppressed || !enabledFor(level);
    const pinoCode = pinoLevels[level] ?? pinoLevels.info;

    extended[level] = disabled
      ? defineName(`dummy ${level}`, () => {})
      : defineName(level, (...args) => {
          // Attach a timestamp and other stuff.
          const time = Date.now();
          const msg = args
            .map(arg => {
              if (typeof arg === 'string') {
                return arg;
              }
              try {
                return util.inspect(arg, { depth: 5 });
              } catch (err) {
                try {
                  return `<Error: ${String(err)}>`;
                } catch {
                  return '<Error: unknown>';
                }
              }
            })
            .join(' ');
          const obj = {
            level: pinoCode,
            time,
            pid,
            hostname,
            label,
            ...safeContext,
            msg,
          };
          // println(args);
          println(JSON.stringify(obj));
        });
  }
  return extended;
};

export default anylogger;
