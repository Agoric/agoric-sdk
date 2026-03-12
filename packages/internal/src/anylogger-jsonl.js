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

import { originalConsole } from './node/patch-console.js';

import anylogger from '../vendor/anylogger.js';
import { parseDebugEnv } from './debug-env.js';
import { defineName } from './js-utils.js';

/** @import {BaseLevels} from '../vendor/anylogger.js'; */
/** @typedef {keyof BaseLevels} LogLevel; */

const { enabledFor, isSuppressedLogger } = parseDebugEnv(anylogger.levels);

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

  extended.enabledFor = enabledFor;

  const suppressed = isSuppressedLogger(extended.name);
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
